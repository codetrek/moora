import { type Immutable } from 'mutative';

/**
 * 取消函数类型
 */
export type CancelFn = () => void;

/**
 * Effect 初始化器
 */
export type EffectInitializer<Signal> = {
  start: (dispatch: (signal: Immutable<Signal>) => void) => Promise<void>;
  cancel: CancelFn;
};

/**
 * Automata 定义配置。
 *
 * 只涉及 State, Signal, transition, initialState。
 *
 * @template State - 机器的状态类型
 * @template Signal - 信号类型，用于触发状态转换
 */
export type AutomataDefinition<State, Signal> = {
  /** 初始化函数，返回初始状态 */
  initialState: () => Immutable<State>;
  /**
   * 状态转换函数。
   * 接收一个 Immutable 信号，返回一个函数，该函数接收 Immutable 状态并返回新的 Immutable 状态。
   * 参数和返回值都是 Immutable 的，不允许修改。
   */
  transition: (signal: Immutable<Signal>) => (state: Immutable<State>) => Immutable<State>;
};

/**
 * Automata 更新对象。
 *
 * 包含触发状态转换的信号和更新后的状态。
 *
 * @template State - 机器的状态类型
 * @template Signal - 信号类型
 */
export type AutomataUpdate<State, Signal> = {
  signal: Immutable<Signal>;
  state: Immutable<State>;
};

/**
 * Automata 实例。
 *
 * 提供状态管理、信号分发和订阅功能。
 *
 * @template State - 机器的状态类型
 * @template Signal - 信号类型
 */
export type Automata<State, Signal> = {
  /**
   * 分发一个信号以触发状态转换。
   * 信号会被加入队列，在下一个微任务中批量处理。
   * 参数必须是 Immutable 的，不允许修改。
   */
  dispatch(signal: Immutable<Signal>): void;
  /**
   * 订阅信号导致的状态变化。
   * @param handler - 处理函数，接收包含信号和更新后状态的对象
   * @returns 取消订阅的函数
   */
  subscribe(handler: (update: { signal: Immutable<Signal>; state: Immutable<State> }) => void): CancelFn;
  /**
   * 获取当前状态。
   * 返回的状态是 Immutable 的，不允许修改。
   */
  getState(): Immutable<State>;
};

/**
 * 根据当前状态计算应该运行的 effects。
 * 接收 Immutable 状态，返回 Effect Record，key 作为 Effect 的标识用于 reconciliation。
 * 参数和返回值都是 Immutable 的，不允许修改。
 * Record 的 key 用于在 reconciliation 时做一致性判定。
 *
 * @template State - 机器的状态类型
 * @template Effect - Effect 类型
 */
export type EffectsAt<State, Effect> = (state: Immutable<State>) => Record<string, Immutable<Effect>>;

/**
 * 运行 Effect 的函数。
 *
 * @template Effect - Effect 类型
 * @template Signal - 信号类型
 */
export type RunEffect<Effect, Signal> = (
  effect: Immutable<Effect>,
  state: Immutable<any>,
  key: string,
) => EffectInitializer<Signal>;

/**
 * Effect Controller 状态
 */
export type EffectControllerStatus = 'running' | 'braking' | 'stopped';

/**
 * Effect 事件
 *
 * @template Effect - Effect 类型
 */
export type EffectEvent<Effect> =
  | { type: 'start'; key: string; effect: Immutable<Effect> }
  | { type: 'cancel'; key: string; effect: Immutable<Effect> };

/**
 * Effect Controller 实例。
 *
 * 管理 effects 的生命周期，根据状态流协调 effects。
 *
 * @template Effect - Effect 类型
 */
