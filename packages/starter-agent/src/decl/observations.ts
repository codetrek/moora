/**
 * Observations 类型定义
 *
 * Observation 是 Actor 相互之间的观察，它是被观察 Actor 状态的切片。
 * 例如 UserObLlm 表示 User Actor 对 Llm Actor 的观察。
 */

import { z } from "zod";

// ============================================================================
// 基础数据类型 Schema（供 Observations、States、Contexts 复用）
// ============================================================================

/**
 * 基础消息 Schema
 */
export const baseMessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  timestamp: z.number(),
});

export type BaseMessage = z.infer<typeof baseMessageSchema>;

/**
 * 用户消息 Schema
 */
export const userMessageSchema = baseMessageSchema.extend({
  role: z.literal("user"),
});

export type UserMessage = z.infer<typeof userMessageSchema>;

/**
 * 助手消息 Schema
 */
export const assiMessageSchema = baseMessageSchema.extend({
  role: z.literal("assistant"),
});

export type AssiMessage = z.infer<typeof assiMessageSchema>;

/**
 * 用户消息列表类型
 */
export type UserMessages = UserMessage[];

/**
 * 助手消息列表类型
 */
export type AssiMessages = AssiMessage[];

// ============================================================================
// Observation Schema 定义
// ============================================================================

/**
 * User 对 Llm 的观察 Schema
 */
export const userObLlmSchema = z.object({
  assiMessages: z.array(assiMessageSchema),
});

export type UserObLlm = z.infer<typeof userObLlmSchema>;

/**
 * User 对自身的观察 Schema（自环）
 */
export const userObUserSchema = z.object({
  userMessages: z.array(userMessageSchema),
});

export type UserObUser = z.infer<typeof userObUserSchema>;

/**
 * Llm 对自身的观察 Schema（自环）
 */
export const llmObLlmSchema = z.object({
  assiMessages: z.array(assiMessageSchema),
});

export type LlmObLlm = z.infer<typeof llmObLlmSchema>;

/**
 * Llm 对 User 的观察 Schema
 */
export const llmObUserSchema = z.object({
  userMessages: z.array(userMessageSchema),
});

export type LlmObUser = z.infer<typeof llmObUserSchema>;
