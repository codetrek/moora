# Reflexor 架构设计

本文档描述了基于 Moorex 的 AI Agent 系统（Reflexor）的核心架构设计，重点阐述前后端状态机同步机制和 I/O 分类设计。

## 包结构

```
@moora/reflexor-state-machine  - 状态机定义（前后端共用）
@moora/reflexor-service        - 后端服务（Fastify 集成）
@moora/reflexor-webui          - 前端 UI（React）
```

## 核心设计原则

### Effect 结构简化

Output (Effect) 的结构要尽可能简化，因为 Effect 是从 State 计算出来的，每次 `runEffect` 会带有完整的 State 作为参数。因此：

- **AskBrain**：只需要 `signalsCutAt` 时间戳，表示参考的 user message 和 tool response 的时间截止点
- **RequestToolkit**：只需要 `toolCallId`，其他信息可以从 `state.toolCallRecords` 获取

这样设计的好处是 Effect 更轻量，所有必要信息都可以从 State 中获取，减少了数据冗余。

### 时间戳与时间不可逆原则

所有 Input 都必须包含 `timestamp` 字段，State 必须包含 `updatedAt` 时间戳。Transition 函数必须遵循**时间不可逆原则**：

- 任何早于 `state.updatedAt` 的 Input 都要被拒绝
- 这样可以确保状态转换的时间顺序一致性，避免时序冲突

### Brain Input 的 calledBrainAt 字段

所有来自 Brain 的 Input 都包含 `calledBrainAt` 字段，标记这是哪次 `askBrain` 的响应。这用于：
- 更新 `state.calledBrainAt`，判断是否需要再次调用 Brain
- 支持并发的 askBrain 调用（允许在 streaming 时发起新的请求）

### 前后端共享 State Machine

前后端基于**同一套 state machine** 定义，包括：
- `State`: 状态类型
- `Input`: 输入信号类型
- `initial()`: 初始状态函数
- `transition()`: 状态转换函数

但前后端的职责不同：
- **前端**：只观察 state 变化，渲染 UI，不执行 effects
- **后端**：执行 effects（`effectsAt` + `runEffect`），处理 Brain/Toolkit 交互

### 单向数据流同步机制

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           单向数据流示意图                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐                    ┌──────────────┐
  │   Frontend   │                    │   Backend    │
  │  (Browser)   │                    │   (Server)   │
  └──────────────┘                    └──────────────┘
         │                                   │
         │  1. UI Event → Input              │
         │  (不执行 transition)               │
         │                                   │
         │  ─────── POST /moorex ─────────►  │
         │                                   │  2. 后端优先执行 transition
         │                                   │     覆盖 timestamp
         │                                   │
         │  ◄─────── SSE state-updated ────  │
         │                                   │
         │  3. 前端同步 state                 │
         │     (观察状态变化更新 UI)           │
         │                                   │
```

**设计要点**：

1. **前端不直接执行 transition**：前端收集 UI Event 后转换为 Input，但不会马上在前端执行 transition
2. **后端优先确认**：Input 通过 POST API 发送给后端，后端的 state machine 优先执行 transition
3. **SSE 回传状态**：后端通过 SSE 的 `state-updated` 事件将完整状态发送回前端
4. **时间戳覆盖**：前端生成的 Input 时间戳会被服务端时间戳覆盖，保证时序一致性

## I/O 设计：三方交互模型

AI Agent 需要与三方打交道：

1. **User（用户）**：通过 UI 进行交互
2. **Brain（大脑）**：LLM 调用，使用比 "LLM" 更通俗的命名
3. **Toolkit（工具集）**：外部工具调用

### 命名规范

I/O 命名遵循特定的动词结构：

| 方向 | 命名模式 | 示例 |
|------|----------|------|
| Input (来自 X) | `XxxDoSomething` | `UserSendMessage`, `BrainCallTools`, `ToolkitRespond` |
| Output (发给 X) | `DoSomethingToXxx` | `AskBrain`, `RequestToolkit` |

### I/O with User

#### Input (来自用户)

```typescript
/**
 * 用户发送消息
 */
