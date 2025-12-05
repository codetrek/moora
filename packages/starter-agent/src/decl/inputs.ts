/**
 * Inputs 类型定义
 *
 * 定义各个 Actor 可以 dispatch 的 Input 类型
 */

import { z } from "zod";

// ============================================================================
// Input Schema 定义
// ============================================================================

/**
 * 发送用户消息 Input Schema
 */
export const sendUserMessageSchema = z.object({
  type: z.literal("send-user-message"),
  id: z.string(),
  content: z.string(),
  timestamp: z.number(),
});

export type SendUserMessage = z.infer<typeof sendUserMessageSchema>;

/**
 * 发送助手消息 Input Schema
 */
export const sendAssiMessageSchema = z.object({
  type: z.literal("send-assi-message"),
  id: z.string(),
  content: z.string(),
  timestamp: z.number(),
});

export type SendAssiMessage = z.infer<typeof sendAssiMessageSchema>;

// ============================================================================
// Actor Input 类型定义
// ============================================================================

/**
 * User Actor 可以 dispatch 的 Input
 */
export type InputFromUser = SendUserMessage;

/**
 * Llm Actor 可以 dispatch 的 Input
 */
export type InputFromLlm = SendAssiMessage;
