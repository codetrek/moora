# Moorex for LLM-Driven Agents

## Name

moorex

## Description

Moorex is an asynchronous Moore machine runtime that keeps agent state and side
effects in sync. It is designed for persistent AI agents that must survive
crashes, restarts, or migrations while resuming pending LLM interactions and
tool executions safely.

## Usage

```typescript
import { createMoorex, type MoorexDefinition } from '@moora/moorex';
import { create } from 'mutative';
```

> **Important**: All data types (State, Input, Effect) in Moorex should be
> **read-only/immutable**. We strongly recommend using
> mutative's `create()` function for immutable state updates.

> Prepare the agent definition: describe state transitions and desired effects.
> All function parameters and return values should be treated as immutable.

## Two-Phase Side Effect Design

Moorex uses a **two-phase side effect design** for state machine handlers:

1. **Phase 1 (Synchronous)**: When an output is produced, `handler(output)` executes
   **synchronously** and immediately, returning an asynchronous side effect (Procedure).

2. **Phase 2 (Asynchronous)**: The Procedure function is executed **asynchronously** via
   `queueMicrotask`, receiving a `dispatch` method that can asynchronously produce new
   inputs to the state machine.

This design ensures:
- The synchronous part of the handler can immediately process the output (e.g., logging,
  updating UI)
- Asynchronous side effects execute in the microtask queue without blocking the current
  execution stack
- Asynchronous side effects can produce new inputs via `dispatch`, forming feedback loops

```typescript
const definition: MoorexDefinition<Input, Effect, State> = {
  initial: () => initialState,
  transition: (input) => (state) => reduceState(state, input),
  effectsAt: (state) => decideEffects(state),
  runEffect: (effect, state, key) => ({
    start: async (dispatch) => { /* execute effect */ },
    cancel: () => { /* cancel effect */ },
  }),
};
```

> Spin up the Moorex agent, subscribe to events, and dispatch the first user message.

```typescript
const agent = createMoorex(definition);

agent.subscribe((event) => {
  console.log(event);
});

agent.dispatch({ type: 'user', message: 'Summarize the latest log entries.' });
```

### Key Types

```typescript
// Machine definition
type MoorexDefinition<Input, Effect, State> = {
  initial: () => State;
  transition: (input: Input) => (state: State) => State;
  effectsAt: (state: State) => Record<string, Effect>;
  runEffect: (effect: Effect, state: State, key: string) => EffectController<Input>;
};

// Machine instance
type Moorex<Input, Effect, State> = {
  dispatch(input: Input): void;
  current(): State;
  subscribe(handler: (event: MoorexEvent<Input, Effect, State>) => void): CancelFn;
};

// Events
type MoorexEvent<Input, Effect, State> =
  | { type: 'input-received'; input: Input }
  | { type: 'state-updated'; state: State }
  | { type: 'effect-started'; effect: Effect }
  | { type: 'effect-completed'; effect: Effect }
  | { type: 'effect-canceled'; effect: Effect }
  | { type: 'effect-failed'; effect: Effect; error: unknown };

// Effect controller
type EffectController<Input> = {
  start: (dispatch: (input: Input) => void) => Promise<void>;
  cancel: () => void;
};

// Cancel function
type CancelFn = () => void;
```

### Definition Parameters

All parameters and return values should be treated as **immutable** (read-only) types. Use
mutative's `create()` for immutable updates:

- `initial()`: function that returns the initial state (can hydrate from
  persistent storage). Return value should be immutable.
- `transition(input)(state)`: pure reducer that applies an incoming input to
  produce the next state. Both `input` and `state` should be treated as immutable; return a new
  immutable state. Use `create(state, (draft) => { ... })` for updates.
- `effectsAt(state)`: returns a Record of effects implied by the state (keys
  serve as effect identifiers). `state` should be treated as immutable; return immutable effect
  objects.
- `runEffect(effect, state, key)`: creates an effect controller with `start` and `cancel` methods.
  Receives the effect (immutable), the current state (immutable), and the effect's key (string).

### State Machine Handlers (Two-Phase Side Effect Design)

State machines (`machine`, `mealy`, `moore`) use a two-phase side effect design for handlers:

```typescript
import { machine } from '@moora/moorex';

const sm = machine(
  { initial: () => 0, transition: (n) => (s) => s + n },
  ({ state }) => ({ value: state })
);

// Handler executes in two phases:
sm.subscribe((output) => {
  // Phase 1 (Synchronous): Execute immediately when output is produced
  console.log('Sync:', output);
  
  // Return Procedure (Phase 2: Asynchronous)
  return (dispatch) => {
    // Phase 2 (Asynchronous): Execute in microtask queue
    // Can use dispatch to produce new inputs
    if (output.value < 10) {
      dispatch(1);
    }
  };
});
```

**Timing considerations**:
- Phase 1 (handler execution) is **synchronous** and happens immediately
- Phase 2 (Procedure execution) is **asynchronous** and happens in the microtask queue
- The Procedure receives a `dispatch` method to produce new inputs asynchronously

### Running Effects

The `runEffect` function is part of the `MoorexDefinition` and is called automatically by Moorex
when effects need to be started:

```typescript
const definition: MoorexDefinition<Input, Effect, State> = {
  // ... other properties
  runEffect: (effect, state, key) => {
    if (effect.kind === 'call-llm') {
      return {
        start: async (dispatch) => {
          // Execute the effect
          // Use dispatch to send inputs back to the machine
        },
        cancel: () => {
          // Cancel the effect if needed
        },
      };
    }
    // Handle other effect kinds...
  },
};
```

The `runEffect` function receives:
- `effect`: The effect to run (should be treated as immutable)
- `state`: The **current state** of the machine (should be treated as immutable, obtained via `moorex.current()`)
- `key`: The effect's key from the Record returned by `effectsAt`

All parameters should be treated as immutable (except `key` which is a string).
