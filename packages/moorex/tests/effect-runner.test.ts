import { describe, expect, test } from 'vitest';
import { createEffectRunner, type MoorexEvent, type Moorex } from '../src/index';

type TestSignal = 'start' | 'stop' | 'increment';
type TestEffect = { id: string; action: string };

type Deferred = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error?: unknown) => void;
};

const createDeferred = (): Deferred => {
  let resolve!: () => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const nextTick = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('createEffectRunner', () => {
  test('starts effect when receiving effect-started event', async () => {
    type State = { value: number };
    const mockMoorex = {
      dispatch: () => {},
      subscribe: () => () => {},
      getState: () => ({ value: 1 } as State),
    } as Moorex<State, TestSignal, TestEffect>;

    let effectStarted = false;

    const handler = createEffectRunner<State, TestSignal, TestEffect>(
      (effect, state, key) => ({
        start: async () => {
          effectStarted = true;
        },
        cancel: () => {},
      })
    );

    handler(
      { type: 'effect-started', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    await nextTick();

    expect(effectStarted).toBe(true);
  });

  test('cancels effect when receiving effect-canceled event', async () => {
    type State = { value: number };
    const mockMoorex = {
      dispatch: () => {},
      subscribe: () => () => {},
      getState: () => ({ value: 1 } as State),
    } as Moorex<State, TestSignal, TestEffect>;

    let effectCanceled = false;

    const handler = createEffectRunner<State, TestSignal, TestEffect>(
      (effect, state, key) => ({
        start: () => new Promise(() => {}),
        cancel: () => {
          effectCanceled = true;
        },
      })
    );

    handler(
      { type: 'effect-started', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    handler(
      { type: 'effect-canceled', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    expect(effectCanceled).toBe(true);
  });

  test('ignores non-effect events', async () => {
    type State = { value: number };
    const mockMoorex = {
      dispatch: () => {},
      subscribe: () => () => {},
      getState: () => ({ value: 1 } as State),
    } as Moorex<State, TestSignal, TestEffect>;

    let effectStarted = false;

    const handler = createEffectRunner<State, TestSignal, TestEffect>(
      (effect, state, key) => ({
        start: async () => {
          effectStarted = true;
        },
        cancel: () => {},
      })
    );

    // 发送非 effect 事件
    handler(
      { type: 'signal-received', signal: 'start' } as MoorexEvent<State, TestSignal, TestEffect>,
      mockMoorex
    );

    handler(
      { type: 'state-updated', state: { value: 1 } } as MoorexEvent<
        State,
        TestSignal,
        TestEffect
      >,
      mockMoorex
    );

    await nextTick();

    expect(effectStarted).toBe(false);
  });

  test('provides guarded dispatch to effect', async () => {
    type State = { value: number };
    let dispatchCalled = false;
    const mockMoorex = {
      dispatch: () => {
        dispatchCalled = true;
      },
      subscribe: () => () => {},
      getState: () => ({ value: 1 } as State),
    } as Moorex<State, TestSignal, TestEffect>;

    const deferred = createDeferred();

    const handler = createEffectRunner<State, TestSignal, TestEffect>(
      (effect, state, key) => ({
        start: async (dispatch) => {
          dispatch('increment');
          await deferred.promise;
        },
        cancel: () => {},
      })
    );

    handler(
      { type: 'effect-started', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    await nextTick();

    expect(dispatchCalled).toBe(true);

    deferred.resolve();
  });

  test('guarded dispatch is blocked after effect is canceled', async () => {
    type State = { value: number };
    let dispatchCount = 0;
    const mockMoorex = {
      dispatch: () => {
        dispatchCount++;
      },
      subscribe: () => () => {},
      getState: () => ({ value: 1 } as State),
    } as Moorex<State, TestSignal, TestEffect>;

    let capturedDispatch: ((signal: TestSignal) => void) | undefined;

    const handler = createEffectRunner<State, TestSignal, TestEffect>(
      (effect, state, key) => ({
        start: async (dispatch) => {
          capturedDispatch = dispatch;
          dispatch('increment'); // 第一次 dispatch
          return new Promise(() => {}); // 永不完成
        },
        cancel: () => {},
      })
    );

    handler(
      { type: 'effect-started', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    await nextTick();
    expect(dispatchCount).toBe(1);

    // 取消 effect
    handler(
      { type: 'effect-canceled', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    // 尝试再次 dispatch，应该被阻止
    if (capturedDispatch) {
      capturedDispatch('increment');
    }

    expect(dispatchCount).toBe(1); // 仍然是 1，没有增加
  });

  test('calls onError when effect start throws', async () => {
    type State = { value: number };
    const mockMoorex = {
      dispatch: () => {},
      subscribe: () => () => {},
      getState: () => ({ value: 1 } as State),
    } as Moorex<State, TestSignal, TestEffect>;

    const testError = new Error('start error');
    let caughtError: any;

    const handler = createEffectRunner<State, TestSignal, TestEffect>(
      (effect, state, key) => ({
        start: async () => {
          throw testError;
        },
        cancel: () => {},
      }),
      (effect, error) => {
        caughtError = error;
      }
    );

    handler(
      { type: 'effect-started', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    await nextTick();

    expect(caughtError).toBe(testError);
  });

  test('calls onError when runEffect throws synchronously', async () => {
    type State = { value: number };
    const mockMoorex = {
      dispatch: () => {},
      subscribe: () => () => {},
      getState: () => ({ value: 1 } as State),
    } as Moorex<State, TestSignal, TestEffect>;

    const testError = new Error('runEffect error');
    let caughtError: any;

    const handler = createEffectRunner<State, TestSignal, TestEffect>(
      (effect, state, key) => {
        throw testError;
      },
      (effect, error) => {
        caughtError = error;
      }
    );

    handler(
      { type: 'effect-started', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    await nextTick();

    expect(caughtError).toBe(testError);
  });

  test('calls onError when cancel throws', async () => {
    type State = { value: number };
    const mockMoorex = {
      dispatch: () => {},
      subscribe: () => () => {},
      getState: () => ({ value: 1 } as State),
    } as Moorex<State, TestSignal, TestEffect>;

    const testError = new Error('cancel error');
    let caughtError: any;

    const handler = createEffectRunner<State, TestSignal, TestEffect>(
      (effect, state, key) => ({
        start: () => new Promise(() => {}),
        cancel: () => {
          throw testError;
        },
      }),
      (effect, error) => {
        caughtError = error;
      }
    );

    handler(
      { type: 'effect-started', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    handler(
      { type: 'effect-canceled', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    expect(caughtError).toBe(testError);
  });

  test('handles effect start error without onError callback', async () => {
    type State = { value: number };
    const mockMoorex = {
      dispatch: () => {},
      subscribe: () => () => {},
      getState: () => ({ value: 1 } as State),
    } as Moorex<State, TestSignal, TestEffect>;

    const handler = createEffectRunner<State, TestSignal, TestEffect>(
      (effect, state, key) => ({
        start: async () => {
          throw new Error('test error');
        },
        cancel: () => {},
      })
    );

    // 不应该抛出未捕获的错误
    handler(
      { type: 'effect-started', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    await nextTick();
  });

  test('handles runEffect throwing without onError callback', async () => {
    type State = { value: number };
    const mockMoorex = {
      dispatch: () => {},
      subscribe: () => () => {},
      getState: () => ({ value: 1 } as State),
    } as Moorex<State, TestSignal, TestEffect>;

    const handler = createEffectRunner<State, TestSignal, TestEffect>(
      (effect, state, key) => {
        throw new Error('runEffect error');
      }
    );

    // 不应该抛出未捕获的错误
    handler(
      { type: 'effect-started', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    await nextTick();
  });

  test('handles cancel throwing without onError callback', async () => {
    type State = { value: number };
    const mockMoorex = {
      dispatch: () => {},
      subscribe: () => () => {},
      getState: () => ({ value: 1 } as State),
    } as Moorex<State, TestSignal, TestEffect>;

    const handler = createEffectRunner<State, TestSignal, TestEffect>(
      (effect, state, key) => ({
        start: () => new Promise(() => {}),
        cancel: () => {
          throw new Error('cancel error');
        },
      })
    );

    handler(
      { type: 'effect-started', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    // 不应该抛出未捕获的错误
    handler(
      { type: 'effect-canceled', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );
  });

  test('handles effect completion after being canceled', async () => {
    type State = { value: number };
    const mockMoorex = {
      dispatch: () => {},
      subscribe: () => () => {},
      getState: () => ({ value: 1 } as State),
    } as Moorex<State, TestSignal, TestEffect>;

    const deferred = createDeferred();
    let errorCaught: any;

    const handler = createEffectRunner<State, TestSignal, TestEffect>(
      (effect, state, key) => ({
        start: async () => {
          await deferred.promise;
        },
        cancel: () => {},
      }),
      (effect, error) => {
        errorCaught = error;
      }
    );

    // 启动 effect
    handler(
      { type: 'effect-started', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    // 取消 effect（从 running 中删除）
    handler(
      { type: 'effect-canceled', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    // 现在让 effect 完成（应该检测到已被取消，不做删除操作）
    deferred.resolve();
    await deferred.promise;
    await nextTick();

    // 不应该有错误
    expect(errorCaught).toBeUndefined();
  });

  test('handles effect failure after being canceled', async () => {
    type State = { value: number };
    const mockMoorex = {
      dispatch: () => {},
      subscribe: () => () => {},
      getState: () => ({ value: 1 } as State),
    } as Moorex<State, TestSignal, TestEffect>;

    const deferred = createDeferred();
    let errorCaught: any;

    const handler = createEffectRunner<State, TestSignal, TestEffect>(
      (effect, state, key) => ({
        start: async () => {
          await deferred.promise;
        },
        cancel: () => {},
      }),
      (effect, error) => {
        errorCaught = error;
      }
    );

    // 启动 effect
    handler(
      { type: 'effect-started', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    // 取消 effect
    handler(
      { type: 'effect-canceled', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    // 让 effect 失败（应该检测到已被取消，不做删除操作）
    const testError = new Error('test error');
    deferred.reject(testError);
    await deferred.promise.catch(() => {});
    await nextTick();

    // 错误应该被捕获
    expect(errorCaught).toBe(testError);
  });

  test('handles canceling non-existent effect', async () => {
    type State = { value: number };
    const mockMoorex = {
      dispatch: () => {},
      subscribe: () => () => {},
      getState: () => ({ value: 1 } as State),
    } as Moorex<State, TestSignal, TestEffect>;

    let errorCaught: any;

    const handler = createEffectRunner<State, TestSignal, TestEffect>(
      (effect, state, key) => ({
        start: () => Promise.resolve(),
        cancel: () => {},
      }),
      (effect, error) => {
        errorCaught = error;
      }
    );

    // 直接取消一个不存在的 effect（防御性检查）
    handler(
      { type: 'effect-canceled', effect: { id: 'task', action: 'work' }, key: 'task' },
      mockMoorex
    );

    await nextTick();

    // 不应该有错误
    expect(errorCaught).toBeUndefined();
  });
});
