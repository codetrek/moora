import type { CancelFn, PubSub } from './types';

/**
 * 创建发布订阅组件
 *
 * 实现了一个简单的发布订阅模式，支持多个订阅者。
 * 发布时会同步调用所有订阅者的处理函数。
 *
 * @template T - 发布的数据类型
 * @returns PubSub 实例，包含 pub（发布）和 sub（订阅）方法
 *
 * @example
 * ```typescript
 * const pubsub = createPubSub<string>();
 * const unsubscribe = pubsub.sub((value) => console.log(value));
 * pubsub.pub('Hello'); // 输出: Hello
 * unsubscribe();
 * ```
 */
export const createPubSub = <T>(): PubSub<T> => {
  const subscribers = new Set<(value: T) => void>();

  /**
   * 发布数据给所有订阅者
   * @param value - 要发布的数据
   */
  const pub = (value: T) => {
    for (const handler of subscribers) {
      handler(value);
    }
  };

  /**
   * 订阅数据
   * @param handler - 处理函数，当有数据发布时会被调用
   * @returns 取消订阅的函数
   */
  const sub = (handler: (value: T) => void): CancelFn => {
    subscribers.add(handler);
    return () => subscribers.delete(handler);
  };

  return { pub, sub };
};
