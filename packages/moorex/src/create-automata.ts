import { type Immutable } from 'mutative';
import { createSignalQueue } from './signal-queue';
import { createPubSub, createStreamFromPubSub } from './pubsub';
import type { AutomataDefinition, Automata } from './types';

/**
 * 创建一个 Automata 实例。
 *
 * Automata 是一个状态机，它：
 * 1. 跟踪状态，通过信号触发状态转换
 * 2. 提供状态流和更新流，用于外部监听状态变化
 *
 * 与 Moorex 不同，Automata 不处理 effects，只负责状态管理。
 * Effects 的管理由 EffectController 单独处理。
 *
 * @example
 * ```typescript
 * const definition: AutomataDefinition<State, Signal> = {
 *   initialState: () => ({ count: 0 }),
 *   transition: (signal) => (state) => ({ ...state, count: state.count + 1 }),
 * };
 *
 * const automata = createAutomata(definition);
 *
 * // 获取状态流
 * const stateStream = automata.getStateStream();
 * for await (const state of stateStream) {
 *   console.log('State:', state);
 * }
 *
 * // 获取更新流
 * const updatesStream = automata.getUpdatesStream();
 * for await (const update of updatesStream) {
 *   console.log('Signal:', update.signal, 'State:', update.state);
 * }
 *
 * automata.dispatch({ type: 'increment' });
 * ```
 *
 * @template State - 机器的状态类型
 * @template Signal - 信号类型，用于触发状态转换
 * @param definition - Automata 的定义配置
 * @returns Automata 实例
 */
export const createAutomata = <State, Signal>(
  definition: AutomataDefinition<State, Signal>,
): Automata<State, Signal> => {
  let state: Immutable<State> = definition.initialState();

  // 使用 pubsub 管理状态流和更新流
  const statePubSub = createPubSub<Immutable<State>>();
  const updatesPubSub = createPubSub<{
    signal: Immutable<Signal>;
    state: Immutable<State>;
  }>();

  // 创建状态流生成器
  const createStateStream = (): AsyncGenerator<Immutable<State>> => {
    return createStreamFromPubSub(statePubSub, state);
  };

  // 创建更新流生成器
  const createUpdatesStream = (): AsyncGenerator<{
    signal: Immutable<Signal>;
    state: Immutable<State>;
  }> => {
    return createStreamFromPubSub(updatesPubSub);
  };

  const { schedule } = createSignalQueue<Signal>((signals) => {
    // 使用 reduce 累积状态转换
    signals.forEach((signal) => {
      state = definition.transition(signal)(state);

      // 通知状态流订阅者
      statePubSub.pub(state);

      // 通知更新流订阅者
      updatesPubSub.pub({ signal, state });
    });
  });

  const automata: Automata<State, Signal> = {
    dispatch: (signal: Immutable<Signal>) => schedule(signal),
    getStateStream: createStateStream,
    getUpdatesStream: createUpdatesStream,
    getState: () => state,
  };

  return automata;
};

