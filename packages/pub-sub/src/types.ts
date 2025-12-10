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
export type Unsubscribe = CancelFn;

// ============================================================================
// PubSub 相关类型
// ============================================================================

/**
 * 订阅函数
 *
 * @template T - 发布的数据类型
 * @param handler - 处理函数，当有数据发布时会被调用
 * @returns 取消订阅的函数
 */
export type Subscribe<T> = (handler: (value: T) => void) => Unsubscribe;

/**
 * 发布函数
 *
 * @template T - 发布的数据类型
 * @param value - 要发布的数据
 */
export type Publish<T> = (value: T) => void;

/**
 * 发布订阅组件
 *
 * @template T - 发布的数据类型
 */
export type PubSub<T> = {
  /**
   * 发布数据给所有订阅者
   */
  pub: Publish<T>;
  /**
   * 订阅数据
   * @param handler - 处理函数
   * @returns 取消订阅的函数
   */
  sub: Subscribe<T>;
};
