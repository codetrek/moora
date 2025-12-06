/**
 * Contexts 类型定义
 *
 * 一个 Actor 的 Context 就是所有它发出的 Observation 的并集（所有出边的 Observation）
 */

import { z } from "zod";
import type { UserObUser, UserObLlm, LlmObUser, LlmObLlm } from "./observations";
import { userObUserSchema, userObLlmSchema, llmObUserSchema, llmObLlmSchema } from "./observations";

// ============================================================================
// Context Schema 定义
// ============================================================================

/**
 * User 的上下文 = 所有 User 发出的 Observation 的并集
 * User 的出边：UserObUser（自环）, UserObLlm
 */
export const contextOfUserSchema = z.object({
  ...userObUserSchema.shape,
  ...userObLlmSchema.shape,
});

export type ContextOfUser = UserObUser & UserObLlm;

/**
 * Llm 的上下文 = 所有 Llm 发出的 Observation 的并集
 * Llm 的出边：LlmObUser, LlmObLlm（自环）
 */
export const contextOfLlmSchema = z.object({
  ...llmObUserSchema.shape,
  ...llmObLlmSchema.shape,
});

export type ContextOfLlm = LlmObUser & LlmObLlm;
