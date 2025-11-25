import { z } from 'zod';

// ============================================================================
// Signal 类型定义 - Zod Schemas
// ============================================================================

/**
 * Channel 消息信号
 */
export const ChannelMessageSignalSchema = z.object({
  type: z.literal('channel-message'),
  channelId: z.number(),
  content: z.string(),
});

/**
 * 工具调用结果信号
 */
export const ToolResultSignalSchema = z.object({
  type: z.literal('tool-result'),
  reactLoopId: z.string(),
  toolName: z.string(),
  result: z.unknown(),
});

/**
 * LLM 响应信号
 */
export const LLMResponseSignalSchema = z.object({
  type: z.literal('llm-response'),
  reactLoopId: z.string(),
  content: z.string(),
});

/**
 * 创建下游 channel 信号
 */
export const CreateChannelSignalSchema = z.object({
  type: z.literal('create-channel'),
  targetVolition: z.unknown().optional(), // 避免循环依赖，使用 unknown
});

/**
 * 关闭 channel 信号
 */
export const CloseChannelSignalSchema = z.object({
  type: z.literal('close-channel'),
  channelId: z.number(),
});

/**
 * ReAct 循环完成信号
 */
export const ReactLoopCompletedSignalSchema = z.object({
  type: z.literal('react-loop-completed'),
  reactLoopId: z.string(),
  response: z.string(),
});

/**
 * Volition 的信号
 * 
 * 触发状态转换的输入事件
 */
export const VolitionSignalSchema = z.discriminatedUnion('type', [
  ChannelMessageSignalSchema,
  ToolResultSignalSchema,
  LLMResponseSignalSchema,
  CreateChannelSignalSchema,
  CloseChannelSignalSchema,
  ReactLoopCompletedSignalSchema,
]);

// ============================================================================
// TypeScript 类型导出（通过 z.infer 从 Zod Schema 推导）
// ============================================================================

export type ChannelMessageSignal = z.infer<typeof ChannelMessageSignalSchema>;
export type ToolResultSignal = z.infer<typeof ToolResultSignalSchema>;
export type LLMResponseSignal = z.infer<typeof LLMResponseSignalSchema>;
export type CreateChannelSignal = z.infer<typeof CreateChannelSignalSchema>;
export type CloseChannelSignal = z.infer<typeof CloseChannelSignalSchema>;
export type ReactLoopCompletedSignal = z.infer<typeof ReactLoopCompletedSignalSchema>;
export type VolitionSignal = z.infer<typeof VolitionSignalSchema>;

