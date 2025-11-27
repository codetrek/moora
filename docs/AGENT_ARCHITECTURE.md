# Agent 架构设计文档

本文档描述了基于 Moorex 的 AI Agent 系统的架构设计，包括各个包的职责边界和相互之间的关系。

## 概述

Agent 系统被设计为 4 个独立的包，每个包都有明确的职责边界：

1. **@moora/agent-webui-protocol** - 协议定义层
2. **@moora/agent-core** - 核心逻辑层
3. **@moora/agent-webui** - 前端应用层
4. **@moora/agent-service** - 服务端层

这种分层设计实现了关注点分离，使得每个包都可以独立迭代和测试。

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    @moora/agent-webui                       │
│  (React + MUI 前端应用)                                       │
│  - 接收 AgentController (依赖注入)                           │
│  - 使用 useAgentController hook                              │
│  - 完全基于 protocol 定义的类型                               │
└────────────────────┬────────────────────────────────────────┘
                     │ 使用
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            @moora/agent-webui-protocol                      │
│  (协议定义层 - 类型定义)                                      │
│  - AgentAppState: 用户可见的状态                             │
│  - AgentAppEvent: 用户可触发的事件                           │
│  - AgentController: 前端控制器接口                           │
└────────────────────┬────────────────────────────────────────┘
                     │ 实现
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 @moora/agent-core                           │
│  (核心逻辑层)                                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Agent State Machine                                  │  │
│  │ - AgentState, AgentInput (前后端共用)                │  │
│  │ - initial, transition                                │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Frontend Controller                                  │  │
│  │ - mapAppState: AgentState → AgentAppState            │  │
│  │ - interpretAppEvent: AgentAppEvent → AgentInput[]    │  │
│  │ - createAgentController: 实现 AgentController        │  │
│  │   - 通过 POST 发送 Input                             │  │
│  │   - 通过 SSE 监听 state-updated 事件                 │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Agent Moorex                                          │  │
│  │ - AgentEffect 类型定义                                │  │
│  │ - effectsAt: AgentState → Record<string, Effect>    │  │
│  │ - runEffect: 处理 LLM & Tool Effects                 │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │ 使用
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              @moora/agent-service                           │
│  (服务端层)                                                   │
│  - 基于 @moora/moorex-fastify                               │
│  - 集成 Agent State Machine                                 │
│  - 集成 Agent Moorex (effectsAt, runEffect)                 │
│  - 提供 HTTP API (POST + SSE)                               │
└─────────────────────────────────────────────────────────────┘
```

## 包职责详解

### 1. @moora/agent-webui-protocol

**职责边界：**
- ✅ 定义前端和后端之间的通信协议
- ✅ 定义用户可见的状态类型（AgentAppState）
- ✅ 定义用户可触发的事件类型（AgentAppEvent）
- ✅ 定义前端控制器接口（AgentController）
- ❌ 不包含任何实现逻辑
- ❌ 不依赖其他 Agent 相关包

**核心类型：**

```typescript
// 用户可见的状态
type AgentAppState = {
  status: 'idle' | 'thinking' | 'responding' | 'error';
  messages: AgentMessage[];
  error?: string;
  isProcessing: boolean;
};

// 用户可触发的事件
type AgentAppEvent =
  | { type: 'user-message'; content: string }
  | { type: 'cancel' }
  | { type: 'retry' }
  | { type: 'clear' };

// 前端控制器接口
type AgentController = {
  subscribe(handler: (state: AgentAppState) => void): Unsubscribe;
  notify(event: AgentAppEvent): void;
};
```

**设计原则：**
- 这是一个**纯类型定义包**，不包含任何运行时逻辑
- 前端应用完全基于这些类型定义，不预设实现
- 通过依赖注入的方式接收 `AgentController` 实例

### 2. @moora/agent-core

**职责边界：**
- ✅ 实现 Agent 状态机（前后端共用）
- ✅ 实现前端控制器（将协议类型转换为内部类型）
- ✅ 实现 Agent Moorex（Effects 处理逻辑）
- ✅ 提供状态转换函数
- ❌ 不包含 UI 实现
- ❌ 不包含服务端框架集成

**核心模块：**

#### 2.1 Agent State Machine

**文件：** `src/agent-state.ts`

**职责：**
- 定义 `AgentState`（内部状态，包含所有实现细节）
- 定义 `AgentInput`（状态机输入信号）
- 实现 `initial` 和 `transition` 函数
- 前后端共用，确保状态同步

**关键设计：**
- `AgentState` 包含完整的内部状态（LLM 历史、Tool 历史等）
- `AgentInput` 包含所有可能的状态转换信号
- 状态转换函数是纯函数，易于测试

#### 2.2 Frontend Controller

**文件：** `src/frontend-controller.ts`

**职责：**
- `mapAppState`: 将内部 `AgentState` 映射为用户可见的 `AgentAppState`
- `interpretAppEvent`: 将用户事件 `AgentAppEvent` 解释为内部 `AgentInput[]`
- `createAgentController`: 创建 `AgentController` 实例

**关键设计：**
- 前端控制器通过 POST 请求发送 `AgentInput[]` 到服务端
- 前端控制器通过 SSE 监听 `state-updated` 事件来更新状态
- 状态映射函数隐藏内部实现细节，只暴露用户需要的信息

**通信流程：**
```
用户操作 → AgentAppEvent → interpretAppEvent → AgentInput[] → POST 请求
                                                                    ↓
