import { describe, expect, test } from 'vitest';
import { createPubSub } from '../src/pub-sub';

describe('createPubSub', () => {
  test('creates pub-sub instance with pub and sub methods', () => {
    const pubsub = createPubSub<string>();
    expect(pubsub.pub).toBeDefined();
    expect(pubsub.sub).toBeDefined();
    expect(typeof pubsub.pub).toBe('function');
    expect(typeof pubsub.sub).toBe('function');
  });

  test('publishes value to subscribers', () => {
    const pubsub = createPubSub<string>();
    const received: string[] = [];

    pubsub.sub((value) => {
      received.push(value);
    });

    pubsub.pub('Hello');
    expect(received).toEqual(['Hello']);

    pubsub.pub('World');
    expect(received).toEqual(['Hello', 'World']);
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

    pubsub.pub(42);
    expect(received1).toEqual([42]);
    expect(received2).toEqual([42]);
  });

  test('unsubscribe removes subscriber', () => {
    const pubsub = createPubSub<string>();
    const received: string[] = [];

    const unsubscribe = pubsub.sub((value) => {
      received.push(value);
    });

    pubsub.pub('First');
    expect(received).toEqual(['First']);

    unsubscribe();
    pubsub.pub('Second');
    expect(received).toEqual(['First']); // 取消订阅后不应收到新消息
  });

  test('unsubscribe does not affect other subscribers', () => {
    const pubsub = createPubSub<number>();
    const received1: number[] = [];
    const received2: number[] = [];

    const unsubscribe1 = pubsub.sub((value) => {
      received1.push(value);
    });

    pubsub.sub((value) => {
      received2.push(value);
    });

    pubsub.pub(1);
    expect(received1).toEqual([1]);
    expect(received2).toEqual([1]);

    unsubscribe1();
    pubsub.pub(2);
    expect(received1).toEqual([1]); // 已取消订阅
    expect(received2).toEqual([1, 2]); // 仍然订阅
  });

  test('handles complex data types', () => {
    type ComplexData = {
      id: number;
      name: string;
      tags: string[];
    };

    const pubsub = createPubSub<ComplexData>();
    const received: ComplexData[] = [];

    pubsub.sub((value) => {
      received.push(value);
    });

    const data: ComplexData = {
      id: 1,
      name: 'Test',
      tags: ['a', 'b'],
    };

    pubsub.pub(data);
    expect(received).toEqual([data]);
  });

  test('publishes synchronously', () => {
    const pubsub = createPubSub<string>();
    let callOrder = '';

    pubsub.sub(() => {
      callOrder += 'A';
    });

    pubsub.sub(() => {
      callOrder += 'B';
    });

    pubsub.pub('test');
    expect(callOrder).toBe('AB'); // 同步执行
  });
});
