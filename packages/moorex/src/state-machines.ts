import type {
  PubSub,
  Dispatch,
  OutputHandler,
  Subscribe,
  StatefulTransferer,
  StateMachine,
  MealyMachine,
  MooreMachine,
  UpdatePack,
} from './types';
import { createPubSub } from './pub-sub';

/**
 * 运行输出处理器
 * 将输出转换为过程函数，并在微任务队列中执行
 * @internal
 * @template Input - 输入类型
 * @template Output - 输出类型
 * @param handler - 输出处理器
 * @param dispatch - 分发函数
 * @returns 一个函数，接收输出并异步执行处理过程
 */
const runHandler = <Input, Output>(
  handler: OutputHandler<Input, Output>,
  dispatch: Dispatch<Input>
) => (output: Output) => {
  const proc = handler(output);
  // 使用 queueMicrotask 确保过程函数在下一个微任务中执行
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
 * 创建通用状态机
 *
 * 这是一个通用的状态机实现，支持自定义输出函数。
 * 输出函数接收状态转换的完整信息（前一个状态、输入、新状态）。
 *
 * @template Input - 输入信号类型
 * @template Output - 输出类型
 * @template State - 状态类型
 * @param stateMachine - 状态机定义（初始状态和转换函数）
 * @param output - 输出函数，根据状态转换信息计算输出
 * @returns 有状态的状态机实例，提供 dispatch、subscribe 和 current 方法
 *
 * @example
 * ```typescript
 * const sm = machine(
 *   { initial: () => 0, transition: (n) => (s) => s + n },
 *   ({ statePrev, input, state }) => ({ from: statePrev, to: state, input })
 * );
 * ```
 */
export function machine<Input, Output, State>(
  { initial, transition }: StateMachine<Input, State>,
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
  const subscribe: Subscribe<Input, Output> = (handler) => {
    const unsub = sub(handler);
    // 订阅时立即使用当前状态计算并发送输出
    const state = current();
    const out = output(state);
    handler(out);
    return unsub;
  };
  return { dispatch, subscribe, current };
};
