/**
 * Reaction Options 类型定义
 *
 * 定义各 Actor 的 reaction 工厂函数的配置参数类型。
 * 这些类型用于创建 reaction 函数，使 @moora/starter-agent 与具体实现解耦。
 */

import type { UserMessage, AssiMessage } from "./observations";
import type { PerspectiveOfUser } from "./perspectives";

// ============================================================================
// CallLlm 相关类型
// ============================================================================

/**
 * LLM 调用的消息类型
 *
 * 只包含 UserMessage 和 AssiMessage
 */
export type CallLlmMessage = UserMessage | AssiMessage;

/**
 * LLM 调用的场景类型
 *
 * 目前只支持 ReAct Loop 场景
 */
export type CallLlmScenario = "re-act-loop";

/**
 * LLM 工具定义
 */
export type CallLlmToolDefinition = {
  name: string;
  description: string;
  parameters: string; // JSON Schema as JSON string
};

/**
 * 已完成的工具调用记录
 */
export type CallLlmToolCall = {
  toolCallId: string; // unique identifier for the tool call
  name: string;
  parameter: string; // JSON string of arguments
  result: string; // JSON string of result
  requestedAt: number; // timestamp
  respondedAt: number; // timestamp
};

/**
 * callLlm 的 context 参数
 */
export type CallLlmContext = {
  messages: CallLlmMessage[];
  scenario: CallLlmScenario;
  tools: CallLlmToolDefinition[];
  toolCalls: CallLlmToolCall[];
};

/**
 * callLlm 的 callbacks 参数
 */
export type CallLlmCallbacks = {
  /** 开始生成消息（收到第一个 chunk 时调用），返回 messageId 用于流式管理 */
  onStart: () => string;
  /** 流式输出一个 chunk */
  onChunk: (chunk: string) => void;
  /** 消息输出完成（只有在 onStart 被调用后才应该调用） */
  onComplete: (content: string) => void;
  /** 发起工具调用请求（toolCallId 由 reaction 内部生成） */
  onToolCall: (request: { name: string; arguments: string }) => void;
};

/**
 * callLlm 函数类型
 *
 * 调用 LLM 的抽象接口，由外部实现具体的 LLM 调用逻辑。
 */
export type CallLlm = (
  context: CallLlmContext,
  callbacks: CallLlmCallbacks
) => void | Promise<void>;

// ============================================================================
// NotifyUser 相关类型
// ============================================================================

/**
 * notifyUser 函数类型
 *
 * 通知用户的抽象接口，由外部实现具体的通知逻辑（如发送 patch、更新 UI 等）。
 *
 * @param perspective - User 的 Perspective
 */
export type NotifyUser = (perspective: PerspectiveOfUser) => void;

// ============================================================================
// Actor Reaction Options
// ============================================================================

/**
 * LLM Actor 的 reaction 配置选项
 */
export type LlmReactionOptions = {
  callLlm: CallLlm;
  /**
   * 可选的流式开始回调
   *
   * 当 LLM 开始输出时调用，可用于初始化流
   *
   * @param messageId - 消息 ID
   */
  onStart?: (messageId: string) => void;
  /**
   * 可选的流式输出回调
   *
   * 当 LLM 输出 chunk 时调用，可用于实时推送到客户端
   *
   * @param messageId - 消息 ID
   * @param chunk - 输出的 chunk 内容
   */
  onChunk?: (messageId: string, chunk: string) => void;
  /**
   * 可选的流式完成回调
   *
   * 当 LLM 输出完成时调用，可用于关闭流
   *
   * @param messageId - 消息 ID
   * @param content - 完整的输出内容
   */
  onComplete?: (messageId: string, content: string) => void;
};

/**
 * User Actor 的 reaction 配置选项
 */
export type UserReactionOptions = {
  notifyUser: NotifyUser;
};
