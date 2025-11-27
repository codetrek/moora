# @moora/agent-core

Agent 核心逻辑 - 状态机、前端控制器和 Agent Moorex 实现。

## 概述

这个包提供了 Agent 系统的核心业务逻辑，包括：

- **Agent State Machine**: 前后端共用的状态机定义
- **Frontend Controller**: 将协议类型和内部类型桥接的实现
- **Agent Moorex**: 服务端 Effects 处理逻辑

## 安装

```bash
bun add @moora/agent-core
```

## 使用

### Agent State Machine

```typescript
import { agentStateMachine, initialAgentState, agentTransition } from '@moora/agent-core';

// 获取初始状态
const state = initialAgentState();

// 应用状态转换
const newState = agentTransition({ type: 'user-message', requestId: 'req-1', content: '你好' })(state);
```

### Frontend Controller

```typescript
import { createAgentController } from '@moora/agent-core';

// 创建控制器
const controller = createAgentController({
  endpoint: 'http://localhost:3000/api/agent',
});

// 订阅状态变化
const unsubscribe = controller.subscribe((state) => {
  console.log('Agent 状态:', state);
});

// 发送事件
controller.notify({
  type: 'user-message',
  content: '你好，Agent！',
});

// 清理
unsubscribe();
```

### Agent Moorex

```typescript
import { createAgentMoorexDefinition } from '@moora/agent-core';
import { createMoorex } from '@moora/moorex';

// 定义 LLM 和 Tools
const callLLM = async ({ prompt }) => {
  // 调用你的 LLM API
  return 'LLM 的响应';
};

const tools = {
  search: {
    name: 'search',
    description: '搜索网络',
    execute: async (args) => {
      // 执行工具
      return { results: [] };
    },
  },
};

// 创建 Moorex 定义
const definition = createAgentMoorexDefinition({
  callLLM,
  tools,
});

// 创建 Moorex 实例
const moorex = createMoorex(definition);
```

## API

### Agent State Machine

- `initialAgentState()`: 返回初始 Agent 状态
- `agentTransition(input)`: 返回状态转换函数
- `agentStateMachine`: 完整的状态机定义

### Frontend Controller

- `mapAppState(state)`: 将内部 `AgentState` 映射为用户可见的 `AgentAppState`
- `interpretAppEvent(event)`: 将 `AgentAppEvent` 转换为 `AgentInput[]`
- `createAgentController(options)`: 创建 `AgentController` 实例

### Agent Moorex

- `agentEffectsAt(state)`: 从状态计算 Effects
- `createAgentRunEffect(options)`: 创建 Effect 运行函数
- `createAgentMoorexDefinition(options)`: 创建完整的 Moorex 定义

## 许可证

MIT

