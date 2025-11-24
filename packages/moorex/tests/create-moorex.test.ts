import { describe, expect, test } from 'vitest';
import { createMoorex, type MoorexDefinition, type MoorexEvent } from '../src/index';

type NumberSignal = 'noop' | 'toggle' | 'increment';
type NumberEffect = { key: string; label: string };

const nextTick = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe('createMoorex', () => {
  test('emits effect-started event for initial effects', async () => {
    type State = { active: boolean };

    const definition: MoorexDefinition<State, NumberSignal, NumberEffect> = {
      initiate: () => ({ active: true }),
      transition: () => (state) => state,
      effectsAt: () => ({ alpha: { key: 'alpha', label: 'initial' } }),
    };

    const moorex = createMoorex(definition);
    const events: MoorexEvent<State, NumberSignal, NumberEffect>[] = [];
    
    moorex.subscribe((event) => events.push(event));

    await nextTick();

    const startedEvent = events.find((e) => e.type === 'effect-started');
    expect(startedEvent).toBeDefined();
    if (startedEvent && startedEvent.type === 'effect-started') {
      expect(startedEvent.effect.key).toBe('alpha');
      expect(startedEvent.key).toBe('alpha');
    }
  });

  test('emits effect-canceled event when effects are no longer needed', async () => {
    type State = { active: boolean };

    const definition: MoorexDefinition<State, NumberSignal, NumberEffect> = {
      initiate: () => ({ active: true }),
      transition: (signal) => (state) =>
        signal === 'toggle' ? { active: !state.active } : state,
      effectsAt: (state): Record<string, NumberEffect> => 
        (state.active ? { alpha: { key: 'alpha', label: 'active' } } : {}),
    };

    const moorex = createMoorex(definition);
    const events: MoorexEvent<State, NumberSignal, NumberEffect>[] = [];
    moorex.subscribe((event) => events.push(event));

    await nextTick();

    moorex.dispatch('toggle');
    await nextTick();

    const cancelEvent = events.find((event) => event.type === 'effect-canceled');
    expect(cancelEvent).toBeDefined();
    if (cancelEvent && cancelEvent.type === 'effect-canceled') {
      expect(cancelEvent.effect.key).toBe('alpha');
      expect(cancelEvent.key).toBe('alpha');
    }

    const stateUpdated = events.find(
      (event): event is Extract<typeof event, { type: 'state-updated' }> =>
        event.type === 'state-updated',
    );
    expect(stateUpdated?.state.active).toBe(false);
  });

  test('emits signal-received and state-updated events', async () => {
    type State = { count: number };

    const definition: MoorexDefinition<State, NumberSignal, NumberEffect> = {
      initiate: () => ({ count: 0 }),
      transition: (signal) => (state) =>
        signal === 'increment' ? { count: state.count + 1 } : state,
      effectsAt: () => ({}),
    };

    const moorex = createMoorex(definition);
    const events: MoorexEvent<State, NumberSignal, NumberEffect>[] = [];
    moorex.subscribe((event) => events.push(event));

    moorex.dispatch('increment');
    await nextTick();

    const signalEvent = events.find(
      (event): event is Extract<typeof event, { type: 'signal-received' }> =>
        event.type === 'signal-received',
    );
    expect(signalEvent?.signal).toBe('increment');

    const stateEvent = events.find(
      (event): event is Extract<typeof event, { type: 'state-updated' }> =>
        event.type === 'state-updated',
    );
    expect(stateEvent?.state.count).toBe(1);
  });

  test('allows unsubscribing event handlers', async () => {
    type State = { count: number };

    const definition: MoorexDefinition<State, NumberSignal, NumberEffect> = {
      initiate: () => ({ count: 0 }),
      transition: (signal) => (state) =>
        signal === 'increment' ? { count: state.count + 1 } : state,
      effectsAt: () => ({}),
    };

    const moorex = createMoorex(definition);
    const events: MoorexEvent<State, NumberSignal, NumberEffect>[] = [];
    const unsubscribe = moorex.subscribe((event) => events.push(event));

    unsubscribe();
    moorex.dispatch('increment');
    await nextTick();

    expect(events).toHaveLength(0);
  });

  test('emits events for multiple effects', async () => {
    type State = { stage: 'init' | 'running' | 'done' };

    const definition: MoorexDefinition<State, NumberSignal, NumberEffect> = {
      initiate: () => ({ stage: 'init' }),
      transition: (signal) => (state) =>
        signal === 'toggle' ? { stage: state.stage === 'init' ? 'running' : 'done' } : state,
      effectsAt: (state): Record<string, NumberEffect> => {
        if (state.stage === 'running') {
          return {
            effect1: { key: 'effect1', label: 'first' },
            effect2: { key: 'effect2', label: 'second' },
          };
        }
        return {};
      },
    };

    const moorex = createMoorex(definition);
    const events: MoorexEvent<State, NumberSignal, NumberEffect>[] = [];
    moorex.subscribe((event) => events.push(event));

    moorex.dispatch('toggle');
    await nextTick();

    const startedEvents = events.filter((e) => e.type === 'effect-started');
    expect(startedEvents).toHaveLength(2);
    
    const effectKeys = startedEvents.map((e) => e.type === 'effect-started' && e.effect.key);
    expect(effectKeys).toContain('effect1');
    expect(effectKeys).toContain('effect2');
  });

  test('getState returns current state', () => {
    type State = { count: number };

    const definition: MoorexDefinition<State, NumberSignal, NumberEffect> = {
      initiate: () => ({ count: 0 }),
      transition: (signal) => (state) =>
        signal === 'increment' ? { count: state.count + 1 } : state,
      effectsAt: () => ({}),
    };

    const moorex = createMoorex(definition);
    expect(moorex.getState().count).toBe(0);

    moorex.dispatch('increment');
    // 状态更新是异步的
    expect(moorex.getState().count).toBe(0);
  });

  test('emits effect-canceled for multiple obsolete effects', async () => {
    type State = { stage: 'init' | 'running' | 'done' };

    const definition: MoorexDefinition<State, NumberSignal, NumberEffect> = {
      initiate: () => ({ stage: 'running' }),
      transition: (signal) => (state) =>
        signal === 'toggle' ? { stage: state.stage === 'running' ? 'done' : 'running' } : state,
      effectsAt: (state): Record<string, NumberEffect> => {
        if (state.stage === 'running') {
          return {
            effect1: { key: 'effect1', label: 'first' },
            effect2: { key: 'effect2', label: 'second' },
            effect3: { key: 'effect3', label: 'third' },
          };
        }
        return {};
      },
    };

    const moorex = createMoorex(definition);
    const events: MoorexEvent<State, NumberSignal, NumberEffect>[] = [];
    moorex.subscribe((event) => events.push(event));

    await nextTick();

    moorex.dispatch('toggle');
    await nextTick();

    const canceledEvents = events.filter((event) => event.type === 'effect-canceled');
    expect(canceledEvents).toHaveLength(3);
    
    const canceledKeys = canceledEvents.map((e) => e.type === 'effect-canceled' && e.effect.key).sort();
    expect(canceledKeys).toEqual(['effect1', 'effect2', 'effect3']);
  });

  test('does not emit duplicate effect-started for already active effects', async () => {
    type State = { stage: 'init' | 'running' };

    const definition: MoorexDefinition<State, NumberSignal, NumberEffect> = {
      initiate: () => ({ stage: 'running' }),
      transition: () => (state) => state,
      effectsAt: (): Record<string, NumberEffect> => ({
        alpha: { key: 'alpha', label: 'test' },
      }),
    };

    const moorex = createMoorex(definition);
    const events: MoorexEvent<State, NumberSignal, NumberEffect>[] = [];
    moorex.subscribe((event) => events.push(event));

    await nextTick();
    const initialStartedEvents = events.filter((e) => e.type === 'effect-started');
    expect(initialStartedEvents).toHaveLength(1);

    moorex.dispatch('noop');
    await nextTick();

    const allStartedEvents = events.filter((e) => e.type === 'effect-started');
    expect(allStartedEvents).toHaveLength(1);
  });

  test('dedupes effects with same key', async () => {
    type State = { stage: 'duplicate' | 'done' };

    const definition: MoorexDefinition<State, NumberSignal, NumberEffect> = {
      initiate: () => ({ stage: 'duplicate' }),
      transition: () => (state) => state,
      effectsAt: () => ({
        alpha: { key: 'alpha', label: 'first' },
      }),
    };

    const moorex = createMoorex(definition);
    const events: MoorexEvent<State, NumberSignal, NumberEffect>[] = [];
    moorex.subscribe((event) => events.push(event));

    await nextTick();
    
    const startedEvents = events.filter((e) => e.type === 'effect-started');
    expect(startedEvents).toHaveLength(1);
  });

  test('event handler receives moorex instance as second parameter', async () => {
    type State = { value: number };

    const definition: MoorexDefinition<State, NumberSignal, NumberEffect> = {
      initiate: () => ({ value: 42 }),
      transition: (signal) => (state) =>
        signal === 'increment' ? { value: state.value + 1 } : state,
      effectsAt: () => ({}),
    };

    const moorex = createMoorex(definition);
    
    let receivedMoorex: typeof moorex | undefined;
    moorex.subscribe((event, m) => {
      receivedMoorex = m;
    });

    moorex.dispatch('increment');
    await nextTick();

    expect(receivedMoorex).toBe(moorex);
    expect(receivedMoorex?.getState().value).toBe(43);
  });
});

