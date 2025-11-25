import { z } from 'zod';
import { type Immutable } from 'mutative';

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

// ============================================================================
// 主要类型定义 - Zod Schemas
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

/**
 * LLM 调用函数类型
 * 
 * 注意：函数类型不适合用 Zod 验证，使用 TypeScript 原生类型
 */
export type LLMCallFn = (prompt: string) => Promise<string>;

/**
 * 工具定义
 * 
 * 工具可以是内置的（如记忆访问）或外部提供的
 * 
 * 注意：execute 函数不适合用 Zod 验证，使用 TypeScript 原生类型
 */
export type Tool = {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 工具参数模式（JSON Schema 格式） */
  parameters?: unknown;
  /** 工具执行函数 */
  execute: (input: unknown) => Promise<unknown> | unknown;
};

/**
 * 创建 Volition 的配置选项
 * 
 * 注意：包含函数类型的部分使用 TypeScript 原生类型
 */
export type VolitionOptions = {
  /** LLM 调用函数 */
  callLLM: LLMCallFn;
  /** 工具列表（内置 + 外部提供） */
  tools?: Tool[];
  /** 初始记忆状态（可选） */
  initialMemory?: Partial<MemoryState>;
};

// ============================================================================
// TypeScript 类型导出（通过 z.infer 从 Zod Schema 推导）
// ============================================================================

export type ToolCall = z.infer<typeof ToolCallSchema>;
export type LLMCall = z.infer<typeof LLMCallSchema>;
export type ShortTermMemory = z.infer<typeof ShortTermMemorySchema>;
export type ChannelMessageSignal = z.infer<typeof ChannelMessageSignalSchema>;
export type ToolResultSignal = z.infer<typeof ToolResultSignalSchema>;
export type LLMResponseSignal = z.infer<typeof LLMResponseSignalSchema>;
export type CreateChannelSignal = z.infer<typeof CreateChannelSignalSchema>;
export type CloseChannelSignal = z.infer<typeof CloseChannelSignalSchema>;
export type ReactLoopCompletedSignal = z.infer<typeof ReactLoopCompletedSignalSchema>;
export type SendMessageEffect = z.infer<typeof SendMessageEffectSchema>;
export type ReactLoopEffect = z.infer<typeof ReactLoopEffectSchema>;
export type CallToolEffect = z.infer<typeof CallToolEffectSchema>;
export type CallLLMEffect = z.infer<typeof CallLLMEffectSchema>;
export type ChannelState = z.infer<typeof ChannelStateSchema>;
export type ReactLoopState = z.infer<typeof ReactLoopStateSchema>;
export type MemoryState = z.infer<typeof MemoryStateSchema>;
export type VolitionState = z.infer<typeof VolitionStateSchema>;
export type VolitionSignal = z.infer<typeof VolitionSignalSchema>;
export type VolitionEffect = z.infer<typeof VolitionEffectSchema>;