export type EffectController<Effect> = {
  /**
   * 启动 Effect Controller。
   * 开始监听状态流并协调 effects。
   */
  start(): void;
  /**
   * 停止 Effect Controller。
   * @param force - 如果为 true，直接进入 stopped 状态，停止接收 state stream 的变化，cancel 所有 running effects；
   *                否则进入 braking 状态，不再接收 state stream 的 update，但不 cancel running effects，
   *                等待这些 effects 自然结束后切 stopped 状态（如果没有再次启动的话）
   */
  stop(force: boolean): void;
  /**
   * 获取当前状态。
   */
  getStatus(): EffectControllerStatus;
  /**
   * 获取状态流。
   * 返回一个异步生成器，每次状态改变时产生新的状态。
   */
  getStatusStream(): AsyncGenerator<EffectControllerStatus>;
  /**
   * 获取当前的活跃 effects。
   * 返回一个 Record，key 是 effect 的标识，value 是 effect 本身。
   */
  getEffects(): Record<string, Immutable<Effect>>;
  /**
   * 获取 Effect 事件流。
   * 返回一个异步生成器，每次 effect 启动或取消时产生事件。
   */
  getEffectEventStream(): AsyncGenerator<EffectEvent<Effect>>;
};

/**
 * 定义 Moore 机器的配置。
 *
 * Moorex 是一个通用的异步 Moore 机器，它跟踪状态，严格从当前状态驱动 effects，
 * 并在状态改变时协调这些 effects。设计初衷是构建持久化的 AI agents，这些 agents
 * 必须在崩溃、重启或迁移时存活，同时能够恢复未完成的工作。
 *
 * 所有函数参数和返回值都是 Immutable 的，确保不可修改。
 *
 * @template State - 机器的状态类型
 * @template Signal - 信号类型，用于触发状态转换
 * @template Effect - Effect 类型
 * @deprecated 使用 AutomataDefinition 和 EffectsAt 替代
 */
export type MoorexDefinition<State, Signal, Effect> = {
  /** 初始化函数，返回初始状态 */
  initiate: () => Immutable<State>;
  /**
   * 状态转换函数。
   * 接收一个 Immutable 信号，返回一个函数，该函数接收 Immutable 状态并返回新的 Immutable 状态。
   * 参数和返回值都是 Immutable 的，不允许修改。
   */
  transition: (signal: Immutable<Signal>) => (state: Immutable<State>) => Immutable<State>;
  /**
   * 根据当前状态计算应该运行的 effects。
   * 接收 Immutable 状态，返回 Effect Record，key 作为 Effect 的标识用于 reconciliation。
   * 参数和返回值都是 Immutable 的，不允许修改。
   * Record 的 key 用于在 reconciliation 时做一致性判定。
   */
  effectsAt: (state: Immutable<State>) => Record<string, Immutable<Effect>>;
};

/**
 * Moorex 机器发出的事件。
 *
 * 事件类型包括：
 * - `signal-received`: 信号被接收并处理
 * - `state-updated`: 状态已更新
 * - `effect-started`: Effect 开始（根据 reconciliation 结果）
 * - `effect-canceled`: Effect 被取消（根据 reconciliation 结果）
 *
 * @template State - 机器的状态类型
 * @template Signal - 信号类型
 * @template Effect - Effect 类型
 * @deprecated 使用 EffectEvent 替代
 */
export type MoorexEvent<State, Signal, Effect> =
  | { type: 'signal-received'; signal: Immutable<Signal> }
  | { type: 'state-updated'; state: Immutable<State> }
  | { type: 'effect-started'; effect: Immutable<Effect>; key: string }
  | { type: 'effect-canceled'; effect: Immutable<Effect>; key: string };

/**
 * Moorex 机器实例。
 *
 * 提供状态管理、信号分发和事件订阅功能。
 *
 * @template State - 机器的状态类型
 * @template Signal - 信号类型
 * @template Effect - Effect 类型
 * @deprecated 使用 Automata 和 EffectController 替代
 */
export type Moorex<State, Signal, Effect> = {
  /**
   * 分发一个信号以触发状态转换。
   * 信号会被加入队列，在下一个微任务中批量处理。
   * 参数必须是 Immutable 的，不允许修改。
   */
  dispatch(signal: Immutable<Signal>): void;
  /**
   * 订阅事件。
   * 返回一个取消订阅的函数。
   *
   * @param handler - 事件处理函数，接收事件和 moorex 实例作为参数
   * @returns 取消订阅的函数
   */
  subscribe(handler: (event: MoorexEvent<State, Signal, Effect>, moorex: Moorex<State, Signal, Effect>) => void): CancelFn;
  /**
   * 获取当前状态。
   * 返回的状态是 Immutable 的，不允许修改。
   */
  getState(): Immutable<State>;
};
