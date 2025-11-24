import { describe, expect, test } from 'vitest';
import { createMoorex, createEffectRunner, type MoorexDefinition } from '../src/index';

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

describe('moorex with effect-runner integration', () => {
  test('executes effect when effect-started event is emitted', async () => {
    type State = { running: boolean };

    let effectExecuted = false;
    const definition: MoorexDefinition<State, TestSignal, TestEffect> = {
      initiate: () => ({ running: false }),
      transition: (signal) => (state) =>
        signal === 'start' ? { running: true } : state,
      effectsAt: (state): Record<string, TestEffect> =>
        state.running ? { task: { id: 'task', action: 'run' } } : {},
    };

    const moorex = createMoorex(definition);

    moorex.subscribe(
      createEffectRunner((effect, state, key) => ({
        start: async () => {
          effectExecuted = true;
        },
        cancel: () => {},
      }))
    );

    await nextTick();
    expect(effectExecuted).toBe(false);

    moorex.dispatch('start');
    await nextTick();

    expect(effectExecuted).toBe(true);
  });

  test('cancels effect when effect-canceled event is emitted', async () => {
    type State = { active: boolean };

    let cancelCalled = false;
    const definition: MoorexDefinition<State, TestSignal, TestEffect> = {
      initiate: () => ({ active: true }),
      transition: (signal) => (state) =>
        signal === 'stop' ? { active: false } : state,
      effectsAt: (state): Record<string, TestEffect> =>
        state.active ? { task: { id: 'task', action: 'work' } } : {},
    };

    const moorex = createMoorex(definition);

    moorex.subscribe(
      createEffectRunner((effect, state, key) => ({
        start: () => new Promise(() => {}), // 永不完成
        cancel: () => {
          cancelCalled = true;
        },
      }))
    );

    await nextTick();
    expect(cancelCalled).toBe(false);

    moorex.dispatch('stop');
    await nextTick();

    expect(cancelCalled).toBe(true);
  });

  test('effect can dispatch signals', async () => {
    type State = { count: number };

    const definition: MoorexDefinition<State, TestSignal, TestEffect> = {
      initiate: () => ({ count: 0 }),
      transition: (signal) => (state) =>
        signal === 'increment' ? { count: state.count + 1 } : state,
      effectsAt: (state): Record<string, TestEffect> =>
        state.count === 0 ? { incrementer: { id: 'inc', action: 'increment' } } : {},
    };

    const moorex = createMoorex(definition);
    const deferred = createDeferred();

    moorex.subscribe(
      createEffectRunner((effect, state, key) => ({
        start: async (dispatch) => {
          dispatch('increment');
          deferred.resolve();
          await deferred.promise;
        },
        cancel: () => {},
      }))
    );

    await nextTick();
    await nextTick();

    expect(moorex.getState().count).toBe(1);
  });

  test('guards dispatch from canceled effects', async () => {
    type State = { active: boolean; count: number };

    let capturedDispatch: ((signal: TestSignal) => void) | undefined;

    const definition: MoorexDefinition<State, TestSignal, TestEffect> = {
      initiate: () => ({ active: true, count: 0 }),
      transition: (signal) => (state) => {
        if (signal === 'stop') return { ...state, active: false };
        if (signal === 'increment') return { ...state, count: state.count + 1 };
        return state;
      },
      effectsAt: (state): Record<string, TestEffect> =>
        state.active ? { task: { id: 'task', action: 'work' } } : {},
    };

    const moorex = createMoorex(definition);

    moorex.subscribe(
      createEffectRunner((effect, state, key) => ({
        start: (dispatch) => {
          capturedDispatch = dispatch;
          return new Promise(() => {}); // 永不完成
        },
        cancel: () => {
          // 在取消后尝试 dispatch
          queueMicrotask(() => {
            if (capturedDispatch) {
              capturedDispatch('increment');
            }
          });
        },
      }))
    );

    await nextTick();

    moorex.dispatch('stop');
    await nextTick();
    await nextTick();

    // dispatch 应该被忽略，因为 effect 已经被取消
    expect(moorex.getState().count).toBe(0);
  });

  test('handles effect completion', async () => {
    type State = { shouldRun: boolean };

    let completed = false;
    const deferred = createDeferred();

    const definition: MoorexDefinition<State, TestSignal, TestEffect> = {
      initiate: () => ({ shouldRun: true }),
      transition: () => (state) => state,
      effectsAt: (state): Record<string, TestEffect> =>
        state.shouldRun ? { task: { id: 'task', action: 'complete' } } : {},
    };

    const moorex = createMoorex(definition);

    moorex.subscribe(
      createEffectRunner((effect, state, key) => ({
        start: async () => {
          await deferred.promise;
          completed = true;
        },
        cancel: () => {},
      }))
    );

    await nextTick();
    expect(completed).toBe(false);

    deferred.resolve();
    await deferred.promise;
    await nextTick();

    expect(completed).toBe(true);
  });

  test('handles multiple effects independently', async () => {
    type State = { stage: 'init' | 'multi' | 'done' };

    const executedEffects: string[] = [];
    const canceledEffects: string[] = [];

    const definition: MoorexDefinition<State, TestSignal, TestEffect> = {
      initiate: () => ({ stage: 'init' }),
      transition: (signal) => (state) => {
        if (signal === 'start') return { stage: 'multi' as const };
        if (signal === 'stop') return { stage: 'done' as const };
        return state;
      },
      effectsAt: (state): Record<string, TestEffect> => {
        if (state.stage === 'multi') {
          return {
            effect1: { id: 'e1', action: 'work1' },
            effect2: { id: 'e2', action: 'work2' },
            effect3: { id: 'e3', action: 'work3' },
          };
        }
        return {};
      },
    };

    const moorex = createMoorex(definition);

    moorex.subscribe(
      createEffectRunner((effect, state, key) => ({
        start: () => {
          executedEffects.push(effect.id);
          return new Promise(() => {});
        },
        cancel: () => {
          canceledEffects.push(effect.id);
        },
      }))
    );

    await nextTick();

    moorex.dispatch('start');
    await nextTick();

    expect(executedEffects).toHaveLength(3);
    expect(executedEffects).toContain('e1');
    expect(executedEffects).toContain('e2');
    expect(executedEffects).toContain('e3');

    moorex.dispatch('stop');
    await nextTick();

    expect(canceledEffects).toHaveLength(3);
    expect(canceledEffects).toContain('e1');
    expect(canceledEffects).toContain('e2');
    expect(canceledEffects).toContain('e3');
  });

  test('effect receives correct state snapshot', async () => {
    type State = { value: number };

    let receivedState: State | undefined;

    const definition: MoorexDefinition<State, TestSignal, TestEffect> = {
      initiate: () => ({ value: 0 }),
      transition: (signal) => (state) =>
        signal === 'increment' ? { value: state.value + 1 } : state,
      effectsAt: (state): Record<string, TestEffect> =>
        state.value > 0 ? { task: { id: 'task', action: 'read' } } : {},
    };

    const moorex = createMoorex(definition);

    moorex.subscribe(
      createEffectRunner((effect, state, key) => {
        receivedState = state;
        return {
          start: () => Promise.resolve(),
          cancel: () => {},
        };
      })
    );

    await nextTick();

    moorex.dispatch('increment');
    await nextTick();

    expect(receivedState).toBeDefined();
    expect(receivedState?.value).toBe(1);
  });

  test('multiple effect runners can subscribe independently', async () => {
    type State = { active: boolean };

    let runner1Called = false;
    let runner2Called = false;

    const definition: MoorexDefinition<State, TestSignal, TestEffect> = {
      initiate: () => ({ active: false }),
      transition: (signal) => (state) =>
        signal === 'start' ? { active: true } : state,
      effectsAt: (state): Record<string, TestEffect> =>
        state.active ? { task: { id: 'task', action: 'work' } } : {},
    };

    const moorex = createMoorex(definition);

    moorex.subscribe(
      createEffectRunner((effect, state, key) => ({
        start: () => {
          runner1Called = true;
          return Promise.resolve();
        },
        cancel: () => {},
      }))
    );

    moorex.subscribe(
      createEffectRunner((effect, state, key) => ({
        start: () => {
          runner2Called = true;
          return Promise.resolve();
        },
        cancel: () => {},
      }))
    );

    await nextTick();

    moorex.dispatch('start');
    await nextTick();

    expect(runner1Called).toBe(true);
    expect(runner2Called).toBe(true);
  });

  test('can unsubscribe effect runner', async () => {
    type State = { active: boolean };

    let effectExecuted = false;

    const definition: MoorexDefinition<State, TestSignal, TestEffect> = {
      initiate: () => ({ active: false }),
      transition: (signal) => (state) =>
        signal === 'start' ? { active: true } : state,
      effectsAt: (state): Record<string, TestEffect> =>
        state.active ? { task: { id: 'task', action: 'work' } } : {},
    };

    const moorex = createMoorex(definition);

    const unsubscribe = moorex.subscribe(
      createEffectRunner((effect, state, key) => ({
        start: () => {
          effectExecuted = true;
          return Promise.resolve();
        },
        cancel: () => {},
      }))
    );

    await nextTick();

    unsubscribe();

    moorex.dispatch('start');
    await nextTick();

    expect(effectExecuted).toBe(false);
  });
});
