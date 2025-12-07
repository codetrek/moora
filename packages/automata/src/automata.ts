import type {
  PubSub,
  Dispatch,
  OutputHandler,
  SubscribeOutput,
  StatefulTransferer,
  StateMachine,
  AutomataOutputFn,
  MealyMachine,
  MooreMachine,
  UpdatePack,
} from './types';
import { createPubSub } from './pub-sub';

/**
 * 创建通用自动机
 *
 * 这是一个通用的自动机实现，支持自定义输出函数。
 * 输出函数接收状态转换的完整信息（前一个状态、输入、新状态）。
 * 如果输出函数返回 `null`，则忽略此次输出。
 *
 * **订阅设计**：
 * subscribe 的 handler 是一个简单的回调函数 `(output) => void`。
 * 如果需要 dispatch 新的输入，应该使用 automata 对象的 dispatch 方法。
 *
 * **初始状态输出**：
 * 在订阅时，会立即使用初始状态调用输出函数。
 * 如果输出函数返回非 `null` 值，则会发布初始输出。
 * 这允许在订阅时立即收到当前状态的输出（类似 Moore 机的行为）。
 *
 * @template Input - 输入信号类型
 * @template Output - 输出类型
 * @template State - 状态类型
 * @param automata - 自动机定义（初始状态和转换函数）
 * @param outputFn - 输出函数，根据状态转换信息计算输出，返回 `null` 则忽略此次输出
 * @returns 有状态的自动机实例，提供 dispatch、subscribe 和 current 方法
 *
 * @example
 * ```typescript
 * const sm = automata(
 *   { initial: () => 0, transition: (n) => (s) => s + n },
 *   ({ prev, state }) => {
 *     if (prev === null) {
 *       return { output: { initial: true, value: state } };
 *     }
 *     return { output: { from: prev.state, to: state, input: prev.input } };
 *   }
 * );
 *
 * // 订阅时，handler 接收 output
 * sm.subscribe((output) => {
 *   console.log('收到输出:', output);
 *   // 如果需要 dispatch，使用 sm.dispatch
 *   sm.dispatch(1);
 * });
 * ```
 */
export function automata<Input, Output, State>(
  { initial, transition }: StateMachine<Input, State>,
  outputFn: AutomataOutputFn<Input, Output, State>
): StatefulTransferer<Input, Output, State> {
  let state = initial();
  const pubsub = createPubSub<Output>();
  
  // 发布输出的辅助函数
  const publishOutput = (update: UpdatePack<Input, State>) => {
    const result = outputFn(update);
    if (result !== null) {
      pubsub.pub(result.output);
    }
  };

  const dispatch: Dispatch<Input> = (input) =>
    queueMicrotask(() => {
      const prev = { state, input };
      state = transition(input)(state);
      publishOutput({ prev, state });
    });
  
  const subscribe: SubscribeOutput<Output> = (handler: OutputHandler<Output>) => {
    const unsub = pubsub.sub(handler);
    // 订阅时立即发送初始输出给当前订阅者（如果存在）
    const initialResult = outputFn({ prev: null, state });
    if (initialResult !== null) handler(initialResult.output);
    return unsub;
  };
  
  const current = () => state;
  return { dispatch, subscribe, current };
};

/**
 * 创建 Mealy 机
 *
 * Mealy 机的输出依赖于新状态和输入。
 * 输出函数接收新状态和输入，计算并返回输出。
 * 初始状态时不会产生输出（因为此时没有输入）。
 *
 * @template Input - 输入信号类型
 * @template Output - 输出类型
 * @template State - 状态类型
 * @param mealyMachine - Mealy 机定义
 * @returns 有状态的 Mealy 机实例，提供 dispatch、subscribe 和 current 方法
 *
 * @example
 * ```typescript
 * const mealyMachine = mealy({
 *   initial: () => 'idle',
 *   transition: (input) => (state) => input === 'start' ? 'running' : state,
 *   output: ({ state, input }) => `${state}:${input}`,
 * });
 *
 * mealyMachine.subscribe((output) => {
 *   console.log('Output:', output);
 * });
 * ```
 */
export function mealy<Input, Output, State>({
  initial,
  transition,
  output,
}: MealyMachine<Input, Output, State>): StatefulTransferer<Input, Output, State> {
  return automata({ initial, transition }, ({ prev, state }) => {
    // Mealy 机的输出依赖于新状态和输入
    // prev 包含前一个状态和输入，我们需要使用新状态和输入
    return prev ? { output: output({ state, input: prev.input }) } : null;
  });
};

/**
 * 创建 Moore 机
 *
 * Moore 机的输出仅依赖于当前状态，不依赖于输入。
 * 由于 `automata` 函数已经支持初始状态输出，Moore 机可以直接使用该功能。
 *
 * @template Input - 输入信号类型
 * @template Output - 输出类型
 * @template State - 状态类型
 * @param mooreMachine - Moore 机定义
 * @returns 有状态的 Moore 机实例，提供 dispatch、subscribe 和 current 方法
 *
 * @example
 * ```typescript
 * const mooreMachine = moore({
 *   initial: () => 0,
 *   transition: (n) => (s) => s + n,
 *   output: (state) => ({ value: state, doubled: state * 2 }),
 * });
 *
 * mooreMachine.subscribe((output) => {
 *   console.log('Output:', output);
 *   // 如果需要 dispatch，使用 mooreMachine.dispatch
 * });
 * ```
 */
export function moore<Input, Output, State>({
  initial,
  transition,
  output,
}: MooreMachine<Input, Output, State>): StatefulTransferer<Input, Output, State> {
  return automata({ initial, transition }, ({ state }) => ({ output: output(state) }));
};
