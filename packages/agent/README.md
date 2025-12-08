# @moora/agent

A complete agent implementation based on Automata and the iterative modeling methodology described in `docs/MODELING_V2.md`.

## Overview

This package implements a complete agent with multiple Actors:
- `user` - Represents the user in the agent's cognitive model
- `llm` - Represents the LLM assistant
- `toolkit` - Represents the tool execution capability

## Structure

The package follows the file structure defined in the modeling methodology:

```
src/
├── decl/           # Type declarations
│   ├── actions.ts      # Action types for each Actor
│   ├── actors.ts       # Actor constants
│   ├── agent.ts        # Worldscape, Actuation, ReactionFns types
│   ├── appearances.ts  # Appearance types
│   ├── helpers.ts      # Helper types
│   ├── observations.ts # Observation types
│   ├── perspectives.ts # Perspective types
│   └── reactions.ts    # Reaction callback types (CallLlm, CallTool, NotifyUser)
├── impl/           # Function implementations
│   ├── agent/          # createAgent, createReaction
│   ├── initials/       # Initial state factories
│   ├── transitions/    # State transition functions
│   └── reactions/      # Reaction factory functions
└── index.ts        # Main entry point
```

## Usage

The package provides reaction factory functions that encapsulate actor behavior:

```typescript
import {
  createAgent,
  createReaction,
  createUserReaction,
  createLlmReaction,
  createToolkitReaction,
} from '@moora/agent';

// Create reaction functions with callbacks
const reaction = createReaction({
  user: createUserReaction({
    notifyUser: (perspective) => {
      // Send perspective updates to client (e.g., via SSE, WebSocket)
      console.log('User perspective updated:', perspective);
    },
  }),
  llm: createLlmReaction({
    callLlm: async (context, callbacks) => {
      // Call your LLM API (e.g., OpenAI)
      const stream = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: context.messages,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content ?? '';
        if (content) {
          callbacks.onStart(); // Called on first content
          callbacks.onChunk(content);
        }
      }
      callbacks.onComplete(fullContent);
    },
  }),
  toolkit: createToolkitReaction({
    callTool: async (request) => {
      // Execute tool and return result
      const result = await toolkit.invoke(request.name, request.arguments);
      return result;
    },
  }),
});

// Create agent with the reaction
const agent = createAgent(reaction);

// Subscribe to state changes (for logging, debugging)
agent.subscribe((update) => {
  console.log('State update:', update);
});

// Dispatch a user message
agent.dispatch({
  type: 'send-user-message',
  id: 'msg-1',
  content: 'Hello',
  timestamp: Date.now(),
});
```

## Reaction Types

### CallLlm

```typescript
type CallLlm = (
  context: CallLlmContext,
  callbacks: CallLlmCallbacks
) => void | Promise<void>;

type CallLlmContext = {
  messages: CallLlmMessage[];
  scenario: 're-act-loop';
  tools: CallLlmToolDefinition[];
  toolCalls: CallLlmToolCall[];
};

type CallLlmCallbacks = {
  onStart: () => string;      // Returns messageId
  onChunk: (chunk: string) => void;
  onComplete: (content: string) => void;
  onToolCall: (request: { name: string; arguments: string }) => void;
};
```

### CallTool

```typescript
type CallTool = (request: ToolCallRequest) => Promise<string>;
```

### NotifyUser

```typescript
type NotifyUser = (perspective: PerspectiveOfUser) => void;
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run tests with UI
bun run test:ui
```
