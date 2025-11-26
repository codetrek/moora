import { type Immutable } from 'mutative';
import { createAutomata } from './create-automata';
import { createMooreEffectController } from './create-effect-controller';
import { createPubSub } from './pubsub';
import type {
  MoorexDefinition,
  Moorex,
  MoorexEvent,
  CancelFn,
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
  // 创建 automata 处理状态和信号
  const automata = createAutomata<State, Signal>({
    initialState: definition.initiate,
    transition: definition.transition,
  });

  // 创建事件发布订阅系统
  type EventPayload = {
    event: MoorexEvent<State, Signal, Effect>;
    moorex: Moorex<State, Signal, Effect>;
  };
  const eventPubSub = createPubSub<EventPayload>();

  // 创建 effect controller 处理 effects
  // 使用一个 dummy runEffect，它返回一个永远不会完成的 Promise
  // 这样 effect-controller 可以协调 effects，但不会真正执行它们
  const effectController = createMooreEffectController<State, Signal, Effect>({
    stateStream: automata.getStateStream(),
    effectsAt: definition.effectsAt,
    runEffect: (_effect, _state, _key) => {
      // 返回一个永远不会完成的 Promise，这样 effect 永远不会完成
      // 实际的 effect 执行由 createEffectRunner 处理
      return {
        start: async () => {
          await new Promise(() => {}); // 永远等待
        },
        cancel: () => {}, // 空实现
      };
    },
    dispatch: automata.dispatch.bind(automata),
  });

  const moorex: Moorex<State, Signal, Effect> = {
    dispatch: automata.dispatch.bind(automata),
    subscribe: (handler) =>
      eventPubSub.sub(({ event, moorex }) => handler(event, moorex)),
    getState: automata.getState.bind(automata),
  };

  // 启动异步流处理，确保能及时处理事件
  // 监听 automata 的更新流，转换为 signal-received 和 state-updated 事件
  (async () => {
    for await (const { signal, state } of automata.getUpdatesStream()) {
      eventPubSub.pub({ event: { type: 'signal-received', signal }, moorex });
      eventPubSub.pub({ event: { type: 'state-updated', state }, moorex });
    }
  })();

  // 监听 effect controller 的事件流，转换为 effect-started 和 effect-canceled 事件
  (async () => {
    for await (const effectEvent of effectController.getEffectEventStream()) {
      if (effectEvent.type === 'start') {
        eventPubSub.pub({
          event: {
            type: 'effect-started',
            effect: effectEvent.effect,
            key: effectEvent.key,
          },
          moorex,
        });
      } else {
        // effectEvent.type === 'cancel'
        eventPubSub.pub({
          event: {
            type: 'effect-canceled',
            effect: effectEvent.effect,
            key: effectEvent.key,
          },
          moorex,
        });
      }
    }
  })();

  // 启动 effect controller（但不执行 effects，只是协调）
  effectController.start();

  // 延迟初始 reconciliation 到下一个微任务，确保订阅者有机会注册
  // 同时确保异步流处理已经启动
  queueMicrotask(() => {
    // 直接使用 automata 的初始状态触发初始 reconciliation
    const initialState = automata.getState();
    const controllerWithTrigger = effectController as EffectController<Effect> & {
      _triggerReconciliation?: (state: Immutable<State>) => void;
    };
    controllerWithTrigger._triggerReconciliation?.(initialState);
  });

  return moorex;
};

