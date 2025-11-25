import { z } from 'zod';

// ============================================================================
// Signal 类型定义 - Zod Schemas
// ============================================================================

/**
 * Channel 消息信号
 * 
 * 当 Channel 上收到新消息时触发。
 * MessageId 可以通过 `computeMessageId(channelId, messageIndex)` 计算。
 */
export const ChannelMessageSignalSchema = z.object({
  type: z.literal('channel-message'),
  /** Channel ID（等于从动端 TaskRunner ID，128 位 hash 的 16 进制字符串） */
  channelId: z.string(),
  /** 消息在 Channel 中的序号（从 0 开始） */
  messageIndex: z.number().int().nonnegative(),
  /** 消息内容 */
  content: z.string(),
});

/**
 * 工具调用结果信号
 * 
 * 当工具调用完成并返回结果时触发。
 * ToolCallId 可以通过 `computeToolCallId(computeMessageId(channelId, messageIndex), toolCallIndex)` 计算。
 */
export const ToolResultSignalSchema = z.object({
  type: z.literal('tool-result'),
  /** Channel ID */
  channelId: z.string(),
  /** 消息在 Channel 中的序号 */
  messageIndex: z.number().int().nonnegative(),
  /** 工具调用在 ReactLoop 中的序号（从 0 开始） */
  toolCallIndex: z.number().int().nonnegative(),
  /** 工具调用结果（字符串格式） */
  result: z.string(),
});

/**
 * LLM 响应信号
 * 
 * 当 LLM 调用完成并返回响应时触发。
 * LLM 调用是在 ReactLoop 内进行的，不需要额外的序号。
 * ReactLoopId 可以通过 `computeReactLoopId(computeMessageId(channelId, messageIndex))` 计算。
 */
export const LLMResponseSignalSchema = z.object({
  type: z.literal('llm-response'),
  /** Channel ID */
  channelId: z.string(),
  /** 消息在 Channel 中的序号 */
  messageIndex: z.number().int().nonnegative(),
  /** LLM 响应内容 */
  content: z.string(),
});

/**
 * 创建子 TaskRunner 信号
 *
 * 当需要创建子 TaskRunner 来处理子任务时触发。
 * 每个 TaskRunner 都有特定的目标，创建子 TaskRunner 时必须指定目标。
 * 
 * 注意：创建的子 TaskRunner 的 ID 会通过 `computeSubTaskRunnerId(parentId, ordinal)` 计算。
 * parentId 可以从当前 TaskRunner 的状态中获取。
 */
export const CreateSubTaskRunnerSignalSchema = z.object({
  type: z.literal('create-subtask-runner'),
  /** 子 TaskRunner 的目标 */
  target: z.string(),
  /** 子 TaskRunner 的序数（用于计算子 TaskRunner ID，从 0 开始） */
  ordinal: z.number().int().nonnegative(),
});

/**
 * ReAct 循环完成信号
 * 
 * 当 ReAct 循环完成并产出最终回复时触发。
 * 这个信号通常由系统内部生成，表示 ReactLoop 已经完成处理。
 * ReactLoopId 可以通过 `computeReactLoopId(computeMessageId(channelId, messageIndex))` 计算。
 */
export const ReactLoopCompletedSignalSchema = z.object({
  type: z.literal('react-loop-completed'),
  /** Channel ID */
  channelId: z.string(),
  /** 消息在 Channel 中的序号 */
  messageIndex: z.number().int().nonnegative(),
  /** 最终回复内容 */
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

