# @moora/starter-agent

A minimal starter agent implementation based on Automata and the iterative modeling methodology described in `docs/MODELING_V2.md`.

## Overview

This package implements a minimal agent with two Actors:
- `user` - Represents the user in the agent's cognitive model
- `llm` - Represents the LLM assistant

**Note**: This package does not support tools. For a complete implementation with tool support, see `@moora/agent`.

## Structure

The package follows the file structure defined in the modeling methodology:

```
src/
├── decl/          # Type declarations
│   ├── actions.ts      # Action types for each Actor
│   ├── actors.ts       # Actor constants
│   ├── agent.ts        # Worldscape, Actuation, ReactionFns, AgentReaction types
│   ├── appearances.ts  # Appearance types
│   ├── helpers.ts      # Helper types
│   ├── observations.ts # Observation types
│   ├── perspectives.ts # Perspective types
│   └── reactions.ts    # Reaction callback types (CallLlm, NotifyUser)
├── impl/          # Function implementations
│   ├── agent/          # createAgent, createReaction
│   ├── initials/       # Initial state factories
│   ├── transitions/    # State transition functions
│   └── reactions/      # Reaction factory functions
└── index.ts       # Main entry point
```

## Usage

The package provides reaction factory functions that encapsulate actor behavior:

```typescript
import {
  createAgent,
  createReaction,
  createUserReaction,
  createLlmReaction,
} from '@moora/starter-agent';

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

      let fullContent = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content ?? '';
        if (content) {
          callbacks.onStart(); // Called on first content
          callbacks.onChunk(content);
          fullContent += content;
        }
      }
      callbacks.onComplete(fullContent);
    },
    onStart: (messageId) => {
      // Optional: Handle stream start
      console.log('Stream started:', messageId);
    },
    onChunk: (messageId, chunk) => {
      // Optional: Handle stream chunks
      console.log('Chunk:', chunk);
    },
    onComplete: (messageId, content) => {
      // Optional: Handle stream completion
      console.log('Stream completed:', messageId);
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

## LLM Reaction Logic

The LLM reaction in starter-agent uses a simplified logic:
- **Trigger condition**: If the last message is a user message, send an LLM call
- **No tool support**: Tools and tool calls are not supported in this package

## Differences from @moora/agent

- **No toolkit actor**: Only `user` and `llm` actors are supported
- **No tool support**: The `callLlm` context always has empty `tools` and `toolCalls` arrays
- **Simplified LLM reaction**: Uses a simple "last message is user message" trigger instead of complex cutOff-based logic

For a complete implementation with tool support and more sophisticated reaction logic, use `@moora/agent` instead.
