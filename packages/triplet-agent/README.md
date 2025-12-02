# @moora/triplet-agent

A simple triplet agent package implementing the Moorex modeling methodology with User, Agent, and Toolkit participants.

## Overview

This package demonstrates the seven-step Moorex modeling process for building a state machine that coordinates interactions between three participants:

- **User**: Handles user interactions and displays agent responses
- **Agent**: Processes user messages, calls LLM, and decides when to use tools
- **Toolkit**: Executes tool calls and returns results

## Status

✅ **Complete** - All seven steps of the Moorex modeling process have been implemented:

- [x] **Step 1: Identify participants** (User, Agent, Toolkit)
  - ✅ Defined three participants: USER, AGENT, TOOLKIT
  - ✅ Created `participants.ts` with participant constants and types

- [x] **Step 2: Define I/O schemas** for each participant
  - ✅ User I/O: InputForUser (messages, streamingMessageIds), OutputFromUser (sendMessage, cancelStreaming)
  - ✅ Agent I/O: InputForAgent (messages, toolResults, prompt, tools), OutputFromAgent (callTool, sendChunk, completeMessage)
  - ✅ Toolkit I/O: InputForToolkit (pendingToolCalls), OutputFromToolkit (toolResult, toolError)
  - ✅ Created `io.ts` with Zod@4 schemas and utility types
  - ✅ All schemas use JSON string for complex data (parameters, schema)
  - ✅ ToolDefinition includes run function for dependency injection

- [x] **Step 3: Identify unidirectional data flow** (Channels)
  - ✅ Node-to-node channels: USER→AGENT, AGENT→TOOLKIT, TOOLKIT→AGENT, AGENT→USER
  - ✅ Loopback channels: USER→USER, AGENT→AGENT, TOOLKIT→TOOLKIT (for state iteration awareness)
  - ✅ Created `channels.ts` with Channel constants, types, and utility functions
  - ✅ Total: 7 channels (4 inter-node + 3 loopback)

- [x] **Step 4: Focus on channel concerns** (State and transitions)
  - ✅ Defined State schema for all 7 Channels (including loopback channels)
  - ✅ Defined transition functions for all Channels using mutative for immutable updates
  - ✅ Created `state.ts` and `transition.ts` with all Channel State schemas and transition functions
  - ✅ StateToolkitAgent supports both success and failure tool results
  - ✅ StateUserAgent tracks canceled streaming message IDs
  - ✅ StateAgentUser tracks streaming chunks with Record<messageId, chunks[]>

- [x] **Step 5: Node state drives effects** (Effects, effectsAt, runEffect)
  - ✅ Defined Effect types for all Participants (EffectOfUser, EffectOfAgent, EffectOfToolkit)
  - ✅ Implemented effectsAt functions for all nodes (effectsAtForUser, effectsAtForAgent, effectsAtForToolkit)
  - ✅ Implemented runEffect functions with dependency injection support
  - ✅ Created `effects.ts` with all Effect types and functions
  - ✅ Added dependency injection types: CallLLMFn, GetToolNamesFn, GetToolDefinitionsFn, UpdateUIFn

- [x] **Step 6: Consolidate and remove redundancy** (Global State, Signal, Effect)
  - ✅ Merged all Channel States into global State type
  - ✅ Created Signal type (union of all Participant Outputs)
  - ✅ Created Effect type (union of all Participant Effects)
  - ✅ Implemented unified transition, effectsAt, runEffect functions
  - ✅ Created `unified.ts` with global types and unified functions
  - ✅ Added getStateForChannel function for type-safe channel state access

- [x] **Step 7: Create factory function** (createTripletAgentMoorex)
  - ✅ Created factory function with configuration options
  - ✅ Support state serialization and restoration via initialState option
  - ✅ Complete Moorex instance creation with dependency injection
  - ✅ Created `create-triplet-agent-moorex.ts` with factory function

## Installation

```bash
bun add @moora/triplet-agent
```

## Architecture

### Participants

