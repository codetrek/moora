# Moorex: Persistent Moore Machines for Agents

[![npm version](https://img.shields.io/npm/v/@moora/moorex.svg)](https://www.npmjs.com/package/@moora/moorex)
[![npm downloads](https://img.shields.io/npm/dm/@moora/moorex.svg)](https://www.npmjs.com/package/@moora/moorex)
[![test coverage](https://img.shields.io/codecov/c/github/shazhou-ww/moora?flag=moorex)](https://codecov.io/gh/shazhou-ww/moora)
[![license](https://img.shields.io/npm/l/@moora/moorex.svg)](https://github.com/shazhou-ww/moora/blob/main/packages/moorex/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

<div align="center">
  <img src="./moorex.svg" alt="Moorex Logo" width="200">
</div>

Moorex is a generic asynchronous Moore machine. It keeps track of state, drives
effects strictly from the current state, and reconciles those effects whenever
the state changes. The design originated from building **persistent AI agents**
that must survive crashes, restarts, or migrations while resuming unfinished
work.

## Getting Started

Install Moorex and its peer dependency:

```bash
npm install @moora/moorex mutative
# or
bun add @moora/moorex mutative
# or
yarn add @moora/moorex mutative
```

Import and create your first Moorex machine:

```typescript
import { createMoorex, type MoorexDefinition } from '@moora/moorex';
import { create } from 'mutative';

// Define your types and create the definition
type State = { count: number };
type Input = { type: 'increment' } | { type: 'decrement' };
type Effect = { kind: 'log'; message: string };

const definition: MoorexDefinition<Input, Effect, State> = {
  initial: () => ({ count: 0 }),
  transition: (input) => (state) => {
    if (input.type === 'increment') {
      return create(state, (draft) => { draft.count++; });
    }
    return create(state, (draft) => { draft.count--; });
  },
  effectsAt: (state) => ({
    log: { kind: 'log', message: `Count is ${state.count}` },
  }),
  runEffect: (effect, state, key) => ({
    start: async (dispatch) => {
      console.log(effect.message);
    },
    cancel: () => {},
  }),
};

// Create the machine
const machine = createMoorex(definition);

// Subscribe to events
machine.subscribe((event) => {
  console.log(event);
  // event.type can be: 'input-received', 'state-updated', 'effect-started',
  // 'effect-completed', 'effect-canceled', 'effect-failed'
});

// Dispatch inputs to trigger state transitions
machine.dispatch({ type: 'increment' });

// Get current state
const currentState = machine.current();
```

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

## Defining a Moorex Machine

To create a Moorex machine, you define **three types** and **four functions**:

### Three Types

1. **`Input`**: Input events that trigger state transitions. Examples: user
   messages, tool responses, timer ticks.

2. **`Effect`**: Side effects implied by the state. Examples: LLM API calls,
   tool executions, timeouts. Note: Effect types no longer need a `key`
   property; the Record key from `effectsAt` serves as the identifier.

3. **`State`**: The shape of your machine's internal state. Represents the
   current configuration of your agent or application.

All three types must be **immutable** (read-only). See the [Immutability](#immutability)
section below for details.

### Four Functions

1. **`initial(): State`**: Returns the initial state. Can hydrate
   from persistent storage for recovery.

2. **`transition(input: Input): (state: State) => State`**:
   A pure reducer function. Takes an input and returns a function that transforms
   the current state into the next state. Must not mutate the input state.

3. **`effectsAt(state: State): Record<string, Effect>`**:
   Returns a Record (key-value map) of effects that should be running based on
   the current state. The Record keys serve as stable effect identifiers for
   reconciliation.

4. **`runEffect(effect: Effect, state: State, key: string): EffectController<Input>`**:
   Creates a controller with `start` and `cancel` methods to execute and abort
   each effect. Receives the effect, the state that generated it, and the effect's key.

These four functions form a `MoorexDefinition<Input, Effect, State>`, which you
pass to `createMoorex()` to instantiate the machine.

## Why Moorex for Persistent Agents?

An AI agent often interacts with users and tools while invoking large language
models (LLMs). The agent can crash mid-task, be suspended, or migrate across
nodes. To resume faithfully, we must restore:

- The agent's internal state (messages, pending tool calls, etc.)
- Every in-flight side effect (outstanding LLM invocations, tool executions)

This agent fits the Moore machine model beautifully: **state determines which
effects should be running**.

- **Inputs**: user messages, tool messages, assistant messages.
- **State**: full conversation history, pending outbound messages, pending tool
  calls.
- **Effects**: actions implied by the state, e.g. invoking the LLM, executing a
  tool, or idling when nothing remains.

With Moorex, after rehydrating state we run effect reconciliation and the agent
continues exactly where it left off. No effect can exist without corresponding
state, and removing state automatically cancels redundant effects.

## Immutability

All data types in Moorex (State, Input, Effect) are **read-only/immutable**.
While Moorex doesn't enforce immutability at the type level, it requires
`transition` and `effectsAt` to be **pure functions** — they must not modify
their inputs. The `runEffect` function should also be pure (except that the
returned `start` and `cancel` methods can perform side effects). Immutability
protects against accidental mutations that would violate this constraint and lead
to bugs.

We strongly recommend using [mutative](https://github.com/unadlib/mutative)'s
`create()` function for immutable updates:

```typescript
import { create } from 'mutative';

// In your transition function
transition: (input) => (state) => {
  return create(state, (draft) => {
    draft.messages.push(input);
    // Modify draft as needed - it's safe to mutate here
  });
}

// For simple updates, you can also use spread operators
transition: (input) => (state) => {
  return {
    ...state,
    messages: [...state.messages, input],
  };
}
```

## Example: Persistent Agent Driver

The example below sketches a resilient agent that decides what to do based on
its state.

```typescript
import { createMoorex, type MoorexDefinition } from '@moora/moorex';
import { create } from 'mutative';

// Define your input types - these trigger state transitions
type Input =
  | { type: 'user'; message: string }
  | { type: 'tool'; name: string; result: string }
  | { type: 'assistant'; message: string };

// Define your effect types - these represent side effects to run.
// Note: Effect types no longer need a `key` property; the Record key serves
// as the identifier.
type Effect =
  | { kind: 'call-llm'; prompt: string }
  | { kind: 'call-tool'; id: string; name: string; input: string };

// Define your state shape
type AgentState = {
  messages: Input[];
  pendingMessages: Input[];
  pendingToolCalls: { id: string; name: string; input: string }[];
};

const definition: MoorexDefinition<Input, Effect, AgentState> = {
  // Initialization function that returns the initial state
  initial: () => ({
    messages: [],
    pendingMessages: [],
    pendingToolCalls: [],
  }),

  // Pure state transition function: (input) => (state) => newState.
  // This defines how inputs transform your state.
  transition: (input) => (state) => {
    return create(state, (draft) => {
      draft.messages.push(input);
      // Update pendingMessages and pendingToolCalls based on input type
    });
  },

  // Effect selector: (state) => Record<string, Effect>
  // Returns a Record where keys are effect identifiers and values are effects.
  // Moorex uses these keys to reconcile effects (cancel obsolete, start new)
  effectsAt: (state) => {
    const effects: Record<string, Effect> = {};
    
    // If pendingMessages exist, add LLM call effect
    if (state.pendingMessages.length > 0) {
      const prompt = state.pendingMessages.map(m => m.message).join('\n');
      effects[`llm:${prompt.length}`] = { kind: 'call-llm', prompt };
    }
    
    // If pendingToolCalls exist, add tool execution effects
    for (const toolCall of state.pendingToolCalls) {
      effects[`tool:${toolCall.id}`] = {
        kind: 'call-tool',
        id: toolCall.id,
        name: toolCall.name,
        input: toolCall.input,
      };
    }
    
    return effects;
  },

  // Effect runner: creates controllers for each effect
  runEffect: (effect, state, key) => {
    if (effect.kind === 'call-llm') {
      return {
        // Async function that runs the effect and dispatches inputs on completion
        start: async (dispatch) => {
          // Call LLM with effect.prompt
          // When done, dispatch assistant message input
          // dispatch({ type: 'assistant', message: completion });
        },
        // Function to cancel the effect if it's no longer needed
        cancel: () => {
          // Cancel the LLM call (e.g., abort fetch, close connection)
        },
      };
    }
    if (effect.kind === 'call-tool') {
      return {
        start: async (dispatch) => {
          // Execute tool with effect.name and effect.input.
          // When done, dispatch tool result input:
          // dispatch({ type: 'tool', name: effect.name, result: '...' });
        },
        cancel: () => {
          // Cancel tool execution if possible
        },
      };
    }
    // TypeScript exhaustiveness check
    throw new Error(`Unknown effect kind ${(effect satisfies never).kind}`);
  },
};

// Create the Moorex machine instance
const agent = createMoorex(definition);

// Subscribe to events (state updates, effect lifecycle, etc.)
agent.subscribe((event) => {
  console.log('[agent-event]', event);
  // event.type can be: 'input-received', 'state-updated', 'effect-started',
  // 'effect-completed', 'effect-canceled', 'effect-failed'
});

// Dispatch inputs to trigger state transitions
agent.dispatch({
  type: 'user',
  message: 'Summarize the latest log entries.',
});

// Get current state
const currentState = agent.current();
```

Even if the agent restarts, hydrating `AgentState` and letting effect
reconciliation run will resume or cancel effects exactly as required. The Record
keys returned by `effectsAt` serve as stable identifiers for effects across
restarts—effects with matching keys are considered the same effect.

## Effect Reconciliation

On every state change Moorex:

1. Calls `effectsAt(state)` to compute the desired effect set as a Record
   (key-value map).
2. Cancels running effects whose keys disappeared from the Record.
3. Starts any new effects whose keys were introduced in the Record.
4. Leaves untouched effects whose keys are still present.

The Record's keys serve as effect identifiers for reconciliation, so Effect
types no longer need to have a `key` property.

Each effect's lifecycle is managed by the `runEffect` function:

- `runEffect(effect, state, key)` receives the effect, the **current state** of the machine (obtained via `moorex.current()`), and the effect's key, returning a controller with `start` and `cancel` methods.
- `start(dispatch)` launches the effect and resolves when it finishes. Use
  `dispatch` to send inputs back to the machine. The `dispatch` function is guarded: if the effect is canceled, subsequent calls to `dispatch` will be ignored.
- `cancel()` aborts the effect; Moorex calls this when the effect key is no
  longer needed.

Moorex tracks running effects in memory. If an effect completes or rejects, the
machine automatically removes it and emits the corresponding events.

## Event Timeline

Moorex exposes a single `subscribe(handler)` subscription. Events arrive in the
following order for each dispatch:

1. **`input-received`**: emitted once per input when it is processed (before
   effect reconciliation).
2. **`state-updated`**: emitted once after the state transition completes.
3. **`effect-started`**: emitted for each new effect begun during
   reconciliation.
4. **`effect-completed`** / **`effect-failed`** / **`effect-canceled`**:
   emitted asynchronously as effects finish, throw, or are cancelled.

## API Reference

### `createMoorex<Input, Effect, State>(definition: MoorexDefinition<Input, Effect, State>): Moorex<Input, Effect, State>`

Creates a new Moorex machine instance.

### `Moorex<Input, Effect, State>`

- `dispatch(input: Input): void` - Dispatch an input to trigger a state transition
- `current(): State` - Get the current state
- `subscribe(handler: (event: MoorexEvent<Input, Effect, State>) => void): CancelFn` - Subscribe to machine events

### `MoorexEvent<Input, Effect, State>`

- `{ type: 'input-received'; input: Input }`
- `{ type: 'state-updated'; state: State }`
- `{ type: 'effect-started'; effect: Effect }`
- `{ type: 'effect-completed'; effect: Effect }`
- `{ type: 'effect-canceled'; effect: Effect }`
- `{ type: 'effect-failed'; effect: Effect; error: unknown }`

## License

MIT
