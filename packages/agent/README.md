# @moora/agent

A complete agent implementation based on Automata and the iterative modeling methodology described in `docs/MODELING_V2.md`.

## Overview

This package implements a complete agent with multiple Actors:
- `user` - Represents the user in the agent's cognitive model
- `llm` - Represents the LLM assistant

## Structure

The package follows the file structure defined in the modeling methodology:

```
src/
├── decl/          # Type declarations
├── impl/          # Function implementations
└── index.ts       # Main entry point
```

## Usage

```typescript
import { createAgent } from '@moora/agent';

const agent = createAgent({
  user: (context) => () => async (dispatch) => {
    // User Actor 的副作用逻辑
  },
  llm: (context) => () => async (dispatch) => {
    // Llm Actor 的副作用逻辑
  },
});

// Dispatch a user message
agent.dispatch({
  type: 'send-user-message',
  content: 'Hello',
  timestamp: Date.now(),
});
```

## Development

This package provides a complete agent implementation that can be extended with custom output functions and additional actors.
