# @moora/workforce

Workforce management for agent task scheduling and coordination.

## Overview

`@moora/workforce` 提供了一个任务调度和协调系统，用于管理 worker agent 池并自动调度它们完成分配的任务。

### 核心功能

- **Task Tree 管理**: 维护一棵任务树，支持任务的创建、拆解、取消等操作
- **Agent 池管理**: 限定最大数量的 agent 池，自动创建和销毁 worker agent
- **自动调度**: 按照 FIFO 规则自动调度就绪的任务
- **事件系统**: 支持任务事件和任务详情事件的订阅

## Installation

```bash
npm install @moora/workforce
```

## Usage

### 基本使用

```typescript
import { createWorkforce, ROOT_TASK_ID } from '@moora/workforce';
import { createToolkit } from '@moora/toolkit';
import type { CallLlm } from '@moora/agent-common';

// 创建 Toolkit
const toolkit = createToolkit([
  // 你的工具定义
]);

// 创建 callLlm 函数
const callLlm: CallLlm = async (context, callbacks) => {
  // 你的 LLM 调用实现
};

// 创建 Workforce
const workforce = createWorkforce({
  maxAgents: 3, // 最多同时运行 3 个 agent
  toolkit,
  callLlm,
});

// 创建任务
workforce.createTasks([
  {
    id: 'task-1',
    title: 'Research Task',
    goal: 'Research the latest developments in AI',
  },
]);

// 监听任务事件
workforce.subscribeTaskEvent((event) => {
  console.log('Task event:', event);
});

// 监听任务详情事件
workforce.subscribeTaskDetailEvent((event) => {
  console.log('Task detail event:', event);
});
```

### Task 状态

每个 Task 可以处于以下状态之一：

- `ready`: 就绪，等待被调度执行
- `pending`: 等待子任务完成
- `processing`: 正在被 agent 处理
- `succeeded`: 成功完成
- `failed`: 失败退出

### 伪工具

Worker Agent 使用以下伪工具来控制任务流程：

- `wf-task-succeed`: 标记任务成功完成
- `wf-task-fail`: 标记任务失败
- `wf-task-breakdown`: 将任务拆解为子任务

### Task Tree

所有任务构成一棵树，根节点是一个虚拟任务（ID 为 `ROOT_TASK_ID`，即全 0 的 UUID）。每个任务都有一个父任务 ID。

```typescript
// 创建子任务
workforce.createTasks([
  {
    id: 'subtask-1',
    title: 'Sub Task 1',
    goal: 'Complete the first part',
    parentId: 'task-1', // 父任务 ID
  },
]);

// 获取子任务列表
const childIds = workforce.getChildTaskIds('task-1');
```

## API

### createWorkforce(config)

创建 Workforce 实例。

**参数:**

- `config.maxAgents`: Agent 池上限
- `config.toolkit`: 用于创建 Agent 的 Toolkit
- `config.callLlm`: LLM 调用函数

**返回:** `Workforce` 实例

### Workforce 接口

#### createTasks(tasks)

创建一组任务。

#### appendMessage(input)

向任务追加补充信息。

#### cancelTasks(taskIds)

取消一组任务。

#### getTask(taskId)

获取指定任务的完整信息。

#### getTaskStatus(taskId)

获取指定任务的运行时状态。

#### getAllTaskIds()

获取所有任务的 ID 列表。

#### getChildTaskIds(taskId)

获取指定任务的子任务 ID 列表。

#### subscribeTaskEvent(handler)

监听任务事件。

#### subscribeTaskDetailEvent(handler)

监听任务详情事件。

#### destroy()

销毁 Workforce，停止所有 Agent，释放资源。

## Task Events

任务事件包括：

- `task-created`: 任务创建
- `task-started`: 任务开始执行
- `task-message-appended`: 任务追加消息
- `task-cancelled`: 任务取消
- `task-succeeded`: 任务成功完成
- `task-failed`: 任务失败退出

## Task Detail Events

任务详情事件包括：

- `task-detail-user-message`: 收到用户消息（包括初始目标）
- `task-detail-stream-chunk`: Worker Agent 流式输出 chunk
- `task-detail-stream-complete`: Worker Agent 流式输出完成
- `task-detail-tool-call-request`: 工具调用请求
- `task-detail-tool-call-response`: 工具调用响应

## License

MIT
