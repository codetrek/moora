import type { CancelFn } from './types';

/**
 * 发布订阅组件
 *
 * @template T - 发布的数据类型
 */
export type PubSub<T> = {
  /**
   * 发布数据给所有订阅者
   */
  pub: (value: T) => void;
  /**
   * 订阅数据
   * @param handler - 处理函数
   * @returns 取消订阅的函数
   */
  sub: (handler: (value: T) => void) => CancelFn;
};

/**
 * 创建发布订阅组件
 *
 * @template T - 发布的数据类型
 * @returns PubSub 实例
 */
export const createPubSub = <T>(): PubSub<T> => {
  const subscribers = new Set<(value: T) => void>();

  const pub = (value: T) => {
    for (const handler of subscribers) {
      handler(value);
    }
  };

  const sub = (handler: (value: T) => void): CancelFn => {
    subscribers.add(handler);
    return () => subscribers.delete(handler);
  };

  return { pub, sub };
};

/**
 * 从 PubSub 创建异步生成器流
 *
 * @template T - 数据类型
 * @param pubsub - PubSub 实例
 * @param initialValue - 可选的初始值，如果提供，会在流开始时立即发送
 * @returns 异步生成器
 */
export const createStreamFromPubSub = <T>(
  pubsub: PubSub<T>,
  initialValue?: T,
): AsyncGenerator<T> => {
  let resolveNext: ((value: T) => void) | null = null;
  let promise: Promise<T> | null = null;

  const notify = (value: T) => {
    if (resolveNext) {
      resolveNext(value);
      resolveNext = null;
      promise = null;
    }
  };

  const unsubscribe = pubsub.sub(notify);

  const generator = async function* () {
    // 如果有初始值，首先发送它
    if (initialValue !== undefined) {
      yield initialValue;
    }

    while (true) {
      if (!promise) {
        promise = new Promise<T>((resolve) => {
          resolveNext = resolve;
        });
      }
      yield await promise;
    }
  };

  // 返回一个包装的生成器，在迭代器关闭时清理订阅
  return (async function* () {
    try {
      yield* generator();
    } finally {
      unsubscribe();
    }
  })();
};


