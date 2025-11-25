import { z } from 'zod';

// ============================================================================
// Effect 类型定义 - Zod Schemas
// ============================================================================

/**
 * 发送消息 Effect
 */
export const SendMessageEffectSchema = z.object({
  kind: z.literal('send-message'),
  channelId: z.number(),
  content: z.string(),
});

/**
 * 启动 ReAct 循环 Effect
 */
export const ReactLoopEffectSchema = z.object({
  kind: z.literal('react-loop'),
  channelId: z.number(),
  message: z.string(),
});

/**
 * 调用工具 Effect
 */
export const CallToolEffectSchema = z.object({
  kind: z.literal('call-tool'),
  reactLoopId: z.string(),
  toolName: z.string(),
  input: z.unknown(),
});

/**
 * 调用 LLM Effect
 */
export const CallLLMEffectSchema = z.object({
  kind: z.literal('call-llm'),
  reactLoopId: z.string(),
  prompt: z.string(),
});

/**
 * Volition 的 Effect
 * 
 * 根据状态决定需要执行的副作用
 */
export const VolitionEffectSchema = z.discriminatedUnion('kind', [
  SendMessageEffectSchema,
  ReactLoopEffectSchema,
  CallToolEffectSchema,
  CallLLMEffectSchema,
]);

// ============================================================================
// TypeScript 类型导出（通过 z.infer 从 Zod Schema 推导）
// ============================================================================

export type SendMessageEffect = z.infer<typeof SendMessageEffectSchema>;
export type ReactLoopEffect = z.infer<typeof ReactLoopEffectSchema>;
export type CallToolEffect = z.infer<typeof CallToolEffectSchema>;
export type CallLLMEffect = z.infer<typeof CallLLMEffectSchema>;
export type VolitionEffect = z.infer<typeof VolitionEffectSchema>;