状态更新 ← mapAppState ← AgentState ← SSE (state-updated) ← 服务端
```

#### 2.3 Agent Moorex

**文件：** `src/agent-moorex.ts`（待实现）

**职责：**
- 定义 `AgentEffect` 类型（LLM 调用、Tool 调用等）
- 实现 `effectsAt`: 从 `AgentState` 计算当前需要的 Effects
- 实现 `runEffect`: 执行 Effect（调用 LLM、调用 Tool 等）

**关键设计：**
- Effects 不包含向用户发送消息（前端通过同步状态获取消息）
- Effects 主要包括：
  - `CallLLMEffect`: 调用 LLM
  - `CallToolEffect`: 调用 Tool
- `effectsAt` 函数根据状态决定需要执行哪些 Effects
- `runEffect` 函数执行 Effect 并通过 `dispatch` 产生新的 `AgentInput`

### 3. @moora/agent-webui

**职责边界：**
- ✅ 实现基于 React + MUI 的前端 UI
- ✅ 完全基于 `@moora/agent-webui-protocol` 的类型
- ✅ 通过依赖注入接收 `AgentController`
- ✅ 提供 `useAgentController` hook
- ❌ 不包含 Agent 业务逻辑
- ❌ 不直接依赖 `@moora/agent-core`

**核心设计：**
- 前端应用不预设 `AgentController` 的实现
- 在创建应用实例时注入 `AgentController`
- 通过 `useAgentController` hook 获取状态和发送事件的回调

**示例：**
```typescript
// 应用入口
function App({ controller }: { controller: AgentController }) {
  const { state, notify } = useAgentController(controller);
  
  return (
    <div>
      {/* UI 实现 */}
    </div>
  );
}

// 创建应用
const controller = createAgentController({ endpoint: '/api/agent' });
ReactDOM.render(<App controller={controller} />, root);
```

### 4. @moora/agent-service

**职责边界：**
- ✅ 集成 `@moora/moorex-fastify` 提供 HTTP API
- ✅ 使用 `@moora/agent-core` 的状态机和 Moorex
- ✅ 配置 LLM 和 Tool 的具体实现
- ✅ 启动 Fastify 服务器
- ❌ 不包含前端 UI
- ❌ 不包含核心业务逻辑（由 agent-core 提供）

**核心设计：**
- 基于 `@moora/moorex-fastify` 创建 MoorexNode
- 使用 `agentStateMachine` 创建 Moorex 实例
- 配置 `effectsAt` 和 `runEffect` 函数
- 提供 POST 和 SSE 端点

**示例：**
```typescript
// 创建 Moorex 定义
const agentMoorexDefinition: MoorexDefinition<AgentInput, AgentEffect, AgentState> = {
  initial: initialAgentState,
  transition: agentTransition,
  effectsAt: agentEffectsAt,  // 从 agent-core 导入
  runEffect: agentRunEffect,  // 从 agent-core 导入，但需要配置 LLM/Tool
};

// 创建 Moorex 实例
const moorex = createMoorex(agentMoorexDefinition);

// 创建 Fastify 节点
const moorexNode = createMoorexNode({
  moorex,
  handlePost: async (input, dispatch) => {
    const inputs: AgentInput[] = JSON.parse(input);
    dispatch(inputs);
    return { code: 200, content: JSON.stringify({ success: true }) };
  },
});

// 注册到 Fastify
await fastify.register(moorexNode.register, { prefix: '/api/agent' });
```

## 数据流

### 用户发送消息流程

```
1. 用户在 UI 中输入消息
   ↓
2. UI 调用 controller.notify({ type: 'user-message', content: '...' })
   ↓
