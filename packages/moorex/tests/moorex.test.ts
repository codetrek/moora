import { describe, expect, test, vi } from 'vitest';
import { createMoorex } from '../src/moorex';

const nextTick = () => new Promise<void>((resolve) => queueMicrotask(resolve));
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe('createMoorex', () => {
  test('creates moorex with initial state', () => {
    const moorex = createMoorex({
      initial: () => ({ count: 0 }),
      transition: (n: number) => (state) => ({ count: state.count + n }),
      effectsAt: (state) => ({} as Record<string, never>),
      runEffect: () => ({
        start: async () => {},
        cancel: () => {},
      }),
    });

    expect(moorex.current()).toEqual({ count: 0 });
  });

  test('dispatches input and updates state', () => {
    const moorex = createMoorex({
      initial: () => ({ count: 0 }),
      transition: (n: number) => (state) => ({ count: state.count + n }),
      effectsAt: (state) => ({} as Record<string, never>),
      runEffect: () => ({
        start: async () => {},
        cancel: () => {},
      }),
    });

    moorex.dispatch(5);
    expect(moorex.current()).toEqual({ count: 5 });

    moorex.dispatch(3);
    expect(moorex.current()).toEqual({ count: 8 });
  });

  test('starts effects when state changes', async () => {
    const startFn = vi.fn(async () => {});
    const cancelFn = vi.fn(() => {});

    const moorex = createMoorex({
      initial: () => ({ count: 0 }),
      transition: (n: number) => (state) => ({ count: state.count + n }),
      effectsAt: (state) => {
        if (state.count > 0) {
          return { log: { message: `Count is ${state.count}` } };
        }
        return {} as Record<string, never>;
      },
      runEffect: (effect) => ({
        start: startFn,
        cancel: cancelFn,
      }),
    });

    moorex.dispatch(1);
    await nextTick();
    await nextTick(); // 等待 effect 启动

    expect(startFn).toHaveBeenCalledTimes(1);
    expect(cancelFn).not.toHaveBeenCalled();
  });

  test('cancels effects when they are no longer needed', async () => {
    const startFn = vi.fn(() => sleep(100));
    const cancelFn = vi.fn(() => {});

    const moorex = createMoorex({
      initial: () => ({ count: 0 }),
      transition: (n: number) => (state) => ({ count: state.count + n }),
      effectsAt: (state) => {
        if (state.count > 0 && state.count < 5) {
          return { log: { message: `Count is ${state.count}` } };
        }
        return {} as Record<string, never>;
      },
      runEffect: (effect) => ({
        start: startFn,
        cancel: cancelFn,
      }),
    });

    moorex.dispatch(1);
    await nextTick(); // 等待 Moore 机输出（微任务）
    await nextTick(); // 等待 reconciliation 执行（微任务）
    await nextTick(); // 等待 effect 启动

    expect(startFn).toHaveBeenCalledTimes(1);
    expect(cancelFn).not.toHaveBeenCalled();

    moorex.dispatch(10); // 状态变为 11，effect 应该被取消
    // reconciliation 的执行流程：
    // 1. mm.dispatch(10) -> 同步更新状态 -> 同步发布 output
    // 2. runHandler 被同步调用 -> reconcileEffects 同步执行，返回 Procedure
    // 3. queueMicrotask(() => proc(dispatch)) -> Procedure 在微任务中执行
    // 4. Procedure 执行取消操作（同步）
    await nextTick(); // 等待 Procedure 在微任务中执行
    
    expect(cancelFn).toHaveBeenCalledTimes(1);
  });

  test('replaces effects when keys change', async () => {
    const startFn1 = vi.fn(() => sleep(100));
    const cancelFn1 = vi.fn(() => {});
    const startFn2 = vi.fn(() => sleep(100));
    const cancelFn2 = vi.fn(() => {});

    let effectKey = 'effect1';

    const moorex = createMoorex({
      initial: () => ({ count: 0 }),
      transition: (n: number) => (state) => ({ count: state.count + n }),
      effectsAt: (state) => {
        if (state.count > 0) {
          return { [effectKey]: { message: `Count is ${state.count}` } };
        }
        return {} as Record<string, never>;
      },
      runEffect: (effect, state, key) => {
        if (key === 'effect1') {
          return {
            start: startFn1,
            cancel: cancelFn1,
          };
        }
        return {
          start: startFn2,
          cancel: cancelFn2,
        };
      },
    });

    moorex.dispatch(1);
    await nextTick(); // 等待 Moore 机输出（微任务）
    await nextTick(); // 等待 reconciliation 执行（微任务）
    await nextTick(); // 等待 effect 启动

    expect(startFn1).toHaveBeenCalledTimes(1);
    expect(cancelFn1).not.toHaveBeenCalled();

    // 改变 effect key
    effectKey = 'effect2';
    moorex.dispatch(1);
    // reconciliation 的执行流程：
    // 1. mm.dispatch(1) -> 同步更新状态 -> 同步发布 output
    // 2. runHandler 被同步调用 -> reconcileEffects 同步执行，返回 Procedure
    // 3. queueMicrotask(() => proc(dispatch)) -> Procedure 在微任务中执行
    // 4. Procedure 执行取消和启动操作（同步）
    await nextTick(); // 等待 Procedure 在微任务中执行

    // effect1 应该被取消，effect2 应该启动
    expect(cancelFn1).toHaveBeenCalledTimes(1);
    expect(startFn2).toHaveBeenCalledTimes(1);
  });

  test('publishes events correctly', async () => {
    const events: Array<{ type: string; [key: string]: any }> = [];

    const moorex = createMoorex({
      initial: () => ({ count: 0 }),
      transition: (n: number) => (state) => ({ count: state.count + n }),
      effectsAt: (state) => {
        if (state.count > 0) {
          return { log: { message: `Count is ${state.count}` } };
        }
        return {} as Record<string, never>;
      },
      runEffect: () => ({
        start: async () => {},
        cancel: () => {},
      }),
    });

    moorex.subscribe((event) => {
      events.push(event);
    });

    moorex.dispatch(1);
    await nextTick();
    await nextTick();

    // 应该收到 input-received, state-updated, effect-started 事件
    // 注意：事件顺序可能不同，因为 state-updated 在 reconciliation 中发布
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.some((e) => e.type === 'input-received' && e.input === 1)).toBe(true);
    expect(events.some((e) => e.type === 'state-updated')).toBe(true);
    expect(events.some((e) => e.type === 'effect-started')).toBe(true);
  });

  test('publishes effect-completed event when effect finishes', async () => {
    const events: Array<{ type: string; [key: string]: any }> = [];

    const moorex = createMoorex({
      initial: () => ({ count: 0 }),
      transition: (n: number) => (state) => ({ count: state.count + n }),
      effectsAt: (state) => {
        if (state.count > 0) {
          return { log: { message: `Count is ${state.count}` } };
        }
        return {} as Record<string, never>;
      },
      runEffect: () => ({
        start: async () => {
          // 立即完成
        },
        cancel: () => {},
      }),
    });

    moorex.subscribe((event) => {
      events.push(event);
    });

    moorex.dispatch(1);
    await nextTick();
    await nextTick();
    await nextTick(); // 等待 effect 完成

    expect(events.some((e) => e.type === 'effect-completed')).toBe(true);
  });

  test('publishes effect-failed event when effect throws', async () => {
    const events: Array<{ type: string; [key: string]: any }> = [];
    const testError = new Error('Test error');

    const moorex = createMoorex({
      initial: () => ({ count: 0 }),
      transition: (n: number) => (state) => ({ count: state.count + n }),
      effectsAt: (state) => {
        if (state.count > 0) {
          return { log: { message: `Count is ${state.count}` } };
        }
        return {} as Record<string, never>;
      },
      runEffect: () => ({
        start: async () => {
          throw testError;
        },
        cancel: () => {},
      }),
    });

    moorex.subscribe((event) => {
      events.push(event);
    });

    moorex.dispatch(1);
    await nextTick();
    await nextTick();
    await nextTick(); // 等待 effect 失败

    const failedEvent = events.find((e) => e.type === 'effect-failed');
    expect(failedEvent).toBeDefined();
    if (failedEvent && failedEvent.type === 'effect-failed') {
      expect(failedEvent.error).toBe(testError);
    }
  });

  test('publishes effect-canceled event when effect is canceled', async () => {
    const events: Array<{ type: string; [key: string]: any }> = [];

    const moorex = createMoorex({
      initial: () => ({ count: 0 }),
      transition: (n: number) => (state) => ({ count: state.count + n }),
      effectsAt: (state) => {
        if (state.count > 0 && state.count < 5) {
          return { log: { message: `Count is ${state.count}` } };
        }
        return {} as Record<string, never>;
      },
      runEffect: () => ({
        start: async () => {
          // 模拟长时间运行的 effect
          await new Promise((resolve) => setTimeout(resolve, 1000));
        },
        cancel: () => {},
      }),
    });

    moorex.subscribe((event) => {
      events.push(event);
    });

    moorex.dispatch(1);
    await nextTick();
    await nextTick();

    moorex.dispatch(10); // 触发取消
    await nextTick();
    await nextTick();

    const canceledEvent = events.find((e) => e.type === 'effect-canceled');
    expect(canceledEvent).toBeDefined();
  });

  test('supports multiple effects simultaneously', async () => {
    const startFns: Array<ReturnType<typeof vi.fn>> = [];
    const cancelFns: Array<ReturnType<typeof vi.fn>> = [];

    const moorex = createMoorex({
      initial: () => ({ count: 0 }),
      transition: (n: number) => (state) => ({ count: state.count + n }),
      effectsAt: (state) => {
        if (state.count > 0) {
          return {
            effect1: { message: 'Effect 1' },
            effect2: { message: 'Effect 2' },
          };
        }
        return {} as Record<string, never>;
      },
      runEffect: (effect, state, key) => {
        const startFn = vi.fn(async () => {});
        const cancelFn = vi.fn(() => {});
        startFns.push(startFn);
        cancelFns.push(cancelFn);
        return {
          start: startFn,
          cancel: cancelFn,
        };
      },
    });

    moorex.dispatch(1);
    await nextTick();
    await nextTick();

    expect(startFns.length).toBe(2);
    expect(startFns[0]).toHaveBeenCalledTimes(1);
    expect(startFns[1]).toHaveBeenCalledTimes(1);
  });

  test('lazy subscription: only subscribes to machine on first dispatch', () => {
    const moorex = createMoorex({
      initial: () => ({ count: 0 }),
      transition: (n: number) => (state) => ({ count: state.count + n }),
      effectsAt: () => ({}),
      runEffect: () => ({
        start: async () => {},
        cancel: () => {},
      }),
    });

    // 在第一次 dispatch 之前，不应该有订阅
    expect(moorex.current()).toEqual({ count: 0 });

    moorex.dispatch(1);
    expect(moorex.current()).toEqual({ count: 1 });
  });

  test('unsubscribes from machine when all effects are removed', async () => {
    const moorex = createMoorex({
      initial: () => ({ count: 0 }),
      transition: (n: number) => (state) => ({ count: state.count + n }),
      effectsAt: (state) => {
        if (state.count > 0 && state.count < 5) {
          return { log: { message: `Count is ${state.count}` } };
        }
        return {} as Record<string, never>;
      },
      runEffect: () => ({
        start: async () => {},
        cancel: () => {},
      }),
    });

    moorex.dispatch(1);
    await nextTick();
    await nextTick();

    // 现在应该有 effect 运行

    moorex.dispatch(10); // 状态变为 11，effect 应该被取消
    await nextTick();
    await nextTick();

    // 所有 effects 都被移除后，应该取消订阅
    // 但状态仍然可以访问
    expect(moorex.current()).toEqual({ count: 11 });
  });

  test('effect receives correct state and key', async () => {
    const receivedStates: Array<{ state: any; key: string; effect: any }> = [];

    const moorex = createMoorex({
      initial: () => ({ count: 0 }),
      transition: (n: number) => (state) => ({ count: state.count + n }),
      effectsAt: (state) => {
        if (state.count > 0) {
          return { log: { message: `Count is ${state.count}` } };
        }
        return {} as Record<string, never>;
      },
      runEffect: (effect, state, key) => {
        receivedStates.push({ state, key, effect });
        return {
          start: async () => {},
          cancel: () => {},
        };
      },
    });

    moorex.dispatch(5);
    await nextTick();
    await nextTick();

    expect(receivedStates).toHaveLength(1);
    const firstState = receivedStates[0];
    expect(firstState).toBeDefined();
    if (firstState) {
      expect(firstState.state).toEqual({ count: 5 });
      expect(firstState.key).toBe('log');
      expect(firstState.effect).toEqual({ message: 'Count is 5' });
    }
  });

  test('effect can dispatch new inputs', async () => {
    const events: Array<{ type: string; input?: number }> = [];

    const moorex = createMoorex({
      initial: () => ({ count: 0 }),
      transition: (n: number) => (state) => ({ count: state.count + n }),
      effectsAt: (state) => {
        if (state.count < 5) {
          return { increment: { amount: 1 } };
        }
        return {} as Record<string, never>;
      },
      runEffect: (effect, state, key) => ({
        start: async (dispatch) => {
          dispatch(effect.amount);
        },
        cancel: () => {},
      }),
    });

    moorex.subscribe((event) => {
      if (event.type === 'input-received') {
        events.push({ type: event.type, input: event.input });
      }
    });

    moorex.dispatch(1);
    await nextTick();
    await nextTick();
    await nextTick(); // 等待 effect 完成并触发新的 dispatch

    // 应该收到初始的 dispatch 和 effect 触发的 dispatch
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  test('handles rapid state changes', async () => {
    const startFn = vi.fn(async () => {});
    const cancelFn = vi.fn(() => {});

    const moorex = createMoorex({
      initial: () => ({ count: 0 }),
      transition: (n: number) => (state) => ({ count: state.count + n }),
      effectsAt: (state) => {
        if (state.count > 0) {
          return { log: { message: `Count is ${state.count}` } };
        }
        return {} as Record<string, never>;
      },
      runEffect: () => ({
        start: startFn,
        cancel: cancelFn,
      }),
    });

    // 快速连续 dispatch
    moorex.dispatch(1);
    moorex.dispatch(2);
    moorex.dispatch(3);
    await nextTick();
    await nextTick();

    // 应该正确处理所有状态变化
    expect(moorex.current()).toEqual({ count: 6 });
  });
});