- **USER**: Handles user interactions and displays agent responses
- **AGENT**: Processes messages, calls LLM, and decides when to use tools
- **TOOLKIT**: Executes tool calls and returns results

### Channels (Information Flow)

**Inter-node Channels:**
- `USER → AGENT`: User sends messages to Agent
- `AGENT → TOOLKIT`: Agent calls tools
- `TOOLKIT → AGENT`: Toolkit returns tool results to Agent
- `AGENT → USER`: Agent sends messages to User

**Loopback Channels** (for state iteration awareness):
- `USER → USER`: User observes its own state changes
- `AGENT → AGENT`: Agent observes its own state changes
- `TOOLKIT → TOOLKIT`: Toolkit observes its own state changes

### I/O Schema Design

- All complex data structures use JSON strings (parameters, parametersSchema)
- Messages are shared between User and Agent
- Streaming support via `streamingMessageIds` and chunk-based output
- Tool definitions include name, description, and parameters schema

## Usage

### Basic Usage

```typescript
import { createTripletAgentMoorex } from "@moora/triplet-agent";
import type { Signal, State, LLMResponse, ToolDefinition } from "@moora/triplet-agent";

// Create Moorex instance
const moorex = createTripletAgentMoorex({
  updateUI: (state, dispatch) => {
    // Render UI with state.messages and state.streamingChunks
    renderMessages(state.messages);
    updateStreamingMessages(state.streamingChunks);
  },
  callLLM: async (prompt, tools, messages) => {
    // Call LLM API and return LLMResponse
    const response = await llmClient.chat({
      system: prompt,
      tools: tools.map(t => ({ name: t.name, description: t.description, schema: JSON.parse(t.schema) })),
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });
    
    if (response.toolCalls && response.toolCalls.length > 0) {
      return {
        type: "toolCall",
        toolCallId: response.toolCalls[0].id,
        toolName: response.toolCalls[0].name,
        parameters: JSON.stringify(response.toolCalls[0].parameters),
      };
    }
    
    return {
      type: "message",
      messageId: response.messageId,
      chunks: response.streamChunks(), // AsyncIterable<string>
    };
  },
  prompt: "You are a helpful assistant.",
  getToolNames: async () => {
    return ["search", "calculate", "weather"];
  },
  getToolDefinitions: async (names) => {
    return names.map(name => ({
      name,
      description: `Tool: ${name}`,
      schema: JSON.stringify({ type: "object", properties: {} }),
      run: async (parameters: string) => {
        // Execute tool and return result
        return await executeTool(name, JSON.parse(parameters));
      },
    }));
  },
});

// Dispatch user message
moorex.dispatch({
  type: "sendMessage",
  messageId: "msg-1",
  message: "Hello, what's the weather?",
});

// Get current state
const state = moorex.current();

// Serialize state for persistence
const serialized = JSON.stringify(state);

// Restore from serialized state
const restored = createTripletAgentMoorex({
  ...options,
  initialState: JSON.parse(serialized),
});
```

### Type Exports

```typescript
import type {
  // Participants
  Participants,
  
  // I/O Types
  InputForUser,
  OutputFromUser,
  InputForAgent,
  OutputFromAgent,
  InputForToolkit,
  OutputFromToolkit,
  ToolDefinition,
  Message,
  
  // Channel Types
  Channel,
  ChannelUserAgent,
  ChannelAgentToolkit,
  ChannelToolkitAgent,
  ChannelAgentUser,
  
  // State Types
  State,
  StateUserAgent,
  StateAgentToolkit,
  StateToolkitAgent,
  StateAgentUser,
  
  // Effect Types
  Effect,
  EffectOfUser,
  EffectOfAgent,
  EffectOfToolkit,
  
  // Signal Type
  Signal,
  
  // Factory Options
  CreateTripletAgentMoorexOptions,
  CallLLMFn,
  LLMResponse,
  GetToolNamesFn,
  GetToolDefinitionsFn,
  UpdateUIFn,
} from "@moora/triplet-agent";
```

## License

MIT

