/**
 * Workforce 实现
 *
 * 维护 Task tree 和 Agent 池，自动调度 Worker Agent 完成分配的任务
 */

import { v4 as uuidv4 } from "uuid";
import {
  createAgent,
  createReaction,
  createLlmReaction,
  createToolkitReaction,
  createUserReaction,
} from "@moora/agent-worker";
import type { Agent, Actuation, AgentUpdatePack, Worldscape } from "@moora/agent-worker";
import { createToolkit } from "@moora/toolkit";
import type { Toolkit, ToolDefinition } from "@moora/toolkit";

import {
  ROOT_TASK_ID,
  type TaskId,
  type Workforce,
  type WorkforceConfig,
  type CreateTaskInput,
  type AppendMessageInput,
  type Task,
  type TaskRuntimeStatus,
} from "../types";
import { createTaskTree, type TaskTree } from "./task-tree";
import {
  isPseudoTool,
  parsePseudoToolCall,
  createPseudoToolDefinitions,
  pseudoToolInfos,
} from "./pseudo-tools";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 工作中的 Agent 实例
 */
type WorkingAgent = {
  /** Agent 实例 */
  agent: Agent;
  /** 正在处理的 Task ID */
  taskId: TaskId;
  /** 取消订阅函数 */
  unsubscribe: () => void;
};

// ============================================================================
// Workforce 实现
// ============================================================================

/**
 * 创建 Workforce
 *
 * @param config - Workforce 配置
 * @returns Workforce 实例
 */
