# @moora/agent-core

Core Agent logic - State Machine, Frontend Controller, and Agent Moorex implementation.

## Overview

This package provides the core business logic for the Agent system, including:

- **Agent State Machine**: Shared state machine definition for frontend and backend
- **Frontend Controller**: Implementation that bridges protocol types and internal types
- **Agent Moorex**: Server-side effects processing logic

## Installation

```bash
bun add @moora/agent-core
```

## Usage

### Agent State Machine

```typescript
import { agentStateMachine, initialAgentState, agentTransition } from '@moora/agent-core';

// Get initial state
const state = initialAgentState();

// Apply transition
const newState = agentTransition({ type: 'user-message', requestId: 'req-1', content: 'Hello' })(state);
```

### Frontend Controller

```typescript
import { createAgentController } from '@moora/agent-core';

// Create controller
const controller = createAgentController({
  endpoint: 'http://localhost:3000/api/agent',
});

// Subscribe to state changes
const unsubscribe = controller.subscribe((state) => {
  console.log('Agent state:', state);
});

// Send events
controller.notify({
  type: 'user-message',
  content: 'Hello, Agent!',
});

// Cleanup
unsubscribe();
```

### Agent Moorex

```typescript
import { createAgentMoorexDefinition, createMoorex } from '@moora/agent-core';
import { createMoorex as createMoorexInstance } from '@moora/moorex';

// Define LLM and Tools
const callLLM = async ({ prompt }) => {
  // Call your LLM API
  return 'Response from LLM';
};

const tools = {
  search: {
    name: 'search',
    description: 'Search the web',
    execute: async (args) => {
      // Execute tool
      return { results: [] };
    },
  },
};

// Create Moorex definition
const definition = createAgentMoorexDefinition({
  callLLM,
  tools,
});

// Create Moorex instance
const moorex = createMoorexInstance(definition);
```

## API

### Agent State Machine

- `initialAgentState()`: Returns the initial agent state
- `agentTransition(input)`: Returns a state transition function
- `agentStateMachine`: Complete state machine definition

### Frontend Controller

- `mapAppState(state)`: Maps internal `AgentState` to user-visible `AgentAppState`
- `interpretAppEvent(event)`: Converts `AgentAppEvent` to `AgentInput[]`
- `createAgentController(options)`: Creates an `AgentController` instance

### Agent Moorex

- `agentEffectsAt(state)`: Calculates effects from state
- `createAgentRunEffect(options)`: Creates effect runner function
- `createAgentMoorexDefinition(options)`: Creates complete Moorex definition

## License

MIT

