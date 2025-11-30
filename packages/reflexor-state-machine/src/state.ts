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
