// ============================================================================
// Reflexor State 工具函数
// ============================================================================

import type { ReflexorState, ReflexorMessage, ToolCallRecord } from "./state";

// ============================================================================
// 索引计算函数
// ============================================================================

/**
 * 根据 ID 查找 assistant message 的索引
 *
 * @param state - Reflexor 状态
 * @param id - assistant message ID
 * @returns 索引，如果未找到返回 -1
 */
export function findAssistantMessageIndex(
  state: ReflexorState,
  id: string
): number {
  return state.assistantMessages.findIndex((msg) => msg.id === id);
}

/**
 * 根据 ID 查找 tool call 的索引
 *
 * @param state - Reflexor 状态
 * @param id - tool call ID
 * @returns 索引，如果未找到返回 -1
 */
export function findToolCallIndex(state: ReflexorState, id: string): number {
  return state.toolCallRecords.findIndex((tc) => tc.id === id);
}

/**
 * 获取待处理的 Tool Call IDs
 *
 * @param state - Reflexor 状态
 * @returns 待处理的 tool call IDs（result 为 null 的）
 */
export function getPendingToolCallIds(state: ReflexorState): string[] {
  return state.toolCallRecords
    .filter((tc) => tc.result === null)
    .map((tc) => tc.id);
}

/**
 * 获取已加载详情的 Tool Call IDs
 *
 * @param state - Reflexor 状态
 * @returns 已加载的 tool call IDs（isLoaded 为 true 的）
 */
export function getLoadedToolCallIds(state: ReflexorState): string[] {
  return state.toolCallRecords.filter((tc) => tc.isLoaded).map((tc) => tc.id);
}

// ============================================================================
// 消息查询函数
// ============================================================================

/**
 * 合并用户消息和助手消息，按 receivedAt 时间排序
 *
 * @param state - Reflexor 状态
 * @returns 按时间顺序排序的消息数组
 */
export function getMergedMessages(state: ReflexorState): ReflexorMessage[] {
  const allMessages: ReflexorMessage[] = [
    ...state.userMessages,
    ...state.assistantMessages,
  ];

  return allMessages.sort((a, b) => a.receivedAt - b.receivedAt);
}

/**
 * 获取所有消息的 ID 集合
 *
 * @param state - Reflexor 状态
 * @returns 所有消息 ID 的集合
 */
export function getAllMessageIds(state: ReflexorState): Set<string> {
  const ids = new Set<string>();

  for (const msg of state.userMessages) {
    ids.add(msg.id);
  }

  for (const msg of state.assistantMessages) {
    ids.add(msg.id);
  }

  return ids;
}

/**
 * 获取最后一个用户消息的接收时间
 *
 * @param state - Reflexor 状态
 * @returns 最后一个用户消息的 receivedAt，如果没有用户消息则返回 0
 */
export function getLastUserMessageReceivedAt(state: ReflexorState): number {
  const lastMessage = state.userMessages[state.userMessages.length - 1];
  return lastMessage?.receivedAt ?? 0;
}

/**
 * 获取最后一个 Tool Call 结果的接收时间
 *
 * @param state - Reflexor 状态
 * @returns 最后一个有结果的 tool call 的 result.receivedAt，如果没有则返回 0
 */
export function getLastToolCallResultReceivedAt(state: ReflexorState): number {
  let lastReceivedAt = 0;

  for (const toolCall of state.toolCallRecords) {
    if (toolCall.result !== null) {
      lastReceivedAt = Math.max(lastReceivedAt, toolCall.result.receivedAt);
    }
  }

  return lastReceivedAt;
}

/**
 * 检查是否正在等待 Brain 响应
 *
 * 通过检查是否有空的 assistant message（content === ""）来判断是否正在 streaming。
 *
 * @param state - Reflexor 状态
 * @returns 如果正在等待 Brain 响应，返回 true
 */
export function isWaitingBrain(state: ReflexorState): boolean {
  for (const msg of state.assistantMessages) {
    if (msg.content === "") {
      return true;
    }
  }
  return false;
}

// ============================================================================
// Context 相关函数
// ============================================================================

/**
 * 获取 summaryCutAt 之后的消息
 *
 * @param state - Reflexor 状态
 * @returns 按时间排序的消息数组
 */
export function getMessagesAfterCut(state: ReflexorState): ReflexorMessage[] {
  const cutAt = state.summaryCutAt;
  const messages: ReflexorMessage[] = [];

  for (const msg of state.userMessages) {
    if (msg.receivedAt > cutAt) {
      messages.push(msg);
    }
  }

  for (const msg of state.assistantMessages) {
    if (msg.receivedAt > cutAt) {
      messages.push(msg);
    }
  }

  return messages.sort((a, b) => a.receivedAt - b.receivedAt);
}

/**
 * 获取需要发送完整详情的 Tool Calls
 *
 * 包括：summaryCutAt 之后的 + isLoaded 为 true 的
 *
 * @param state - Reflexor 状态
 * @returns Tool Call 记录数组
 */
export function getToolCallsWithDetails(state: ReflexorState): ToolCallRecord[] {
  const cutAt = state.summaryCutAt;
  const result: ToolCallRecord[] = [];

  for (const toolCall of state.toolCallRecords) {
    if (toolCall.calledAt > cutAt || toolCall.isLoaded) {
      result.push(toolCall);
    }
  }

  return result;
}

/**
 * 获取可加载的历史 Tool Call IDs
 *
 * 返回 summaryCutAt 之前且 isLoaded 为 false 的 tool call IDs。
 *
 * @param state - Reflexor 状态
 * @returns Tool Call ID 数组
 */
export function getLoadableToolCallIds(state: ReflexorState): string[] {
  const cutAt = state.summaryCutAt;
  const result: string[] = [];

  for (const toolCall of state.toolCallRecords) {
    if (toolCall.calledAt <= cutAt && !toolCall.isLoaded) {
      result.push(toolCall.id);
    }
  }

  return result;
}

/**
 * 检查所有待处理的 tool-call 是否都已经返回了
 *
 * @param state - Reflexor 状态
 * @returns 如果所有 pending tool-call 都有结果，返回 true
 */
export function areAllPendingToolCallsCompleted(state: ReflexorState): boolean {
  for (const toolCall of state.toolCallRecords) {
    if (toolCall.result === null) {
      return false;
    }
  }
  return true;
}

