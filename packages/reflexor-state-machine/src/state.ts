// ============================================================================
// Reflexor State 类型定义
// ============================================================================

import { z } from "zod";

// ============================================================================
// 消息类型
// ============================================================================

/**
 * 用户消息
 */
export const userMessageSchema = z
  .object({
    kind: z.literal("user"),
    id: z.string(),
    content: z.string(),
    receivedAt: z.number(),
  })
  .readonly();

export type UserMessage = z.infer<typeof userMessageSchema>;

/**
 * 助手消息
 *
 * 包含两个时间戳：
 * - receivedAt: 消息开始接收的时间（streaming 开始）
 * - updatedAt: 消息最后更新的时间（streaming 完成或内容更新）
 */
export const assistantMessageSchema = z
  .object({
    kind: z.literal("assistant"),
    id: z.string(),
    content: z.string(),
    receivedAt: z.number(),
    updatedAt: z.number(),
  })
  .readonly();

export type AssistantMessage = z.infer<typeof assistantMessageSchema>;

/**
 * 消息类型
 */
export const reflexorMessageSchema = z.discriminatedUnion("kind", [
  userMessageSchema,
  assistantMessageSchema,
]);

export type ReflexorMessage = z.infer<typeof reflexorMessageSchema>;

// ============================================================================
// Tool Call 类型
// ============================================================================

/**
 * Tool Call 请求
 */
export const toolCallRequestSchema = z
  .object({
    name: z.string(),
    parameters: z.string(),
    calledAt: z.number(),
  })
  .readonly();

export type ToolCallRequest = z.infer<typeof toolCallRequestSchema>;

/**
 * Tool Call 成功结果
 */
export const toolCallSuccessSchema = z
  .object({
    isSuccess: z.literal(true),
    content: z.string(),
    receivedAt: z.number(),
  })
  .readonly();

export type ToolCallSuccess = z.infer<typeof toolCallSuccessSchema>;

/**
 * Tool Call 失败结果
 */
export const toolCallFailedSchema = z
  .object({
    isSuccess: z.literal(false),
    error: z.string(),
    receivedAt: z.number(),
  })
  .readonly();

export type ToolCallFailed = z.infer<typeof toolCallFailedSchema>;

/**
 * Tool Call 结果
 */
export const toolCallResultSchema = z.discriminatedUnion("isSuccess", [
  toolCallSuccessSchema,
  toolCallFailedSchema,
]);

export type ToolCallResult = z.infer<typeof toolCallResultSchema>;

/**
 * Tool Call 记录
 *
 * 包含 id 字段，用于唯一标识每个 tool call。
 * isLoaded 标记该 tool call 是否已被加载（用于 context 管理）。
 */
export const toolCallRecordSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    parameters: z.string(),
    calledAt: z.number(),
    result: toolCallResultSchema.nullable(),
    isLoaded: z.boolean(),
  })
  .readonly();

export type ToolCallRecord = z.infer<typeof toolCallRecordSchema>;

// ============================================================================
// 上下文优化类型
// ============================================================================

/**
 * 压缩历史
 *
 * 将截止时间之前的历史压缩为摘要。
 */
export const compressHistorySchema = z
  .object({
    kind: z.literal("compress-history"),
    summary: z.string(),
    cutAt: z.number(),
  })
  .readonly();

export type CompressHistory = z.infer<typeof compressHistorySchema>;

/**
 * 加载历史 Tool Call
 *
 * 将指定的 tool call 标记为已加载，
 * 下次发送给 Brain 时会带上完整详情。
 */
export const loadToolCallSchema = z
  .object({
    kind: z.literal("load-tool-call"),
    toolCallId: z.string(),
  })
  .readonly();

export type LoadToolCall = z.infer<typeof loadToolCallSchema>;

/**
 * 上下文优化操作
 */
export const contextRefinementSchema = z.discriminatedUnion("kind", [
  compressHistorySchema,
  loadToolCallSchema,
]);

export type ContextRefinement = z.infer<typeof contextRefinementSchema>;

// ============================================================================
// 主状态类型
// ============================================================================

/**
 * Reflexor 状态
 *
 * Agent 的完整内部状态，包含历史消息和 Tool Call 记录。
 *
 * 数据组织方式：
 * - userMessages, assistantMessages, toolCallRecords: 按生成时间顺序排序的数组
 *
 * Context 管理：
 * - contextSummary: 压缩后的历史摘要
 * - summaryCutAt: summary 截止时间戳，该时间之前的消息已被压缩
 * - toolCallRecords[].isLoaded: 标记已加载详情的历史 tool calls
 *
 * 发送给 Brain 的 context 构成：
 * - contextSummary 内容
 * - summaryCutAt 之后的 user/assistant messages
 * - Tool calls：
 *   - 完整详情：summaryCutAt 之后的 + isLoaded 为 true 的
 *   - 仅 ID 列表（不带 result）：其他历史 tool calls，供后续加载
 */
export const reflexorStateSchema = z
  .object({
    /**
     * 状态最后更新时间戳（Unix 时间戳，毫秒）
     *
     * 用于时间不可逆检查。
     */
    updatedAt: z.number(),

    /**
     * 用户消息列表
     *
     * 按 receivedAt 时间顺序排序的数组。
     */
    userMessages: z.array(userMessageSchema).readonly(),

    /**
     * 助手消息列表
     *
     * 按 receivedAt 时间顺序排序的数组。
     */
    assistantMessages: z.array(assistantMessageSchema).readonly(),

    /**
     * Tool Call 记录列表
     *
     * 按 calledAt 时间顺序排序的数组。
     */
    toolCallRecords: z.array(toolCallRecordSchema).readonly(),

    /**
     * 最近一次调用 LLM 的时间戳
     *
     * 用于判断是否需要再次调用 LLM。
     */
    calledBrainAt: z.number(),

    /**
     * 上下文摘要
     *
     * 压缩后的历史摘要，空字符串表示没有摘要。
     */
    contextSummary: z.string(),

    /**
     * 摘要截止时间戳
     *
     * summary 截止时间戳，该时间之前的消息已被压缩。
     * 0 表示没有摘要。
     */
    summaryCutAt: z.number(),
  })
  .readonly();

export type ReflexorState = z.infer<typeof reflexorStateSchema>;

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
