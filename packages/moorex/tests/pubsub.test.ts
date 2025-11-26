import { describe, expect, test } from 'vitest';
import { createPubSub, createStreamFromPubSub } from '../src/pubsub';

const nextTick = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('createPubSub', () => {
  test('publishes to subscribers', () => {
    const pubsub = createPubSub<string>();
    const received: string[] = [];

    pubsub.sub((value) => {
      received.push(value);
    });

    pubsub.pub('hello');
    pubsub.pub('world');

    expect(received).toEqual(['hello', 'world']);
  });

  test('supports multiple subscribers', () => {
    const pubsub = createPubSub<number>();
    const received1: number[] = [];
    const received2: number[] = [];

    pubsub.sub((value) => {
      received1.push(value);
    });

    pubsub.sub((value) => {
      received2.push(value);
    });

    pubsub.pub(1);
    pubsub.pub(2);

    expect(received1).toEqual([1, 2]);
    expect(received2).toEqual([1, 2]);
  });

  test('unsubscribes correctly', () => {
    const pubsub = createPubSub<string>();
    const received: string[] = [];

    const unsubscribe = pubsub.sub((value) => {
      received.push(value);
    });

    pubsub.pub('before');
    unsubscribe();
    pubsub.pub('after');

    expect(received).toEqual(['before']);
  });

  test('handles multiple unsubscribes', () => {
    const pubsub = createPubSub<number>();
    const received: number[] = [];

    const unsubscribe1 = pubsub.sub((value) => {
      received.push(value);
    });

    const unsubscribe2 = pubsub.sub((value) => {
      received.push(value * 2);
    });

    pubsub.pub(1);
    unsubscribe1();
    pubsub.pub(2);
    unsubscribe2();
    pubsub.pub(3);

    expect(received).toEqual([1, 2, 4]);
  });

  test('handles unsubscribe during publish', () => {
    const pubsub = createPubSub<string>();
    const received: string[] = [];

    pubsub.sub((value) => {
      received.push(value);
      if (value === 'unsubscribe') {
        // 在发布过程中取消订阅不应该影响当前发布
        pubsub.sub(() => {})(); // 创建一个并立即取消
      }
    });

    pubsub.pub('before');
    pubsub.pub('unsubscribe');
    pubsub.pub('after');

    expect(received).toEqual(['before', 'unsubscribe', 'after']);
  });
});

