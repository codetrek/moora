# @moora/triplet-agent

A simple triplet agent package implementing the Moorex modeling methodology with User, Agent, and Toolkit participants.

## Overview

This package demonstrates the seven-step Moorex modeling process for building a state machine that coordinates interactions between three participants:

- **User**: Handles user interactions and displays agent responses
- **Agent**: Processes user messages, calls LLM, and decides when to use tools
- **Toolkit**: Executes tool calls and returns results

## Status

🚧 **Work in Progress** - Currently implementing the seven-step modeling process:

- [x] **Step 1: Identify participants** (User, Agent, Toolkit)
  - ✅ Defined three participants: USER, AGENT, TOOLKIT
  - ✅ Created `participants.ts` with participant constants and types

- [x] **Step 2: Define I/O schemas** for each participant
  - ✅ User I/O: InputForUser (messages, streamingMessageIds), OutputFromUser (sendMessage, cancelStreaming)
  - ✅ Agent I/O: InputForAgent (messages, toolResults, prompt, tools), OutputFromAgent (callTool, sendChunk, completeMessage)
  - ✅ Toolkit I/O: InputForToolkit (pendingToolCalls), OutputFromToolkit (toolResult, toolError)
  - ✅ Created `io.ts` with Zod@4 schemas and utility types
  - ✅ All schemas use JSON string for complex data (parameters, parametersSchema)

- [x] **Step 3: Identify unidirectional data flow** (Channels)
  - ✅ Node-to-node channels: USER→AGENT, AGENT→TOOLKIT, TOOLKIT→AGENT, AGENT→USER
  - ✅ Loopback channels: USER→USER, AGENT→AGENT, TOOLKIT→TOOLKIT (for state iteration awareness)
  - ✅ Created `channels.ts` with Channel constants, types, and utility functions
  - ✅ Total: 7 channels (4 inter-node + 3 loopback)

- [ ] **Step 4: Focus on channel concerns** (State and transitions)
  - [ ] Define State schema for each Channel
  - [ ] Define transition functions for each Channel
  - [ ] Use mutative for immutable updates

- [ ] **Step 5: Node state drives effects** (Effects, effectsAt, runEffect)
  - [ ] Define Effect types for each Participant
  - [ ] Implement effectsAt functions
  - [ ] Implement runEffect functions

- [ ] **Step 6: Consolidate and remove redundancy** (Global State, Signal, Effect)
  - [ ] Merge all Channel States into global State
  - [ ] Create Signal type (union of all Outputs)
  - [ ] Create Effect type (union of all Effects)
  - [ ] Implement unified transition, effectsAt, runEffect functions

- [ ] **Step 7: Create factory function** (createTripletAgentMoorex)
  - [ ] Create factory function with configuration options
  - [ ] Support state serialization and restoration
  - [ ] Complete the Moorex instance creation

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

```typescript
import { USER, AGENT, TOOLKIT } from "@moora/triplet-agent";
import type { InputFor, OutputFrom, Channel } from "@moora/triplet-agent";
import {
  Channel_USER_AGENT,
  Channel_AGENT_TOOLKIT,
  Channel_TOOLKIT_AGENT,
  Channel_AGENT_USER,
  Channel_USER_USER,
  Channel_AGENT_AGENT,
  Channel_TOOLKIT_TOOLKIT,
} from "@moora/triplet-agent";
```

## License

MIT

