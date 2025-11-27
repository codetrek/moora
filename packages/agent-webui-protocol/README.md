# @moora/agent-webui-protocol

Protocol definitions for Agent Web UI - defines `AgentAppState`, `AgentAppEvent`, and `AgentController` types.

## Overview

This package provides type definitions for the communication protocol between the Agent Web UI and the Agent backend. It defines:

- **AgentAppState**: The user-visible state of the Agent
- **AgentAppEvent**: Events that users can trigger through the Web UI
- **AgentController**: The interface for frontend applications to interact with the Agent

## Installation

```bash
bun add @moora/agent-webui-protocol
```

## Usage

```typescript
import type { AgentController, AgentAppState, AgentAppEvent } from '@moora/agent-webui-protocol';

// Subscribe to state changes
const unsubscribe = controller.subscribe((state: AgentAppState) => {
  console.log('Agent state:', state);
});

// Send an event
controller.notify({
  type: 'user-message',
  content: 'Hello, Agent!'
});

// Unsubscribe when done
unsubscribe();
```

## Types

### AgentAppState

The user-visible state of the Agent, including:
- `status`: Current status (idle, thinking, responding, error)
- `messages`: List of conversation messages
- `error`: Error message (if any)
- `isProcessing`: Whether the Agent is currently processing

### AgentAppEvent

Events that can be triggered from the Web UI:
- `user-message`: Send a user message
- `cancel`: Cancel the current operation
- `retry`: Retry the last failed operation
- `clear`: Clear the conversation history

### AgentController

Interface for frontend applications to interact with the Agent:
- `subscribe(handler)`: Subscribe to state changes
- `notify(event)`: Send an event to the Agent

## License

MIT

