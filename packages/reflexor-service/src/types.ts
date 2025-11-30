// ============================================================================
// Reflexor Service 类型定义
// ============================================================================

import { z } from "zod";
import type { EffectController } from "@moora/moorex";
import type { ReflexorInput, ReflexorState } from "@moora/reflexor-state-machine";

// ============================================================================
// Tool 定义类型
// ============================================================================

/**
 * Tool 参数定义
 */
export type ToolParameter = {
  type: string;
  description: string;
  enum?: string[];
};

/**
 * Tool 定义（发送给 LLM）
 */
export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  required: string[];
};

/**
 * Tool 执行函数
 */
export type ToolExecutor = (parameters: Record<string, unknown>) => Promise<string>;

/**
 * 扩展 Tool 定义（带执行函数）
 */
export type ToolDefinitionExt = ToolDefinition & {
  execute: ToolExecutor;
};

// ============================================================================
// LLM 相关类型
// ============================================================================

/**
 * LLM 用户消息
 */
export type LlmUserMessage = {
  role: "user";
  content: string;
};

/**
 * LLM 助手消息
 */
export type LlmAssistantMessage = {
  role: "assistant";
  content: string;
};

/**
 * LLM 工具调用
 */
export type LlmToolCall = {
  id: string;
  name: string;
  parameters: string;
};

/**
 * LLM 助手工具调用消息
 */
export type LlmAssistantToolCallMessage = {
  role: "assistant";
  toolCalls: LlmToolCall[];
};

/**
 * LLM 工具结果消息
 */
export type LlmToolMessage = {
  role: "tool";
  toolCallId: string;
  content: string;
};

/**
 * LLM 消息类型
 */
export type LlmMessage =
  | LlmUserMessage
  | LlmAssistantMessage
  | LlmAssistantToolCallMessage
  | LlmToolMessage;

/**
 * LLM 请求
 */
export type LlmRequest = {
  prompt: string;
  tools: Record<string, ToolDefinition>;
  messages: LlmMessage[];
  requiredTool: string | boolean;
};

/**
 * LLM 响应中的 Tool Call 请求
 */
export type LlmToolCallRequest = {
  id: string;
  name: string;
  parameters: string;
};

/**
 * LLM 响应
 */
export type LlmResponse = {
  message: string;
  toolCalls: LlmToolCallRequest[];
};

/**
 * 消息 chunk 回调
 */
export type OnMessageChunk = (content: string) => void;

/**
 * LLM 函数类型
 */
export type LlmFunction = (
  request: LlmRequest,
  onMessageChunk: OnMessageChunk
) => Promise<LlmResponse>;

// ============================================================================
// Effect 类型
// ============================================================================

/**
 * 向 Brain 发起请求
 *
 * Effect 结构尽可能简化，因为 runEffect 会收到完整的 State 作为参数。
 * 只需要包含 signalsCutAt 时间戳，表示参考的 user message 和 tool response 的时间截止点。
 *
 * Effect key: ask-brain-${signalsCutAt}
 */
export const askBrainEffectSchema = z
  .object({
    kind: z.literal("ask-brain"),
    signalsCutAt: z.number(),
  })
  .readonly();

export type AskBrainEffect = z.infer<typeof askBrainEffectSchema>;

/**
 * 请求 Toolkit 执行工具
 *
 * Effect 结构尽可能简化，因为 runEffect 会收到完整的 State 作为参数。
 * 只需要包含 toolCallId，其他信息（name、parameters）可以从 state.toolCalls[toolCallId] 获取。
 *
 * Effect key: request-toolkit-${toolCallId}
 */
export const requestToolkitEffectSchema = z
  .object({
    kind: z.literal("request-toolkit"),
    toolCallId: z.string(),
  })
  .readonly();

export type RequestToolkitEffect = z.infer<typeof requestToolkitEffectSchema>;

/**
 * Reflexor Effect 类型（仅后端使用）
 *
 * 分为两大类：发给 Brain、发给 Toolkit
 * 注意：不包含 "发给 User"，前端通过观察 state 变化来更新 UI
 */
export const reflexorEffectSchema = z.discriminatedUnion("kind", [
  askBrainEffectSchema,
  requestToolkitEffectSchema,
]);

export type ReflexorEffect = z.infer<typeof reflexorEffectSchema>;

// ============================================================================
// Handler 类型
// ============================================================================

/**
 * Brain 处理器
 *
 * 负责与 LLM 交互。
 */
export type BrainHandler = {
  /**
   * 发起 LLM 请求
   *
   * @param state - 当前状态
   * @param signalsCutAt - 信号截止时间戳
   * @returns Effect 控制器
   */
  ask: (
    state: ReflexorState,
    signalsCutAt: number
  ) => EffectController<ReflexorInput>;
};

/**
 * Toolkit 处理器
 *
 * 负责与外部工具交互。
 */
export type ToolkitHandler = {
  /**
   * 执行工具调用
   *
   * @param state - 当前状态
   * @param toolCallId - 工具调用 ID
   * @returns Effect 控制器
   */
  execute: (
    state: ReflexorState,
    toolCallId: string
  ) => EffectController<ReflexorInput>;
};

// ============================================================================
// 服务配置类型
// ============================================================================

/**
 * Reflexor Node 配置
 */
export type ReflexorNodeConfig = {
  /**
   * System prompt
   */
  prompt: string;

  /**
   * Tool 定义集合（带执行函数）
   */
  tools: Record<string, ToolDefinitionExt>;

  /**
   * LLM 函数
   */
  llm: LlmFunction;

  /**
   * 初始状态（可选）
   */
  initialState?: ReflexorState;
};