type UserSendMessage = {
  type: "user-send-message";
  timestamp: number;
  messageId: string;
  content: string;
};
```

#### Output (发给用户)

前端通过**观察 state 变化**来更新 UI，不需要定义 Effect：

```typescript
// 前端订阅 state 变化
moorex.subscribe((event) => {
  if (event.type === "state-updated") {
    // 直接根据 state 更新 UI
    renderUI(event.state);
  }
});
```

### I/O with Brain

#### Input (来自大模型)

所有 Brain Input 都包含 `calledBrainAt` 字段：

```typescript
/**
 * Brain Input 基础类型
 */
type BaseBrainInput = {
  timestamp: number;
  calledBrainAt: number;  // 标记这是哪次 askBrain 的响应
};

/**
 * Brain 压缩历史
 */
type BrainCompressHistory = BaseBrainInput & {
  type: "brain-compress-history";
  summary: string;
  cutAt: number;
};

/**
 * Brain 加载历史 Tool Call
 */
type BrainLoadToolCall = BaseBrainInput & {
  type: "brain-load-tool-call";
  toolCallId: string;
};

/**
 * Brain 请求调用工具
 */
type BrainCallTools = BaseBrainInput & {
  type: "brain-call-tools";
  toolCalls: Record<string, ToolCallRequest>;
};

/**
 * Brain 开始输出消息
 */
type BrainSendMessageStart = BaseBrainInput & {
  type: "brain-send-message-start";
  messageId: string;
};

/**
 * Brain 完成输出消息
 */
type BrainSendMessageComplete = BaseBrainInput & {
  type: "brain-send-message-complete";
  messageId: string;
  content: string;
};
```

#### Output (发给大模型)

```typescript
/**
 * 向 Brain 发起请求
 * 
 * Effect key: ask-brain-${signalsCutAt}
 */
type AskBrain = {
  kind: "ask-brain";
  signalsCutAt: number;
};
```

### I/O with Toolkit

#### Input (来自工具集)

```typescript
/**
 * Toolkit 返回结果
 */
type ToolkitRespond = {
  type: "toolkit-respond";
  timestamp: number;
  toolCallId: string;
  result: string;
};

/**
 * Toolkit 返回错误
 */
type ToolkitError = {
  type: "toolkit-error";
  timestamp: number;
  toolCallId: string;
  error: string;
};
```

#### Output (发给工具集)

```typescript
/**
 * 请求 Toolkit 执行工具
 * 
 * Effect key: request-toolkit-${toolCallId}
 */
type RequestToolkit = {
  kind: "request-toolkit";
  toolCallId: string;
};
```

## 完整的 Input Union 类型

```typescript
type ReflexorInput =
  // User inputs
  | UserSendMessage
  // Brain inputs
  | BrainCompressHistory
  | BrainLoadToolCall
  | BrainCallTools
  | BrainSendMessageStart
  | BrainSendMessageComplete
  // Toolkit inputs
  | ToolkitRespond
  | ToolkitError;
```

## 完整的 Effect Union 类型（后端）

```typescript
type ReflexorEffect =
  | AskBrain
  | RequestToolkit;
```

## 服务端 API 设计

### 路由结构

```
/api/reflexor/
  ├── moorex/           # Moorex 路由（POST & GET SSE）
  │   ├── GET           # SSE 流，发送状态和事件
  │   └── POST          # 接收 Input
  └── messages/:id      # 消息 Streaming 路由
      └── GET           # SSE 流，发送消息内容
```

### Reflexor Node 配置

```typescript
type ReflexorNodeConfig = {
  prompt: string;                           // System prompt
  tools: Record<string, ToolDefinitionExt>; // 工具定义（带执行函数）
  llm: LlmFunction;                         // LLM 函数
  initialState?: ReflexorState;             // 初始状态（可选）
};

// 创建 Reflexor Node
const reflexorNode = createReflexorNode({
  prompt: "You are a helpful assistant.",
  tools: {
    search: {
      name: "search",
      description: "Search the web",
      parameters: { query: { type: "string", description: "Search query" } },
      required: ["query"],
      execute: async (params) => "Search results...",
    },
  },
  llm: myLlmFunction,
});

// 注册到 Fastify
await fastify.register(reflexorNode.register, { prefix: '/api/reflexor' });
```

### LLM 函数接口

```typescript
type LlmRequest = {
  prompt: string;
  tools: Record<string, ToolDefinition>;
  messages: LlmMessage[];
  requiredTool: string | boolean;
};

