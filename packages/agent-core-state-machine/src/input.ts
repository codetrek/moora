// ============================================================================
// Agent Input/Event 类型定义
// ============================================================================

import { z } from "zod";
import { toolCallResultSchema } from "./state";

/**
 * 收到用户消息事件
 *
 * 当用户发送消息时触发。
 */
export const userMessageEventSchema = z.object({
  /**
   * 事件类型标识
   */
  type: z.literal("user-message"),

  /**
   * 消息 ID
   */
  messageId: z.string(),

  /**
   * 消息内容
   */
  content: z.string(),

  /**
   * 消息时间戳（Unix 时间戳，毫秒）
   */
  timestamp: z.number(),
});

export type UserMessageEvent = z.infer<typeof userMessageEventSchema>;

/**
 * LLM 发送给 User 的 Chunk 事件
 *
 * 当 LLM 流式输出时，每个 chunk 触发一次。
 */
export const llmChunkEventSchema = z.object({
  /**
   * 事件类型标识
   */
  type: z.literal("llm-chunk"),

  /**
   * 消息 ID
   */
  messageId: z.string(),

  /**
   * Chunk 内容
   */
  chunk: z.string(),
});

export type LlmChunkEvent = z.infer<typeof llmChunkEventSchema>;

/**
 * LLM 发送给 User 的消息完成事件
 *
 * 当 LLM 完成一条消息的流式输出时触发。
 */
export const llmMessageCompleteEventSchema = z.object({
  /**
   * 事件类型标识
   */
  type: z.literal("llm-message-complete"),

  /**
   * 消息 ID
   */
  messageId: z.string(),
});

export type LlmMessageCompleteEvent = z.infer<
  typeof llmMessageCompleteEventSchema
>;

/**
 * 发起 ToolCall（外部）事件
 *
 * 当开始调用外部工具时触发。
 */
export const toolCallStartedEventSchema = z.object({
  /**
   * 事件类型标识
   */
  type: z.literal("tool-call-started"),

  /**
   * Tool Call ID
   */
  toolCallId: z.string(),

  /**
   * 工具名称
   */
  name: z.string(),

  /**
   * 参数（序列化为 string）
   */
  parameters: z.string(),

  /**
   * 调用时间戳（Unix 时间戳，毫秒）
   */
  timestamp: z.number(),
});

export type ToolCallStartedEvent = z.infer<typeof toolCallStartedEventSchema>;

/**
 * 收到 ToolCall 结果（外部）事件
 *
 * 当外部工具调用完成时触发。
 */
export const toolCallResultEventSchema = z.object({
  /**
   * 事件类型标识
   */
  type: z.literal("tool-call-result"),

  /**
   * Tool Call ID
   */
  toolCallId: z.string(),

  /**
   * 调用结果
   * - 成功：包含结果内容
   * - 失败：包含错误信息
   */
  result: toolCallResultSchema,
});

export type ToolCallResultEvent = z.infer<typeof toolCallResultEventSchema>;

/**
 * 追加历史消息到当前 ReAct Loop 事件
 *
 * 当需要将历史消息添加到当前 ReAct Loop 上下文时触发。
 */
export const addMessagesToContextEventSchema = z.object({
  /**
   * 事件类型标识
   */
  type: z.literal("add-messages-to-context"),

  /**
   * 要添加的消息 ID 列表
   */
  messageIds: z.array(z.string()),
});

export type AddMessagesToContextEvent = z.infer<
  typeof addMessagesToContextEventSchema
>;

/**
 * 加载历史 ToolCall 结果到当前 ReAct Loop 事件
 *
 * 当需要将历史 Tool Call 添加到当前 ReAct Loop 上下文时触发。
 */
export const addToolCallsToContextEventSchema = z.object({
  /**
   * 事件类型标识
   */
  type: z.literal("add-tool-calls-to-context"),

  /**
   * 要添加的 Tool Call ID 列表
   */
  toolCallIds: z.array(z.string()),
});

export type AddToolCallsToContextEvent = z.infer<
  typeof addToolCallsToContextEventSchema
>;

/**
 * Agent 事件
 *
 * Agent 状态机可以接收的所有事件类型。
 * 使用 Discriminated Union 类型，通过 `type` 字段区分。
 */
export const agentEventSchema = z.discriminatedUnion("type", [
  userMessageEventSchema,
  llmChunkEventSchema,
  llmMessageCompleteEventSchema,
  toolCallStartedEventSchema,
  toolCallResultEventSchema,
  addMessagesToContextEventSchema,
  addToolCallsToContextEventSchema,
]);

export type AgentEvent = z.infer<typeof agentEventSchema>;

/**
 * Agent 输入信号
 *
 * Agent 状态机的输入信号类型，与 AgentEvent 相同。
 * 为了保持与 Moorex 命名规范的一致性，同时导出 AgentEvent 和 AgentInput。
 */
export type AgentInput = AgentEvent;