export function createWorkforce(config: WorkforceConfig): Workforce {
  const { maxAgents, toolkit: userToolkit, callLlm } = config;

  // 创建 Task Tree
  const taskTree = createTaskTree();

  // 工作中的 Agent 池
  const workingAgents = new Map<TaskId, WorkingAgent>();

  // 是否已销毁
  let destroyed = false;

  // ============================================================================
  // 内部函数
  // ============================================================================

  /**
   * 创建合并了伪工具的 Toolkit
   */
  function createCombinedToolkit(): Toolkit {
    const pseudoToolDefs = createPseudoToolDefinitions();
    const userToolInfos = userToolkit.getAllToolInfos();

    // 合并用户工具和伪工具
    const allToolDefs: ToolDefinition[] = [
      ...userToolInfos.map((info) => ({
        ...info,
        execute: (params: string) => userToolkit.invoke(info.name, params),
      })),
      ...pseudoToolDefs,
    ];

    return createToolkit(allToolDefs);
  }

  /**
   * 为指定 Task 创建 Worker Agent
   */
  function createWorkerAgent(taskId: TaskId): WorkingAgent | undefined {
    const task = taskTree.getTask(taskId);
    if (!task) return undefined;

    const combinedToolkit = createCombinedToolkit();

    // 创建 callTool 函数，拦截伪工具
    const callTool = async (request: { toolCallId: string; name: string; arguments: string }) => {
      const pseudoCall = parsePseudoToolCall(request.name, request.arguments);

      if (pseudoCall) {
        // 伪工具调用，处理 task 状态
        handlePseudoToolCall(taskId, pseudoCall);
        return JSON.stringify({ status: "acknowledged" });
      }

      // 普通工具调用
      return combinedToolkit.invoke(request.name, request.arguments);
    };

    // 获取工具定义列表
    const toolDefs = combinedToolkit.getAllToolInfos().map((info) => ({
      name: info.name,
      description: info.description,
      parameters: JSON.stringify(info.parameterSchema),
    }));

    // 创建 reaction
    const reaction = createReaction({
      user: createUserReaction({
        notifyUser: () => {
          // 可以在这里添加日志或其他通知
        },
      }),
      llm: createLlmReaction({
        callLlm,
        tools: toolDefs,
        onStart: (messageId: string) => {
          taskTree.appendAssistantMessage(taskId, {
            id: messageId,
            content: "",
            timestamp: Date.now(),
            streaming: true,
          });
        },
        onChunk: (messageId: string, chunk: string) => {
          const task = taskTree.getTaskData(taskId);
          if (!task) return;
          const message = task.assistantMessages.find((m) => m.id === messageId);
          if (message) {
            const newContent = message.content + chunk;
            taskTree.updateAssistantMessage(taskId, messageId, newContent, true);
            // 发布流式事件
            taskTree.taskDetailEventPubSub.pub({
              type: "task-detail-stream-chunk",
              taskId,
              messageId,
              chunk,
              timestamp: Date.now(),
            });
          }
        },
        onComplete: (messageId: string, content: string) => {
          taskTree.updateAssistantMessage(taskId, messageId, content, false);
          // 发布完成事件
          taskTree.taskDetailEventPubSub.pub({
            type: "task-detail-stream-complete",
            taskId,
            messageId,
            content,
            timestamp: Date.now(),
          });
        },
      }),
      toolkit: createToolkitReaction({
        callTool: async (request: { toolCallId: string; name: string; arguments: string }) => {
          const result = await callTool(request);

          // 记录工具调用
          taskTree.appendToolCallRequest(taskId, {
            toolCallId: request.toolCallId,
            name: request.name,
            arguments: request.arguments,
            requestedAt: Date.now(),
          });

          taskTree.appendToolCallResponse(taskId, {
            toolCallId: request.toolCallId,
            result,
            respondedAt: Date.now(),
          });

          return result;
        },
      }),
    });

    // 创建 Agent
    const agent = createAgent(reaction);

    // 订阅 Agent 更新
    const unsubscribe = agent.subscribe((update: AgentUpdatePack) => {
      // 可以在这里添加额外的日志或处理
    });

    return { agent, taskId, unsubscribe };
  }

  /**
   * 处理伪工具调用
   */
  function handlePseudoToolCall(
    taskId: TaskId,
    call: ReturnType<typeof parsePseudoToolCall>
  ): void {
    if (!call) return;

    const task = taskTree.getTask(taskId);
    if (!task) return;

    switch (call.type) {
      case "succeed":
        taskTree.succeedTask(taskId, call.params.conclusion);
        destroyAgent(taskId);
        break;

      case "fail":
        taskTree.failTask(taskId, call.params.error);
        destroyAgent(taskId);
        break;

      case "breakdown":
        // 创建子任务
        for (const subtask of call.params.subtasks) {
          const subtaskId = uuidv4();
          taskTree.createTask({
            id: subtaskId,
            title: subtask.title,
            goal: subtask.description,
            parentId: taskId,
          });
        }
        // 更新父任务状态为 pending
        taskTree.setPending(taskId);
        destroyAgent(taskId);
        break;
    }

    // 尝试调度下一个任务
    scheduleNext();
  }

  /**
   * 销毁指定 Task 的 Agent
   */
  function destroyAgent(taskId: TaskId): void {
    const workingAgent = workingAgents.get(taskId);
    if (workingAgent) {
      workingAgent.unsubscribe();
      workingAgents.delete(taskId);
    }
  }

  /**
   * 调度下一个任务
   */
  function scheduleNext(): void {
    if (destroyed) return;
    if (workingAgents.size >= maxAgents) return;

    const nextTaskId = taskTree.getNextReadyTask();
    if (!nextTaskId) return;

    // 更新任务状态
    taskTree.startProcessing(nextTaskId);

    // 创建 Agent
    const workingAgent = createWorkerAgent(nextTaskId);
    if (!workingAgent) return;

    workingAgents.set(nextTaskId, workingAgent);

    // 发送初始用户消息
    const task = taskTree.getTask(nextTaskId);
    if (task && task.userMessages.length > 0) {
      for (const msg of task.userMessages) {
        workingAgent.agent.dispatch({
          type: "send-user-message",
          id: msg.id,
          content: msg.content,
          timestamp: msg.timestamp,
        });
      }
    }

    // 继续调度更多任务
    scheduleNext();
  }

  // ============================================================================
  // Workforce API 实现
  // ============================================================================

  /**
   * 创建一组 Task
   */
  function createTasks(tasks: CreateTaskInput[]): void {
    for (const taskInput of tasks) {
      taskTree.createTask({
        id: taskInput.id,
        title: taskInput.title,
        goal: taskInput.goal,
        parentId: taskInput.parentId ?? ROOT_TASK_ID,
      });
    }

    // 触发调度
    scheduleNext();
  }

  /**
   * 向 Task 追加补充信息
   */
  function appendMessage(input: AppendMessageInput): void {
    const { content, taskIds } = input;
    const now = Date.now();

    for (const taskId of taskIds) {
      const messageId = `msg-${taskId}-${uuidv4()}`;

      taskTree.appendUserMessage(taskId, {
        id: messageId,
        content,
        timestamp: now,
      });

      // 如果 Task 正在被处理，通知 Agent
      const workingAgent = workingAgents.get(taskId);
      if (workingAgent) {
        workingAgent.agent.dispatch({
          type: "send-user-message",
          id: messageId,
          content,
          timestamp: now,
        });
      }
    }
  }

  /**
   * 取消一组 Task
   */
  function cancelTasks(taskIds: TaskId[]): void {
    for (const taskId of taskIds) {
      // 销毁正在运行的 Agent
      destroyAgent(taskId);
      // 更新 Task 状态
      taskTree.cancelTask(taskId);
    }

    // 触发调度
    scheduleNext();
  }

  /**
   * 获取指定 Task 的完整信息
   */
  function getTask(taskId: TaskId): Task | undefined {
    return taskTree.getTask(taskId);
  }

  /**
   * 获取指定 Task 的运行时状态
   */
  function getTaskStatus(taskId: TaskId): TaskRuntimeStatus | undefined {
    return taskTree.getTaskStatus(taskId);
  }

  /**
   * 获取所有 Task 的 ID 列表
   */
  function getAllTaskIds(): TaskId[] {
    return taskTree.getAllTaskIds();
  }

  /**
   * 获取指定 Task 的子任务 ID 列表
   */
  function getChildTaskIds(taskId: TaskId): TaskId[] {
    return taskTree.getChildTaskIds(taskId);
  }

  /**
   * 销毁 Workforce
   */
  function destroy(): void {
    destroyed = true;

    // 销毁所有 Agent
    for (const [taskId] of workingAgents) {
      destroyAgent(taskId);
    }
  }

  return {
    createTasks,
    appendMessage,
    cancelTasks,
    getTask,
    getTaskStatus,
    getAllTaskIds,
    getChildTaskIds,
    subscribeTaskEvent: taskTree.taskEventPubSub.sub,
    subscribeTaskDetailEvent: taskTree.taskDetailEventPubSub.sub,
    destroy,
  };
}
