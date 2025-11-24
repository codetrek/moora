import { type Immutable } from 'mutative';
import { createSignalQueue } from './signal-queue';
import { createEventEmitter } from './event-emitter';
import type {
  MoorexDefinition,
  Moorex,
  MoorexEvent,
} from './types';

/**
 * 创建一个 Moorex 机器实例。
 *
 * Moorex 是一个通用的异步 Moore 机器，它：
 * 1. 跟踪状态，通过信号触发状态转换
 * 2. 根据当前状态计算应该运行的 effects
 * 3. 在状态改变时协调 effects（通知哪些应该取消，哪些应该启动）
 * 4. 提供事件订阅机制，监听状态和 effect 的变化
 *
 * Moorex 不再负责执行 effects，只负责根据 reconciliation 结果通知
 * effect-start 和 effect-canceled 事件。实际的 effect 执行由外部
 * 通过 createEffectRunner 来实现。
 *
 * 设计用于构建持久化的 AI agents，这些 agents 必须在崩溃、重启或迁移时存活，
 * 同时能够恢复未完成的工作。通过重新加载状态并运行 effect 协调，agent 可以
 * 从上次中断的地方继续。
 *
 * @example
 * ```typescript
 * const definition: MoorexDefinition<State, Signal, Effect> = {
 *   initiate: () => ({ count: 0 }),
 *   transition: (signal) => (state) => ({ ...state, count: state.count + 1 }),
 *   effectsAt: (state) => state.count > 0 ? { 'effect-1': effectData } : {},
 * };
 *
 * const moorex = createMoorex(definition);
 * 
 * // 使用 createEffectRunner 来执行 effects
 * const runEffect = (effect, state, key) => ({
 *   start: async (dispatch) => { 
 *     // 执行 effect 逻辑
 *     await doSomething();
 *     // 可以 dispatch 新的信号
 *     dispatch(someSignal);
 *   },
 *   cancel: () => { 
 *     // 取消 effect
 *   }
 * });
 * 
 * moorex.subscribe(createEffectRunner(runEffect));
 * moorex.dispatch({ type: 'increment' });
 * ```
 *
 * @template State - 机器的状态类型
 * @template Signal - 信号类型，用于触发状态转换
 * @template Effect - Effect 类型
 * @param definition - Moore 机器的定义配置
 * @returns Moorex 机器实例
 */
export const createMoorex = <State, Signal, Effect>(
  definition: MoorexDefinition<State, Signal, Effect>,
): Moorex<State, Signal, Effect> => {
  const activeEffects = new Map<string, Immutable<Effect>>();
  let state: Immutable<State> = definition.initiate();

  const { emit, subscribe } = createEventEmitter<
    MoorexEvent<State, Signal, Effect>,
    Moorex<State, Signal, Effect>
  >();

  const moorex: Moorex<State, Signal, Effect> = {
    dispatch: (signal: Immutable<Signal>) => schedule(signal),
    subscribe,
    getState: () => state,
  };

  const reconcileEffects = () => {
    const currentEffects = definition.effectsAt(state);

    // 取消不再需要的 effects
    for (const [key, effect] of [...activeEffects]) {
      if (!(key in currentEffects)) {
        activeEffects.delete(key);
        emit({ type: 'effect-canceled', effect, key }, moorex);
      }
    }

    // 启动新的 effects
    for (const [key, effect] of Object.entries(currentEffects)) {
      if (!activeEffects.has(key)) {
        activeEffects.set(key, effect);
        emit({ type: 'effect-started', effect, key }, moorex);
      }
    }
  };

  const { schedule } = createSignalQueue<Signal>((signals) => {
    // 使用 reduce 累积状态转换
    state = signals.reduce((currentState, signal) => {
      emit({ type: 'signal-received', signal }, moorex);
      return definition.transition(signal)(currentState);
    }, state);

    reconcileEffects();
    emit({ type: 'state-updated', state }, moorex);
  });

  // 延迟初始 reconciliation 到下一个微任务，确保订阅者有机会注册
  queueMicrotask(() => reconcileEffects());

  return moorex;
};

