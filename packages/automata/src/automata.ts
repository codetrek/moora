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
import { runEffect } from '@moora/effects';

/**
 * 运行输出处理器（两阶段副作用设计）
 *
 * 状态机的 handler 采用两阶段副作用设计：
 * 1. **第一阶段（同步）**：当有 output 时，立即同步执行 handler(output)，返回一个 Effect
 * 2. **第二阶段（异步）**：通过 runEffect 执行 Effect 的两阶段副作用
 *
 * 这种设计确保了：
 * - handler 的同步部分可以立即处理 output（例如记录日志、更新 UI）
 * - 异步副作用在微任务队列中执行，不会阻塞当前执行栈
 * - 异步副作用可以通过 dispatch 产生新的输入，形成反馈循环
 *
 * @internal
 * @template Input - 输入类型
 * @template Output - 输出类型
 * @param handler - 输出处理器，接收 output 并返回一个 Effect 函数
 * @param dispatch - 分发函数，用于在异步副作用中产生新的输入
 * @returns 一个函数，接收输出并执行两阶段副作用处理
 */
const runHandler = <Input, Output>(
  handler: OutputHandler<Input, Output>,
  dispatch: Dispatch<Input>
) => (output: Output) => {
  const effect = handler(output);
  runEffect(effect, dispatch);
};

/**
 * 创建通用自动机
 *
 * 这是一个通用的自动机实现，支持自定义输出函数。
 * 输出函数接收状态转换的完整信息（前一个状态、输入、新状态）。
 * 如果输出函数返回 `null`，则忽略此次输出。
 *
 * **两阶段副作用设计**：
 * 订阅的 handler 采用两阶段副作用设计：
 * - 第一阶段（同步）：handler(output) 立即同步执行，返回一个 Procedure 函数
 * - 第二阶段（异步）：Procedure 函数通过 queueMicrotask 延迟执行，接收 dispatch 方法
 *
 * 这种设计允许 handler 的同步部分立即处理 output，而异步副作用可以在微任务中执行，
 * 并通过 dispatch 产生新的输入，形成反馈循环。
 *
 * **初始状态输出**：
 * 在创建自动机时，会立即使用初始状态调用输出函数。
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
 *       // 初始状态输出
 *       return { output: { initial: true, value: state } };
 *     }
 *     return { output: { from: prev.state, to: state, input: prev.input } };
 *   }
 * );
 *
 * // 订阅时，handler 立即同步执行，返回的 Procedure 异步执行
 * sm.subscribe((output) => (dispatch) => {
 *   console.log('同步处理:', output); // 立即执行
 *   // 异步副作用在微任务中执行
 *   setTimeout(() => dispatch(1), 100);
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
  
  const dispatch = (input: Input) => {
    const prev = { state, input };
    state = transition(input)(state);
    publishOutput({ prev, state });
  };
  
  const subscribe: SubscribeOutput<Input, Output> = (handler: OutputHandler<Input, Output>) => {
    const unsub = pubsub.sub(runHandler(handler, dispatch));
    // 订阅时立即发送初始输出给当前订阅者（如果存在）
    const initialResult = outputFn({ prev: null, state });
    if (initialResult !== null) {
      runHandler(handler, dispatch)(initialResult.output);
    }
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
 * **两阶段副作用设计**：订阅的 handler 采用两阶段副作用设计，详见 `automata` 函数的文档。
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
 * **两阶段副作用设计**：订阅的 handler 采用两阶段副作用设计，详见 `automata` 函数的文档。
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
 * // 订阅时，handler 立即同步执行（第一阶段），返回的 Procedure 异步执行（第二阶段）
 * mooreMachine.subscribe((output) => (dispatch) => {
 *   console.log('同步处理:', output); // 立即执行
 *   // 异步副作用在微任务中执行
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
