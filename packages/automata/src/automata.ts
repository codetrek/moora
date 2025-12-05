import type {
  PubSub,
  Dispatch,
  OutputHandler,
  Subscribe,
  StatefulTransferer,
  Automata,
  MealyMachine,
  MooreMachine,
  UpdatePack,
} from './types';
import { createPubSub } from './pub-sub';

/**
 * 运行输出处理器（两阶段副作用设计）
 *
 * 状态机的 handler 采用两阶段副作用设计：
 * 1. **第一阶段（同步）**：当有 output 时，立即同步执行 handler(output)，返回一个异步副作用（Procedure）
 * 2. **第二阶段（异步）**：通过 queueMicrotask 延迟执行这个异步副作用，它接收一个 dispatch 方法，
 *    可以异步地继续产生新的 input 给到 state machine
 *
 * 这种设计确保了：
 * - handler 的同步部分可以立即处理 output（例如记录日志、更新 UI）
 * - 异步副作用在微任务队列中执行，不会阻塞当前执行栈
 * - 异步副作用可以通过 dispatch 产生新的输入，形成反馈循环
 *
 * @internal
 * @template Input - 输入类型
 * @template Output - 输出类型
 * @param handler - 输出处理器，接收 output 并返回一个 Procedure 函数
 * @param dispatch - 分发函数，用于在异步副作用中产生新的输入
 * @returns 一个函数，接收输出并执行两阶段副作用处理
 */
const runHandler = <Input, Output>(
  handler: OutputHandler<Input, Output>,
  dispatch: Dispatch<Input>
) => (output: Output) => {
  // 第一阶段：同步执行 handler，获取异步副作用（Procedure）
  const proc = handler(output);
  // 第二阶段：通过 queueMicrotask 延迟执行异步副作用
  // Procedure 接收 dispatch 方法，可以异步产生新的 input
  queueMicrotask(() => proc(dispatch));
};

/**
 * 为 PubSub 创建订阅适配器
 * 将 PubSub 的简单订阅转换为支持 OutputHandler 的订阅
 * @internal
 * @template Input - 输入类型
 * @template Output - 输出类型
 * @param pubsub - PubSub 实例
 * @param dispatch - 分发函数
 * @returns 订阅函数
 */
const subscribePubSub = <Input, Output>(
  pubsub: PubSub<Output>,
  dispatch: Dispatch<Input>
): Subscribe<Input, Output> => {
  return (handler: OutputHandler<Input, Output>) => {
    return pubsub.sub(runHandler(handler, dispatch));
  };
};

