# @moora/starter-agent

A minimal starter agent implementation based on Automata and the iterative modeling methodology described in `docs/MODELING_V2.md`.

## Overview

This package implements the initial version of an agent with two Actors:
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
import { createStarterAgent } from '@moora/starter-agent';

const agent = createStarterAgent();

// Dispatch a user message
agent.dispatch({
  type: 'send-user-message',
  content: 'Hello',
  timestamp: Date.now(),
});
```

## Development

This is a minimal implementation with mock output functions. The actual effect logic should be implemented based on your specific requirements.