type LlmResponse = {
  message: string;
  toolCalls: LlmToolCallRequest[];
};

type LlmFunction = (
  request: LlmRequest,
  onMessageChunk: (content: string) => void
) => Promise<LlmResponse>;
```

## Streaming Message 处理

### 设计原则

**中间状态不进入 state**：streaming message 的 chunks 不会导致 state 频繁更新，避免产生大量中间状态。

### 实现方案

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Streaming 处理流程                                    │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐                    ┌──────────────┐
  │   Frontend   │                    │   Backend    │
  └──────────────┘                    └──────────────┘
         │                                   │
         │  ◄── SSE: BrainSendMessageStart ──│  1. 后端开始流式输出
         │       (messageId: "msg-123")      │
         │                                   │
         │  2. 前端根据 messageId             │
         │     连接 streaming SSE 接口        │
         │                                   │
         │  ─── GET /messages/msg-123 ────►  │
         │                                   │
         │  ◄────── SSE: chunk ─────────────  │  3. 后端推送 chunks
         │  ◄────── SSE: chunk ─────────────  │
         │  ◄────── SSE: chunk ─────────────  │
         │                                   │
         │  ◄── SSE: BrainSendMessageComplete │  4. 输出完成
         │       (content: "完整内容")        │
         │                                   │
```

### 前端处理流程

1. 收到 `BrainSendMessageStart` 后，state 中创建空内容的 assistant message
2. 根据 `messageId` 连接 `/messages/:messageId` SSE 接口
3. 接收 chunks 推送，在 UI 层面实时更新显示（不更新 state）
4. 收到 `BrainSendMessageComplete` 后，state 中的 message 更新为完整内容

## Context 管理

### State 中的 Context 字段

```typescript
type ReflexorState = {
  // ... 其他字段
  contextSummary: string;   // 压缩后的历史摘要
  summaryCutAt: number;     // 摘要截止时间戳
  toolCallRecords: ToolCallRecord[];  // 每个记录包含 isLoaded 字段
};
```

### 发送给 Brain 的 Context 构成

1. `contextSummary` 内容
2. `summaryCutAt` 之后的 user/assistant messages
3. Tool calls：
   - **完整详情**：`summaryCutAt` 之后的 + `isLoaded` 为 true 的
   - **仅 ID 列表**（不带 result）：其他历史 tool calls，供后续加载

### Context 优化操作

- **BrainCompressHistory**：压缩历史，更新 `contextSummary` 和 `summaryCutAt`
- **BrainLoadToolCall**：加载指定的历史 tool call 详情

## 架构优势

### 1. 时序一致性

通过单向数据流和服务端时间戳覆盖，彻底解决前后端状态不一致问题。

### 2. 清晰的职责边界

- **三方模型**（User/Brain/Toolkit）使得 I/O 设计清晰
- **前后端分工明确**：后端执行 Effects，前端观察 State

### 3. 前端实现简化

前端不需要实现 Effects 机制，只需：
- 生成 User Input 并发送到后端
- 观察 state 变化并更新 UI
- 处理消息 streaming

### 4. Streaming 性能优化

中间状态不进入 state，避免频繁状态更新带来的性能开销和存储压力。

### 5. Context 管理灵活

通过 `summaryCutAt` 和 `isLoaded` 机制，灵活管理发送给 LLM 的上下文，支持：
- 历史压缩
- 按需加载 tool call 详情

### 6. 并发 Brain 调用

通过 `calledBrainAt` 字段，支持在 streaming 时发起新的 askBrain 调用。

## 与 Moorex 的映射

| Moorex 概念 | 后端实现 | 前端实现 |
|-------------|----------|----------|
| `State` | `ReflexorState` | `ReflexorState`（同步自后端）|
| `Input` | `ReflexorInput` (User/Brain/Toolkit) | 生成 User Input，观察所有 Input |
| `Effect` | `ReflexorEffect` (AskBrain/RequestToolkit) | 不使用，只观察 state |
| `transition` | 优先执行，确认 timestamp | 通过 SSE 同步 |
| `effectsAt` | 计算 AskBrain/RequestToolkit | 不使用 |
| `runEffect` | 执行 LLM/Tool 调用 | 不使用 |
