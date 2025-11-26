import { type Immutable } from 'mutative';
import { createPubSub, createStreamFromPubSub } from './pubsub';
import type {
  Automata,
  EffectsAt,
  RunEffect,
  EffectController,
  EffectControllerStatus,
  EffectEvent,
} from './types';

/**
 * 运行中的 Effect
 */
type RunningEffect<Effect> = {
  key: string;
  effect: Immutable<Effect>;
  complete: Promise<void>;
  cancel: () => void;
};

/**
 * 创建一个 Effect Controller 实例。
 *
 * Effect Controller 负责：
 * 1. 监听状态变化，根据 effectsAt 计算应该运行的 effects
 * 2. 协调 effects 的生命周期（启动、取消）
 * 3. 管理运行状态（running、braking、stopped）
 *
 * @example
 * ```typescript
 * const automata = createAutomata(definition);
 *
 * const controller = createMooreEffectController({
 *   automata,
 *   effectsAt: (state) => state.count > 0 ? { 'effect-1': effectData } : {},
 *   runEffect: (effect, state, key) => ({
 *     start: async (dispatch) => {
 *       await doSomething();
 *       dispatch(someSignal);
 *     },
 *     cancel: () => {
 *       cleanup();
 *     }
 *   }),
 * });
 *
 * controller.start();
 * ```
 *
 * @template State - 机器的状态类型
 * @template Signal - 信号类型
 * @template Effect - Effect 类型
 * @param config - Effect Controller 配置
 * @returns Effect Controller 实例
 */
export const createMooreEffectController = <State, Signal, Effect>({
  automata,
  effectsAt,
  runEffect,
}: {
  automata: Automata<State, Signal>;
  effectsAt: EffectsAt<State, Effect>;
  runEffect: RunEffect<Effect, Signal>;
}): EffectController<Effect> => {
  let status: EffectControllerStatus = 'stopped';
  
  // 使用 pubsub 管理状态流和事件流
  const statusPubSub = createPubSub<EffectControllerStatus>();
  const effectEventPubSub = createPubSub<EffectEvent<Effect>>();

  const runningEffects = new Map<string, RunningEffect<Effect>>();
  let activeEffects: Record<string, Immutable<Effect>> = {};

  let unsubscribe: (() => void) | null = null;
  let isFirstState = true;

  // 更新状态并通知订阅者
  const setStatus = (newStatus: EffectControllerStatus) => {
    if (status === newStatus) return;
    status = newStatus;
    statusPubSub.pub(status);
  };

  // 发送 Effect 事件
  const emitEffectEvent = (event: EffectEvent<Effect>) =>
    effectEventPubSub.pub(event);

  // 启动一个 effect
  const startEffect = (
    effect: Immutable<Effect>,
    key: string,
    state: Immutable<State>,
  ) => {
    if (runningEffects.has(key)) return;

    try {
      const initializer = runEffect(effect, state, key);
      const entry: RunningEffect<Effect> = {
        key,
        effect,
        complete: Promise.resolve(),
        cancel: initializer.cancel,
      };
      runningEffects.set(key, entry);

      // 创建一个受保护的 dispatch
      const guardedDispatch = (signal: Immutable<Signal>) => {
        if (runningEffects.get(key) === entry) automata.dispatch(signal);
      };

      // 添加到 activeEffects
      activeEffects = { ...activeEffects, [key]: effect };

      const removeEffect = () => {
        if (runningEffects.get(key) === entry) {
          runningEffects.delete(key);
          const { [key]: _, ...rest } = activeEffects;
          activeEffects = rest;
        }
      };

      entry.complete = Promise.resolve(initializer.start(guardedDispatch))
        .then(removeEffect)
        .catch((error) => {
          removeEffect();
          console.error(`Effect ${key} failed:`, error);
        });
    } catch (error) {
      console.error(`Failed to start effect ${key}:`, error);
    }
  };

  // 取消一个 effect
  const cancelEffect = (key: string, _force: boolean) => {
    const entry = runningEffects.get(key);
    if (!entry) return;

    const effect = entry.effect;
    runningEffects.delete(key);
    const { [key]: _, ...rest } = activeEffects;
    activeEffects = rest;

    try {
      entry.cancel();
    } catch (error) {
      console.error(`Failed to cancel effect ${key}:`, error);
    }

    emitEffectEvent({ type: 'cancel', key, effect });
  };

  // 协调 effects
  const reconcileEffects = (state: Immutable<State>) => {
    if (status !== 'running') return;

    const currentEffects = effectsAt(state);

    // 取消不再需要的 effects
    for (const key of runningEffects.keys()) {
      if (!(key in currentEffects)) cancelEffect(key, false);
    }

    // 启动新的 effects
    for (const [key, effect] of Object.entries(currentEffects)) {
      if (!runningEffects.has(key)) {
        startEffect(effect, key, state);
        emitEffectEvent({ type: 'start', key, effect });
      }
    }
  };

  // 处理状态变化
  const handleStateChange = ({ signal, state: newState }: { signal: Immutable<Signal>; state: Immutable<State> }) => {
    if (status !== 'running') return;

    // 第一个状态变化（初始状态）需要延迟处理，给订阅者时间注册
    if (isFirstState) {
      isFirstState = false;
      queueMicrotask(() => {
        if (status === 'running') {
          reconcileEffects(newState);
        }
      });
    } else {
      reconcileEffects(newState);
    }
  };

  // 等待所有 running effects 完成
  const waitForEffectsToComplete = async () => {
    if (status === 'braking') {
      const promises = Array.from(runningEffects.values()).map(
        (entry) => entry.complete,
      );
      await Promise.allSettled(promises);
      setStatus('stopped');
    }
  };

  return {
    start() {
      if (status === "running") return;

      // 如果之前已经停止，需要重新订阅
      if (status === "stopped") {
        isFirstState = true;
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      }

      setStatus("running");
      
      // 订阅状态变化
      if (!unsubscribe) {
        unsubscribe = automata.subscribe(handleStateChange);
        
        // 处理初始状态（使用 queueMicrotask 确保在下一个微任务中处理）
        const initialState = automata.getState();
        queueMicrotask(() => {
          if (status === 'running') {
            reconcileEffects(initialState);
          }
        });
      }
    },

    stop(force: boolean) {
      if (status === "stopped") return;

      if (force) {
        // 强制停止：取消所有 running effects 并取消订阅
        for (const key of runningEffects.keys()) {
          cancelEffect(key, true);
        }
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        setStatus("stopped");
      } else {
        // 进入 braking 状态，取消订阅但等待 effects 自然完成
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        setStatus("braking");
        waitForEffectsToComplete();
      }
    },

    getStatus: () => status,
    getStatusStream: () => createStreamFromPubSub(statusPubSub, status),
    getEffects: () => ({ ...activeEffects }),
    getEffectEventStream: () => createStreamFromPubSub(effectEventPubSub),
  };
};

