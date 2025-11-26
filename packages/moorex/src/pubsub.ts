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

type DifferContext<T> = {
  resolve: (value: T) => void;
  promise: Promise<T>;
};

const createDifferContext = <T>(): DifferContext<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { resolve, promise };
};

// 使用 FinalizationRegistry 来检测生成器被垃圾回收时自动清理订阅
// 这样可以防止内存泄露，即使生成器没有被正确关闭
const streamCleanupRegistry = new FinalizationRegistry<() => void>((unsubscribe) => {
  unsubscribe();
});

/**
 * 从 PubSub 创建异步生成器流
 *
 * @template T - 数据类型
 * @param pubsub - PubSub 实例
 * @param initialValue - 可选的初始值，如果提供，会在流开始时立即发送
 * @returns 异步生成器
 *
 * @remarks
 * 生成器会在以下情况自动清理订阅：
 * 1. 生成器被正确关闭（通过 return() 或 break）
 * 2. 生成器被垃圾回收（通过 FinalizationRegistry）
 *
 * 建议在使用完生成器后调用 iterator.return() 来立即清理，而不是等待垃圾回收。
 */
export const createStreamFromPubSub = <T>(
  pubsub: PubSub<T>,
  initialValue?: T,
): AsyncGenerator<T> => {
  let context: DifferContext<T> | null = null;

  const notify = (value: T) => {
    if (context) {
      context.resolve(value);
      context = null;
    }
  };

  const unsubscribe = pubsub.sub(notify);
  let isCleanedUp = false;

  const cleanup = () => {
    if (!isCleanedUp) {
      isCleanedUp = true;
      unsubscribe();
    }
  };

  const generator = async function* () {
    // 如果有初始值，首先发送它
    if (initialValue !== undefined) {
      yield initialValue;
    }

    while (true) {
      if (!context) {
        context = createDifferContext<T>();
      }
      yield await context.promise;
    }
  };

  // 创建一个对象作为弱引用目标
  const cleanupTarget = {};

  // 返回一个包装的生成器，在迭代器关闭时清理订阅
  const wrappedGenerator = (async function* () {
    try {
      yield* generator();
    } finally {
      cleanup();
    }
  })();

  // 注册清理函数，当 cleanupTarget 被垃圾回收时自动清理
  // 注意：cleanupTarget 会被 wrappedGenerator 闭包持有，所以当生成器被垃圾回收时，
  // cleanupTarget 也会被回收，从而触发 FinalizationRegistry 的回调
  streamCleanupRegistry.register(cleanupTarget, cleanup);

  // 将 cleanupTarget 附加到生成器上，确保它们一起被垃圾回收
  // 使用 Symbol 作为属性名，避免与用户代码冲突
  const CLEANUP_TARGET = Symbol('cleanupTarget');
  (wrappedGenerator as any)[CLEANUP_TARGET] = cleanupTarget;

  return wrappedGenerator;
};


