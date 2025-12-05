# @moora/automata

A generic automata library for building state machines (Mealy and Moore machines).

## Installation

```bash
npm install @moora/automata
# or
bun add @moora/automata
# or
yarn add @moora/automata
```

## Usage

```typescript
import { machine, mealy, moore } from '@moora/automata';

// Create a generic machine
const sm = machine(
  {
    initial: () => 0,
    transition: (n: number) => (state) => state + n,
  },
  ({ state }) => ({ value: state })
);

// Create a Mealy machine
const mealyMachine = mealy({
  initial: () => 'idle',
  transition: (input: string) => (state) =>
    input === 'start' ? 'running' : state,
  output: ({ input, state }) => `${state}:${input}`,
});

// Create a Moore machine
const mooreMachine = moore({
  initial: () => 0,
  transition: (n: number) => (state) => state + n,
  output: (state) => ({ value: state, doubled: state * 2 }),
});
```

## API

### `machine<Input, Output, State>(automata, output)`

Creates a generic automata with custom output function.

### `mealy<Input, Output, State>(definition)`

Creates a Mealy machine where output depends on both input and state.

### `moore<Input, Output, State>(definition)`

Creates a Moore machine where output depends only on state.

## License

MIT
