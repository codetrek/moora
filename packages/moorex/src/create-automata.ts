import { type Immutable } from 'mutative';
import { createSignalQueue } from './signal-queue';
import { createPubSub } from './pubsub';
import type { AutomataDefinition, Automata } from './types';

/**
 * 创建一个 Automata 实例。
 *
 * Automata 是一个状态机，它：
 * 1. 跟踪状态，通过信号触发状态转换
 * 2. 提供订阅功能，用于外部监听信号导致的状态变化
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
 * // 订阅状态变化
 * const unsubscribe = automata.subscribe(({ signal, state }) => {
 *   console.log('Signal:', signal, 'State:', state);
 * });
 *
 * automata.dispatch({ type: 'increment' });
 *
 * // 取消订阅
 * unsubscribe();
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

  // 使用 pubsub 管理订阅者
  const updatesPubSub = createPubSub<{ signal: Immutable<Signal>; state: Immutable<State> }>();

  const { schedule } = createSignalQueue<Signal>((signals) => {
    // 使用 reduce 累积状态转换
    signals.forEach((signal) => {
      state = definition.transition(signal)(state);

      // 通知订阅者
      updatesPubSub.pub({ signal, state });
    });
  });

  const automata: Automata<State, Signal> = {
    dispatch: (signal: Immutable<Signal>) => schedule(signal),
    subscribe: (handler) => {
      return updatesPubSub.sub((update) => {
        handler(update);
      });
    },
    getState: () => state,
  };

  return automata;
};

