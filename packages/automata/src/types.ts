import type { Eff } from '@moora/effects';
import type { Unsubscribe as PubSubUnsubscribe } from '@moora/pub-sub';

// ============================================================================
// 基础类型
// ============================================================================

/**
 * 取消函数，用于取消订阅或停止操作
 */
export type CancelFn = () => void;

/**
 * 取消订阅函数，等同于 CancelFn
 */
export type Unsubscribe = PubSubUnsubscribe;

// ============================================================================
// 自动机相关类型
// ============================================================================

/**
 * 分发函数，用于发送输入信号
 */
export type Dispatch<Input> = Eff<Input>;

/**
 * 输出处理器，接收输出并处理
 *
 * 简单的回调函数，接收 output 并执行处理逻辑。
 * 如果需要 dispatch 新的输入，应该使用 automata 对象的 dispatch 方法。
 */
export type OutputHandler<Output> = Eff<Output>;

/**
 * 订阅函数
 * 接收 OutputHandler，当有 output 时会调用 handler(output)
 */
export type SubscribeOutput<Output> = (handler: OutputHandler<Output>) => Unsubscribe;

/**
 * 传输器，用于在输入和输出之间建立连接
 */
export type Transferer<Input, Output> = {
  dispatch: Dispatch<Input>;
  subscribe: SubscribeOutput<Output>;
};

/**
 * 有状态的传输器，包含当前状态访问
 */
export type StatefulTransferer<Input, Output, State> = Transferer<Input, Output> & {
  current: () => State;
};

/**
 * 初始化函数，返回初始状态
 *
 * @template State - 状态类型
 * @returns 初始状态
 */
export type InitialFn<State> = () => State;

/**
 * 状态转换函数，接收输入并返回状态更新函数
 *
 * 这是一个柯里化函数：
 * 1. 第一层接收输入信号，返回状态更新函数
 * 2. 第二层接收当前状态，返回新状态
 *
 * @template Input - 输入信号类型
 * @template State - 状态类型
 * @param input - 输入信号
 * @returns 状态更新函数，接收当前状态并返回新状态
 */
export type TransitionFn<Input, State> = (input: Input) => (state: State) => State;

/**
 * 自动机定义
 */
export type StateMachine<Input, State> = {
  initial: InitialFn<State>;
  transition: TransitionFn<Input, State>;
};

/**
 * Mealy 机输出函数
 *
 * Mealy 机的输出依赖于新状态和输入。
 * 函数接收包含新状态和输入的对象（类型结构与 `UpdatePack` 的 `prev` 字段相同），计算并返回输出。
 *
 * @template Input - 输入信号类型
 * @template Output - 输出类型
 * @template State - 状态类型
 * @param update - 包含新状态和输入的对象（类型结构与 `UpdatePack` 的 `prev` 字段相同）
 * @returns 计算得到的输出
 */
export type MealyOutputFn<Input, Output, State> = (
  update: StateTransition<Input, State>
) => Output;

/**
 * Mealy 机定义（输出依赖于输入和状态）
 */
export type MealyMachine<Input, Output, State> = StateMachine<Input, State> & {
  output: MealyOutputFn<Input, Output, State>;
};

/**
 * Moore 机输出函数
 *
 * Moore 机的输出仅依赖于当前状态，不依赖于输入。
 * 函数接收当前状态，计算并返回输出。
 *
 * @template State - 状态类型
 * @template Output - 输出类型
 * @param state - 当前状态
 * @returns 计算得到的输出
 */
export type MooreOutputFn<State, Output> = (state: State) => Output;

/**
 * Moore 机定义（输出仅依赖于状态）
 */
export type MooreMachine<Input, Output, State> = StateMachine<Input, State> & {
  output: MooreOutputFn<State, Output>;
};

/**
 * 状态转换信息，包含前一个状态和输入
 *
 * 这是 `UpdatePack` 的 `prev` 字段（当它不为 `null` 时）。
 * 用于 Mealy 机的输出函数。
 *
 * @template Input - 输入信号类型
 * @template State - 状态类型
 */
export type StateTransition<Input, State> = {
  state: State;
  input: Input;
};

/**
 * 更新包，包含状态转换前后的状态和输入
 *
 * - `prev`: 前一个状态和输入，如果为 `null` 表示这是初始状态（没有前一个状态）
 * - `state`: 当前状态
 */
export type UpdatePack<Input, State> = {
  prev: StateTransition<Input, State> | null;
  state: State;
};

/**
 * Automata 输出函数
 *
 * Automata 的输出函数接收状态转换的完整信息（前一个状态、输入、新状态）。
 * 如果返回 `null`，则忽略此次输出。
 *
 * @template Input - 输入信号类型
 * @template Output - 输出类型
 * @template State - 状态类型
 * @param update - 状态转换信息包，包含前一个状态、输入和新状态
 * @returns 计算得到的输出，如果为 `null` 则忽略此次输出
 */
export type AutomataOutputFn<Input, Output, State> = (
  update: UpdatePack<Input, State>
) => { output: Output } | null;
