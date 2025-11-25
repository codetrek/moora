import { z } from 'zod';

// ============================================================================
// 内嵌类型定义 - Zod Schemas
// ============================================================================

/**
 * 工具调用记录
 */
export const ToolCallSchema = z.object({
  toolName: z.string(),
  input: z.unknown(),
  result: z.unknown().optional(),
});

/**
 * LLM 调用记录
 */
export const LLMCallSchema = z.object({
  prompt: z.string(),
  response: z.string().optional(),
});

/**
 * 短期记忆项
 */
export const ShortTermMemorySchema = z.object({
  timestamp: z.number(),
  content: z.string(),
});

// ============================================================================
// 状态类型定义 - Zod Schemas
// ============================================================================

/**
 * Channel 的状态
 * 
 * 每个 channel 都是双向交替通讯的。
 * - 上游 channel (id: 0): 连接到上游系统（不一定是 volition）
 * - 下游 channels (id: 1, 2, 3...): 连接到下游 volitions
 */
export const ChannelStateSchema = z.object({
  /** Channel ID: 0 表示上游 channel，正整数表示下游 channel */
  id: z.number(),
  /** 是否已连接 */
  connected: z.boolean(),
  /** 待发送的消息队列 */
  pendingMessages: z.array(z.string()),
  /** 是否正在等待回复（用于双向交替通讯） */
  waitingForReply: z.boolean(),
});

/**
 * ReAct 循环的状态
 * 
 * ReAct 循环代表 AI Agent 为处理某个消息而进行的一系列心理活动：
 * - 思考（Reasoning）
 * - 行动（Acting）：调用 tools 或 LLM
 * - 观察（Observing）：接收工具调用结果或 LLM 响应
 */
export const ReactLoopStateSchema = z.object({
  /** ReAct 循环的唯一标识符 */
  id: z.string(),
  /** 触发此循环的 channel ID */
  channelId: z.number(),
  /** 原始消息内容 */
  originalMessage: z.string(),
  /** 当前思考过程（Reasoning） */
  thoughts: z.array(z.string()),
  /** 工具调用历史 */
  toolCalls: z.array(ToolCallSchema),
  /** LLM 调用历史 */
  llmCalls: z.array(LLMCallSchema),
  /** 是否已完成（已产出回复内容） */
  completed: z.boolean(),
  /** 最终回复内容（如果已完成） */
  response: z.string().optional(),
});

/**
 * 记忆状态
 * 
 * 用于存储 volition 的记忆和上下文信息
 */
export const MemoryStateSchema = z.object({
  /** 长期记忆（持久化存储） */
  longTerm: z.record(z.string(), z.unknown()),
  /** 短期记忆（会话级别） */
  shortTerm: z.array(ShortTermMemorySchema),
});

/**
 * Volition 的状态
 * 
 * 代表 AI Agent 为达成特定目的而进行的一系列心理活动的完整状态
 */
export const VolitionStateSchema = z.object({
  /** 所有 channel 的状态 */
  channels: z.record(z.number(), ChannelStateSchema),
  /** 正在进行的 ReAct 循环 */
  reactLoops: z.record(z.string(), ReactLoopStateSchema),
  /** 记忆/上下文信息 */
  memory: MemoryStateSchema,
  /** 下一个可用的下游 channel ID */
  nextChannelId: z.number(),
});

// ============================================================================
// TypeScript 类型导出（通过 z.infer 从 Zod Schema 推导）
// ============================================================================

export type ToolCall = z.infer<typeof ToolCallSchema>;
export type LLMCall = z.infer<typeof LLMCallSchema>;
export type ShortTermMemory = z.infer<typeof ShortTermMemorySchema>;
export type ChannelState = z.infer<typeof ChannelStateSchema>;
export type ReactLoopState = z.infer<typeof ReactLoopStateSchema>;
export type MemoryState = z.infer<typeof MemoryStateSchema>;
export type VolitionState = z.infer<typeof VolitionStateSchema>;

