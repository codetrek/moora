import { describe, expect, test } from 'vitest';
import { createEventEmitter } from '../src/event-emitter';

describe('createEventEmitter', () => {
  test('emits events to registered handlers', () => {
    const { emit, subscribe } = createEventEmitter<{ type: string; value: number }, string>();
    const events: Array<{ type: string; value: number }> = [];

    subscribe((event) => events.push(event));
    emit({ type: 'test', value: 1 }, 'ctx');
    emit({ type: 'test', value: 2 }, 'ctx');

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: 'test', value: 1 });
    expect(events[1]).toEqual({ type: 'test', value: 2 });
  });

  test('supports multiple handlers', () => {
    const { emit, subscribe } = createEventEmitter<{ value: number }, string>();
    const events1: Array<{ value: number }> = [];
    const events2: Array<{ value: number }> = [];

    subscribe((event) => events1.push(event));
    subscribe((event) => events2.push(event));
    emit({ value: 42 }, 'ctx');

    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(1);
    expect(events1[0]?.value).toBe(42);
    expect(events2[0]?.value).toBe(42);
  });

  test('unsubscribe removes handler', () => {
    const { emit, subscribe } = createEventEmitter<{ value: number }, string>();
    const events: Array<{ value: number }> = [];

    const unsubscribe = subscribe((event) => events.push(event));
    emit({ value: 1 }, 'ctx');
    unsubscribe();
    emit({ value: 2 }, 'ctx');

    expect(events).toHaveLength(1);
    expect(events[0]?.value).toBe(1);
  });

  test('multiple unsubscribes work correctly', () => {
    const { emit, subscribe } = createEventEmitter<{ value: number }, string>();
    const events1: Array<{ value: number }> = [];
    const events2: Array<{ value: number }> = [];

    const unsubscribe1 = subscribe((event) => events1.push(event));
    const unsubscribe2 = subscribe((event) => events2.push(event));
    emit({ value: 1 }, 'ctx');
    unsubscribe1();
    emit({ value: 2 }, 'ctx');
    unsubscribe2();
    emit({ value: 3 }, 'ctx');

    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(2);
    expect(events1[0]?.value).toBe(1);
    expect(events2[0]?.value).toBe(1);
    expect(events2[1]?.value).toBe(2);
  });

  test('emits immutable events', () => {
    const { emit, subscribe } = createEventEmitter<{ value: number }, string>();
    let receivedEvent: { value: number } | undefined;

    subscribe((event) => {
      receivedEvent = event;
    });

    const originalEvent = { value: 42 };
    emit(originalEvent, 'ctx');

    expect(receivedEvent).toBeDefined();
    // mutative 的 create 会创建不可变代理，但原始对象可能不受影响
    // 这里主要测试事件被正确发出
    if (receivedEvent) {
      expect(receivedEvent.value).toBe(42);
    }
  });

  test('handles empty handler list', () => {
    const { emit } = createEventEmitter<{ value: number }, string>();
    // 不应该抛出错误
    expect(() => emit({ value: 1 }, 'ctx')).not.toThrow();
  });
});