3. Frontend Controller 的 interpretAppEvent 将事件转换为 AgentInput[]
   ↓
4. Frontend Controller 通过 POST 请求发送 AgentInput[] 到服务端
   ↓
5. 服务端的 handlePost 接收请求，调用 moorex.dispatch(input)
   ↓
6. Moorex 执行状态转换：transition(input)(state) → newState
   ↓
7. Moorex 计算新的 Effects：effectsAt(newState) → Record<string, Effect>
   ↓
8. Moorex 启动新的 Effects（如 CallLLMEffect）
   ↓
9. runEffect 执行 Effect（调用 LLM API）
   ↓
10. LLM 响应后，runEffect 调用 dispatch({ type: 'llm-response', ... })
   ↓
11. Moorex 再次执行状态转换，更新消息列表
   ↓
12. Moorex 发布 state-updated 事件
   ↓
13. 服务端通过 SSE 将事件发送给前端
   ↓
14. Frontend Controller 接收 state-updated 事件，调用 mapAppState
   ↓
15. Frontend Controller 发布新的 AgentAppState
   ↓
16. UI 通过 subscribe 接收更新，重新渲染
```

### 状态同步机制

- **前端 → 后端：** POST 请求发送 `AgentInput[]`
- **后端 → 前端：** SSE 流发送 `state-updated` 事件
- **状态映射：** `AgentState` (内部) ↔ `AgentAppState` (用户可见)

## 依赖关系

```
@moora/agent-webui
  └─> @moora/agent-webui-protocol (仅类型)

@moora/agent-core
  ├─> @moora/moorex (核心状态机)
  └─> @moora/agent-webui-protocol (协议类型)

@moora/agent-service
  ├─> @moora/moorex-fastify (HTTP 集成)
  ├─> @moora/agent-core (状态机和 Moorex)
  └─> fastify (Web 框架)

@moora/agent-webui-protocol
  └─> (无依赖，纯类型定义)
```

## 设计原则

### 1. 关注点分离

每个包都有明确的职责边界，互不干扰：
- **Protocol**: 只定义接口，不包含实现
- **Core**: 只包含业务逻辑，不包含 UI 或框架集成
- **WebUI**: 只包含 UI 实现，不包含业务逻辑
- **Service**: 只包含服务端集成，不包含业务逻辑

### 2. 依赖注入

前端应用不预设 `AgentController` 的实现，通过依赖注入的方式接收：
- 便于测试（可以注入 mock controller）
- 便于替换实现（可以有不同的 controller 实现）
- 降低耦合度

### 3. 类型安全

所有包之间的交互都通过明确的类型定义：
- Protocol 包定义所有接口类型
- Core 包实现这些接口
- 其他包使用这些类型确保类型安全

### 4. 前后端状态同步

通过共享状态机定义确保前后端状态一致：
- `AgentState` 和 `AgentInput` 在前后端共用
- 前端通过 `mapAppState` 隐藏内部细节
- 后端通过 SSE 实时同步状态

## 扩展性

### 迭代不同版本的 Agent

由于核心逻辑在 `@moora/agent-core` 中，可以创建多个版本的实现：

```typescript
// agent-core/src/v1/agent-state.ts
export const agentStateMachineV1 = { ... };

// agent-core/src/v2/agent-state.ts
export const agentStateMachineV2 = { ... };
```

### 替换前端实现

由于前端完全基于 Protocol 定义，可以轻松替换前端实现：

```typescript
// 使用 React
import { createAgentController } from '@moora/agent-core';
const controller = createAgentController({ endpoint: '/api/agent' });

// 使用 Vue
// 同样的 controller 接口，不同的 UI 框架
```

### 替换后端框架

由于服务端逻辑在 Core 中，可以轻松替换后端框架：

```typescript
// 当前：基于 Fastify
import { createMoorexNode } from '@moora/moorex-fastify';

// 未来：可以创建 @moora/moorex-express
import { createMoorexNode } from '@moora/moorex-express';
```

## 总结

这个架构设计实现了：

1. **清晰的职责边界**：每个包都有明确的职责
2. **松耦合**：通过协议和依赖注入降低耦合
3. **类型安全**：所有交互都通过类型定义
4. **易于测试**：每个包都可以独立测试
5. **易于扩展**：可以轻松迭代和替换实现

通过这种分层设计，我们可以：
- 独立开发和测试每个包
- 轻松替换实现（如不同的 UI 框架、不同的后端框架）
- 保持代码的可维护性和可扩展性