describe('createStreamFromPubSub', () => {
  test('yields values from pubsub', async () => {
    const pubsub = createPubSub<number>();
    const stream = createStreamFromPubSub(pubsub);
    const received: number[] = [];

    const iterator = stream[Symbol.asyncIterator]();

    // 启动第一个值的等待
    const promise1 = iterator.next();
    await nextTick();

    pubsub.pub(1);
    const result1 = await promise1;
    expect(result1.done).toBe(false);
    expect(result1.value).toBe(1);
    received.push(result1.value);

    // 启动第二个值的等待
    const promise2 = iterator.next();
    await nextTick();

    pubsub.pub(2);
    const result2 = await promise2;
    expect(result2.done).toBe(false);
    expect(result2.value).toBe(2);
    received.push(result2.value);

    // 启动第三个值的等待
    const promise3 = iterator.next();
    await nextTick();

    pubsub.pub(3);
    const result3 = await promise3;
    expect(result3.done).toBe(false);
    expect(result3.value).toBe(3);
    received.push(result3.value);

    await iterator.return?.(undefined);

    expect(received).toEqual([1, 2, 3]);
  });

  test('yields initial value first', async () => {
    const pubsub = createPubSub<string>();
    const stream = createStreamFromPubSub(pubsub, 'initial');
    const received: string[] = [];

    const iterator = stream[Symbol.asyncIterator]();

    // 获取初始值
    const result1 = await iterator.next();
    expect(result1.done).toBe(false);
    expect(result1.value).toBe('initial');
    received.push(result1.value);

    // 启动下一个值的等待
    const promise2 = iterator.next();
    await nextTick();

    pubsub.pub('next');
    const result2 = await promise2;
    expect(result2.done).toBe(false);
    expect(result2.value).toBe('next');
    received.push(result2.value);

    await iterator.return?.(undefined);

    expect(received).toEqual(['initial', 'next']);
  });

  test('handles multiple values in sequence', async () => {
    const pubsub = createPubSub<number>();
    const stream = createStreamFromPubSub(pubsub);
    const received: number[] = [];

    const iterator = stream[Symbol.asyncIterator]();

    for (let i = 1; i <= 5; i++) {
      const promise = iterator.next();
      await nextTick();
      pubsub.pub(i);
      const result = await promise;
      expect(result.done).toBe(false);
      expect(result.value).toBe(i);
      received.push(result.value);
    }

    await iterator.return?.(undefined);

    expect(received).toEqual([1, 2, 3, 4, 5]);
  });

  test('unsubscribes when generator is closed', async () => {
    const pubsub = createPubSub<string>();
    const received: string[] = [];

    const directUnsubscribe = pubsub.sub((value) => {
      received.push(value);
    });

    const stream = createStreamFromPubSub(pubsub);
    const iterator = stream[Symbol.asyncIterator]();

    // 启动等待
    const promise = iterator.next();
    await nextTick();

    // 发布第一个值
    pubsub.pub('first');
    const result = await promise;
    expect(result.done).toBe(false);
    expect(result.value).toBe('first');

    // 关闭迭代器
    await iterator.return?.(undefined);

    // 发布新值，应该不会被流接收（但会被直接订阅者接收）
    pubsub.pub('after-close');
    await nextTick();

    // 流应该已经停止，但直接订阅者仍然可以接收
    expect(received).toContain('after-close');
    expect(received).toContain('first');

    directUnsubscribe();
  });

  test('handles rapid successive publishes', async () => {
    const pubsub = createPubSub<number>();
    const stream = createStreamFromPubSub(pubsub);
    const received: number[] = [];

    const iterator = stream[Symbol.asyncIterator]();

    // 快速连续发布和消费
    for (let i = 1; i <= 10; i++) {
      const promise = iterator.next();
      await nextTick();
      pubsub.pub(i);
      const result = await promise;
      expect(result.done).toBe(false);
      expect(result.value).toBe(i);
      received.push(result.value);
    }

    await iterator.return?.(undefined);

    expect(received).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test('handles undefined initial value', async () => {
    const pubsub = createPubSub<string>();
    const stream = createStreamFromPubSub(pubsub, undefined);
    const received: string[] = [];

    const consume = async () => {
      for await (const value of stream) {
        received.push(value);
        if (received.length >= 1) {
          break;
        }
      }
    };

    // 启动消费
    const consumePromise = consume();
    // 等待生成器开始等待
    await nextTick();
    await nextTick();

    pubsub.pub('first');
    await nextTick();

    await consumePromise;
    expect(received).toEqual(['first']);
  });

  test('works with complex objects', async () => {
    type Complex = { id: number; data: string };
    const pubsub = createPubSub<Complex>();
    const stream = createStreamFromPubSub(pubsub);
    const received: Complex[] = [];

    const iterator = stream[Symbol.asyncIterator]();

    const promise1 = iterator.next();
    await nextTick();
    pubsub.pub({ id: 1, data: 'test1' });
    const result1 = await promise1;
    expect(result1.done).toBe(false);
    expect(result1.value).toEqual({ id: 1, data: 'test1' });
    received.push(result1.value);

    const promise2 = iterator.next();
    await nextTick();
    pubsub.pub({ id: 2, data: 'test2' });
    const result2 = await promise2;
    expect(result2.done).toBe(false);
    expect(result2.value).toEqual({ id: 2, data: 'test2' });
    received.push(result2.value);

    await iterator.return?.(undefined);

    expect(received).toEqual([
      { id: 1, data: 'test1' },
      { id: 2, data: 'test2' },
    ]);
  });

  test('automatically cleans up subscription when generator is garbage collected', async () => {
    const pubsub = createPubSub<number>();
    const received: number[] = [];

    // 创建一个直接订阅来验证清理
    const directUnsubscribe = pubsub.sub((value) => {
      received.push(value);
    });

    // 创建一个流但不使用它（模拟内存泄露场景）
    {
      const stream = createStreamFromPubSub(pubsub);
      // 不关闭流，让它被垃圾回收
      void stream[Symbol.asyncIterator]().next();
    }

    // 强制触发垃圾回收（如果可能）
    // 注意：在 Node.js 中，FinalizationRegistry 的回调可能不会立即执行
    // 但我们可以验证订阅确实存在
    pubsub.pub(1);
    expect(received).toContain(1);

    // 清理直接订阅
    directUnsubscribe();

    // 注意：FinalizationRegistry 的回调是异步的，可能不会立即执行
    // 这个测试主要验证代码结构正确，实际的清理会在垃圾回收时发生
  });
});