/**
 * 创建通用自动机
 *
 * 这是一个通用的自动机实现，支持自定义输出函数。
 * 输出函数接收状态转换的完整信息（前一个状态、输入、新状态）。
 *
 * **两阶段副作用设计**：
 * 订阅的 handler 采用两阶段副作用设计：
 * - 第一阶段（同步）：handler(output) 立即同步执行，返回一个 Procedure 函数
 * - 第二阶段（异步）：Procedure 函数通过 queueMicrotask 延迟执行，接收 dispatch 方法
 *
 * 这种设计允许 handler 的同步部分立即处理 output，而异步副作用可以在微任务中执行，
 * 并通过 dispatch 产生新的输入，形成反馈循环。
 *
 * @template Input - 输入信号类型
 * @template Output - 输出类型
 * @template State - 状态类型
 * @param automata - 自动机定义（初始状态和转换函数）
 * @param output - 输出函数，根据状态转换信息计算输出
 * @returns 有状态的自动机实例，提供 dispatch、subscribe 和 current 方法
 *
 * @example
 * ```typescript
 * const sm = machine(
 *   { initial: () => 0, transition: (n) => (s) => s + n },
 *   ({ statePrev, input, state }) => ({ from: statePrev, to: state, input })
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
export function machine<Input, Output, State>(
  { initial, transition }: Automata<Input, State>,
  output: (update: UpdatePack<Input, State>) => Output
): StatefulTransferer<Input, Output, State> {
  let state = initial();
  const pubsub = createPubSub<Output>();
  const dispatch = (input: Input) => {
    const statePrev = state;
    state = transition(input)(state);
    pubsub.pub(output({ statePrev, input, state }));
  };
  const subscribe = subscribePubSub(pubsub, dispatch);
  const current = () => state;
  return { dispatch, subscribe, current };
};

/**
 * 创建 Mealy 机
 *
 * Mealy 机的输出依赖于输入和当前状态。
 * 输出函数接收完整的状态转换信息（前一个状态、输入、新状态）。
 *
 * **两阶段副作用设计**：订阅的 handler 采用两阶段副作用设计，详见 `machine` 函数的文档。
 *
 * @template Input - 输入信号类型
 * @template Output - 输出类型
 * @template State - 状态类型
 * @param mealyMachine - Mealy 机定义
 * @returns 有状态的 Mealy 机实例，提供 dispatch、subscribe 和 current 方法
 *
 * @example
 * ```typescript
 * const mealy = mealy({
 *   initial: () => 'idle',
 *   transition: (input) => (state) => input === 'start' ? 'running' : state,
 *   output: ({ input, state }) => `${state}:${input}`,
 * });
 * ```
 */
export function mealy<Input, Output, State>({
  initial,
  transition,
  output,
}: MealyMachine<Input, Output, State>): StatefulTransferer<Input, Output, State> {
  return machine({ initial, transition }, output);
};

/**
 * 创建 Moore 机
 *
 * Moore 机的输出仅依赖于当前状态，不依赖于输入。
 * 订阅时会立即使用当前状态计算并发送初始输出。
 *
 * **两阶段副作用设计**：
 * 订阅的 handler 采用两阶段副作用设计：
 * - 第一阶段（同步）：订阅时立即同步执行 handler(output)，返回一个 Procedure 函数
 * - 第二阶段（异步）：Procedure 函数通过 queueMicrotask 延迟执行，接收 dispatch 方法
 *
 * 这种设计确保了订阅时能立即收到当前状态的输出，同时保持与 `machine` 和 `mealy` 函数的一致性。
 *
 * @template Input - 输入信号类型
 * @template Output - 输出类型
 * @template State - 状态类型
 * @param mooreMachine - Moore 机定义
 * @returns 有状态的 Moore 机实例，提供 dispatch、subscribe 和 current 方法
 *
 * @example
 * ```typescript
 * const moore = moore({
 *   initial: () => 0,
 *   transition: (n) => (s) => s + n,
 *   output: (state) => ({ value: state, doubled: state * 2 }),
 * });
 *
 * // 订阅时，handler 立即同步执行（第一阶段），返回的 Procedure 异步执行（第二阶段）
 * moore.subscribe((output) => (dispatch) => {
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
  const {
    dispatch,
    subscribe: sub,
    current,
  } = machine({ initial, transition }, ({ state }) => output(state));

  // Moore 机的订阅会立即发送当前状态的输出
  // 采用两阶段副作用设计：
  // 1. 第一阶段（同步）：立即执行 handler(out)，获取 Procedure
  // 2. 第二阶段（异步）：通过 queueMicrotask 延迟执行 Procedure
  const subscribe: Subscribe<Input, Output> = (handler) => {
    const unsub = sub(handler);
    // 订阅时立即使用当前状态计算输出
    const state = current();
    const out = output(state);
    // 第一阶段：同步执行 handler，获取异步副作用（Procedure）
    const proc = handler(out);
    // 第二阶段：通过 queueMicrotask 延迟执行异步副作用
    // Procedure 接收 dispatch 方法，可以异步产生新的 input
    queueMicrotask(() => proc(dispatch));
    return unsub;
  };
  return { dispatch, subscribe, current };
};
