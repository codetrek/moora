# @moora/agent-webui-protocol

Agent Web UI 的协议定义 - 定义 `AgentAppState`、`AgentAppEvent` 和 `AgentController` 类型。

## 概述

这个包提供了 Agent Web UI 和后端 Agent 之间通信协议的类型定义。它定义了：

- **AgentAppState**: 用户可见的 Agent 状态
- **AgentAppEvent**: 用户可以通过 Web UI 触发的事件类型
- **AgentController**: 前端应用与 Agent 交互的接口

## 安装

```bash
bun add @moora/agent-webui-protocol
```

## 使用

```typescript
import type { AgentController, AgentAppState, AgentAppEvent } from '@moora/agent-webui-protocol';

// 订阅状态变化
const unsubscribe = controller.subscribe((state: AgentAppState) => {
  console.log('Agent 状态:', state);
});

// 发送事件
controller.notify({
  type: 'user-message',
  content: '你好，Agent！'
});

// 完成后取消订阅
unsubscribe();
```

## 类型

### AgentAppState

用户可见的 Agent 状态，包括：
- `status`: 当前状态（idle, thinking, responding, error）
- `messages`: 对话消息列表
- `error`: 错误信息（如果有）
- `isProcessing`: Agent 是否正在处理中

### AgentAppEvent

可以从 Web UI 触发的事件：
- `user-message`: 发送用户消息
- `cancel`: 取消当前操作
- `retry`: 重试上次失败的操作
- `clear`: 清空对话历史

### AgentController

前端应用与 Agent 交互的接口：
- `subscribe(handler)`: 订阅状态变化
- `notify(event)`: 向 Agent 发送事件

## 许可证

MIT

