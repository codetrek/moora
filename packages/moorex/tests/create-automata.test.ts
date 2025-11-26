import { describe, expect, test } from 'vitest';
import { createAutomata } from '../src/create-automata';
import type { AutomataDefinition } from '../src/types';

const nextTick = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('createAutomata', () => {
  test('creates automata with initial state', () => {
    const definition: AutomataDefinition<{ count: number }, never> = {
      initialState: () => ({ count: 0 }),
      transition: () => (state) => state,
    };

    const automata = createAutomata(definition);

    expect(automata.getState()).toEqual({ count: 0 });
  });

  test('dispatches signal and updates state', async () => {
    type State = { count: number };
    type Signal = { type: 'increment' } | { type: 'decrement' };

    const definition: AutomataDefinition<State, Signal> = {
      initialState: () => ({ count: 0 }),
      transition: (signal) => (state) => {
        if (signal.type === 'increment') {
          return { count: state.count + 1 };
        }
        return { count: state.count - 1 };
      },
    };

    const automata = createAutomata(definition);

    expect(automata.getState()).toEqual({ count: 0 });

    automata.dispatch({ type: 'increment' });
    await nextTick();
    expect(automata.getState()).toEqual({ count: 1 });

    automata.dispatch({ type: 'increment' });
    await nextTick();
    expect(automata.getState()).toEqual({ count: 2 });

    automata.dispatch({ type: 'decrement' });
    await nextTick();
    expect(automata.getState()).toEqual({ count: 1 });
  });

  test('batches multiple signals in same microtask', async () => {
    type State = { count: number };
    type Signal = { type: 'increment' };

    const definition: AutomataDefinition<State, Signal> = {
      initialState: () => ({ count: 0 }),
      transition: (signal) => (state) => ({ count: state.count + 1 }),
    };

    const automata = createAutomata(definition);

    automata.dispatch({ type: 'increment' });
    automata.dispatch({ type: 'increment' });
    automata.dispatch({ type: 'increment' });

    // 在微任务处理前，状态应该还是初始值
    expect(automata.getState()).toEqual({ count: 0 });

    await nextTick();
    // 所有信号应该被批量处理
    expect(automata.getState()).toEqual({ count: 3 });
  });

  test('subscribe receives signal and state updates', async () => {
    type State = { count: number };
    type Signal = { type: 'increment' };

    const definition: AutomataDefinition<State, Signal> = {
      initialState: () => ({ count: 0 }),
      transition: (signal) => (state) => ({ count: state.count + 1 }),
    };

    const automata = createAutomata(definition);
    const updates: Array<{ signal: Signal; state: State }> = [];

    const unsubscribe = automata.subscribe(({ signal, state }) => {
      updates.push({ signal, state });
    });

    automata.dispatch({ type: 'increment' });
    await nextTick();
    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual({
      signal: { type: 'increment' },
      state: { count: 1 },
    });

    automata.dispatch({ type: 'increment' });
    await nextTick();
    expect(updates).toHaveLength(2);
    expect(updates[1]).toEqual({
      signal: { type: 'increment' },
      state: { count: 2 },
    });

    unsubscribe();
    
    automata.dispatch({ type: 'increment' });
    await nextTick();
    // 取消订阅后不应该收到更新
    expect(updates).toHaveLength(2);
  });

  test('subscribe receives updates with different signal types', async () => {
    type State = { count: number };
    type Signal = { type: 'increment'; amount?: number };

    const definition: AutomataDefinition<State, Signal> = {
      initialState: () => ({ count: 0 }),
      transition: (signal) => (state) => ({
        count: state.count + (signal.amount || 1),
      }),
    };

    const automata = createAutomata(definition);
    const updates: Array<{ signal: Signal; state: State }> = [];

    const unsubscribe = automata.subscribe(({ signal, state }) => {
      updates.push({ signal, state });
    });

    automata.dispatch({ type: 'increment', amount: 5 });
    await nextTick();
    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual({
      signal: { type: 'increment', amount: 5 },
      state: { count: 5 },
    });

    automata.dispatch({ type: 'increment', amount: 3 });
    await nextTick();
    expect(updates).toHaveLength(2);
    expect(updates[1]).toEqual({
      signal: { type: 'increment', amount: 3 },
      state: { count: 8 },
    });

    unsubscribe();
  });

  test('multiple subscribers work independently', async () => {
    type State = { count: number };
    type Signal = { type: 'increment' };

    const definition: AutomataDefinition<State, Signal> = {
      initialState: () => ({ count: 0 }),
      transition: (signal) => (state) => ({ count: state.count + 1 }),
    };

    const automata = createAutomata(definition);
    const updates1: Array<{ signal: Signal; state: State }> = [];
    const updates2: Array<{ signal: Signal; state: State }> = [];

    const unsubscribe1 = automata.subscribe(({ signal, state }) => {
      updates1.push({ signal, state });
    });

    const unsubscribe2 = automata.subscribe(({ signal, state }) => {
      updates2.push({ signal, state });
    });

    automata.dispatch({ type: 'increment' });
    await nextTick();

    expect(updates1).toHaveLength(1);
    expect(updates1[0]).toEqual({
      signal: { type: 'increment' },
      state: { count: 1 },
    });

    expect(updates2).toHaveLength(1);
    expect(updates2[0]).toEqual({
      signal: { type: 'increment' },
      state: { count: 1 },
    });

    unsubscribe1();
    
    automata.dispatch({ type: 'increment' });
    await nextTick();

    // unsubscribe1 取消后不应该收到更新
    expect(updates1).toHaveLength(1);
    // unsubscribe2 仍然应该收到更新
    expect(updates2).toHaveLength(2);
    expect(updates2[1]).toEqual({
      signal: { type: 'increment' },
      state: { count: 2 },
    });

    unsubscribe2();
  });

  test('handles complex state transitions', async () => {
    type State = {
      items: string[];
      total: number;
    };
    type Signal =
      | { type: 'add'; item: string }
      | { type: 'remove'; index: number }
      | { type: 'clear' };

    const definition: AutomataDefinition<State, Signal> = {
      initialState: () => ({ items: [], total: 0 }),
      transition: (signal) => (state) => {
        if (signal.type === 'add') {
          return {
            items: [...state.items, signal.item],
            total: state.total + 1,
          };
        }
        if (signal.type === 'remove') {
          const newItems = state.items.filter((_, i) => i !== signal.index);
          return {
            items: newItems,
            total: newItems.length,
          };
        }
        if (signal.type === 'clear') {
          return { items: [], total: 0 };
        }
        return state;
      },
    };

    const automata = createAutomata(definition);

    expect(automata.getState()).toEqual({ items: [], total: 0 });

    automata.dispatch({ type: 'add', item: 'a' });
    automata.dispatch({ type: 'add', item: 'b' });
    automata.dispatch({ type: 'add', item: 'c' });
    await nextTick();

    expect(automata.getState()).toEqual({
      items: ['a', 'b', 'c'],
      total: 3,
    });

    automata.dispatch({ type: 'remove', index: 1 });
    await nextTick();

    expect(automata.getState()).toEqual({
      items: ['a', 'c'],
      total: 2,
    });

    automata.dispatch({ type: 'clear' });
    await nextTick();

    expect(automata.getState()).toEqual({ items: [], total: 0 });
  });

  test('getState returns current state synchronously', () => {
    type State = { count: number };
    type Signal = { type: 'increment' };

    const definition: AutomataDefinition<State, Signal> = {
      initialState: () => ({ count: 0 }),
      transition: (signal) => (state) => ({ count: state.count + 1 }),
    };

    const automata = createAutomata(definition);

    expect(automata.getState()).toEqual({ count: 0 });

    automata.dispatch({ type: 'increment' });
    // 在微任务处理前，getState 应该返回当前状态（还未更新）
    expect(automata.getState()).toEqual({ count: 0 });
  });

  test('handles rapid successive dispatches', async () => {
    type State = { count: number };
    type Signal = { type: 'increment' };

    const definition: AutomataDefinition<State, Signal> = {
      initialState: () => ({ count: 0 }),
      transition: (signal) => (state) => ({ count: state.count + 1 }),
    };

    const automata = createAutomata(definition);

    for (let i = 0; i < 10; i++) {
      automata.dispatch({ type: 'increment' });
    }

    await nextTick();
    expect(automata.getState()).toEqual({ count: 10 });
  });
});

