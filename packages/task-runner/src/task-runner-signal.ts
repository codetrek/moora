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
 * 创建子 TaskRunner 信号
 *
 * 每个 TaskRunner 都有特定的目标，创建子 TaskRunner 时必须指定目标。
 */
export const CreateSubTaskRunnerSignalSchema = z.object({
  type: z.literal('create-subtask-runner'),
  /** 子 TaskRunner 的目标 */
  target: z.string(),
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
 * TaskRunner 的信号
 *
 * 触发状态转换的输入事件
 */
export const TaskRunnerSignalSchema = z.discriminatedUnion('type', [
  ChannelMessageSignalSchema,
  ToolResultSignalSchema,
  LLMResponseSignalSchema,
  CreateSubTaskRunnerSignalSchema,
  ReactLoopCompletedSignalSchema,
]);

// ============================================================================
// TypeScript 类型导出（通过 z.infer 从 Zod Schema 推导）
// ============================================================================

export type ChannelMessageSignal = z.infer<typeof ChannelMessageSignalSchema>;
export type ToolResultSignal = z.infer<typeof ToolResultSignalSchema>;
export type LLMResponseSignal = z.infer<typeof LLMResponseSignalSchema>;
export type CreateSubTaskRunnerSignal = z.infer<typeof CreateSubTaskRunnerSignalSchema>;
export type ReactLoopCompletedSignal = z.infer<typeof ReactLoopCompletedSignalSchema>;
export type TaskRunnerSignal = z.infer<typeof TaskRunnerSignalSchema>;

