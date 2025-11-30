// ============================================================================
// Reflexor Input 类型定义
// ============================================================================

import { z } from "zod";
import { toolCallRequestSchema } from "./state";

// ============================================================================
// 基础类型
// ============================================================================

/**
 * 基础 Input Schema
 *
 * 所有 Input 都必须包含 timestamp 字段。
 */
export const baseInputSchema = z.object({
  timestamp: z.number(),
});

export type BaseInput = z.infer<typeof baseInputSchema>;

/**
 * Brain Input 基础 Schema
 *
 * 所有 Brain Input 都必须包含 calledBrainAt 字段，
 * 标记这是哪次 askBrain 的响应。
 */
export const baseBrainInputSchema = baseInputSchema.extend({
  calledBrainAt: z.number(),
});

export type BaseBrainInput = z.infer<typeof baseBrainInputSchema>;

// ============================================================================
// User Inputs - 来自用户的输入
// ============================================================================

/**
 * 用户发送消息
 */
export const userSendMessageSchema = baseInputSchema.extend({
  type: z.literal("user-send-message"),
  messageId: z.string(),
  content: z.string(),
});

export type UserSendMessage = z.infer<typeof userSendMessageSchema>;

// ============================================================================
// Brain Inputs - 来自大模型的输入
// ============================================================================

/**
 * Brain 压缩历史
 *
 * 将截止时间之前的历史压缩为摘要。
 */
export const brainCompressHistorySchema = baseBrainInputSchema.extend({
  type: z.literal("brain-compress-history"),
  summary: z.string(),
  cutAt: z.number(),
});

export type BrainCompressHistory = z.infer<typeof brainCompressHistorySchema>;

/**
 * Brain 加载历史 Tool Call
 *
 * 将指定的 tool call 标记为已加载，
 * 下次发送给 Brain 时会带上完整详情。
 */
export const brainLoadToolCallSchema = baseBrainInputSchema.extend({
  type: z.literal("brain-load-tool-call"),
  toolCallId: z.string(),
});

export type BrainLoadToolCall = z.infer<typeof brainLoadToolCallSchema>;

/**
 * Brain 请求调用工具
 */
export const brainCallToolsSchema = baseBrainInputSchema.extend({
  type: z.literal("brain-call-tools"),
  toolCalls: z.record(z.string(), toolCallRequestSchema).readonly(),
});

export type BrainCallTools = z.infer<typeof brainCallToolsSchema>;

/**
 * Brain 开始输出消息
 *
 * 标记流式输出的开始，此时在 state 中创建空内容的 assistant message。
 */
export const brainSendMessageStartSchema = baseBrainInputSchema.extend({
  type: z.literal("brain-send-message-start"),
  messageId: z.string(),
});

export type BrainSendMessageStart = z.infer<typeof brainSendMessageStartSchema>;

/**
 * Brain 完成输出消息
 *
 * 流式输出完成，更新 state 中的 assistant message 为完整内容。
 */
export const brainSendMessageCompleteSchema = baseBrainInputSchema.extend({
  type: z.literal("brain-send-message-complete"),
  messageId: z.string(),
  content: z.string(),
});

export type BrainSendMessageComplete = z.infer<
  typeof brainSendMessageCompleteSchema
>;

// ============================================================================
// Toolkit Inputs - 来自工具集的输入
// ============================================================================

/**
 * Toolkit 返回结果
 */
export const toolkitRespondSchema = baseInputSchema.extend({
  type: z.literal("toolkit-respond"),
  toolCallId: z.string(),
  result: z.string(),
});

export type ToolkitRespond = z.infer<typeof toolkitRespondSchema>;

/**
 * Toolkit 返回错误
 */
export const toolkitErrorSchema = baseInputSchema.extend({
  type: z.literal("toolkit-error"),
  toolCallId: z.string(),
  error: z.string(),
});

export type ToolkitError = z.infer<typeof toolkitErrorSchema>;

// ============================================================================
// 完整的 Input Union 类型
// ============================================================================

/**
 * Reflexor Input Schema
 *
 * 分为三大类：来自 User、来自 Brain、来自 Toolkit。
 */
export const reflexorInputSchema = z.discriminatedUnion("type", [
  // User inputs
  userSendMessageSchema,
  // Brain inputs
  brainCompressHistorySchema,
  brainLoadToolCallSchema,
  brainCallToolsSchema,
  brainSendMessageStartSchema,
  brainSendMessageCompleteSchema,
  // Toolkit inputs
  toolkitRespondSchema,
  toolkitErrorSchema,
]);

export type ReflexorInput = z.infer<typeof reflexorInputSchema>;
