/**
 * LLM Output 函数实现
 *
 * 使用 stateful effect 模式协调消息构建、OpenAI API 调用和 Agent State 更新
 */

import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import type {
  ContextOfLlm,
  InputFromLlm,
  AgentInput,
} from "@moora/agent";
import type { Dispatch } from "@moora/automata";
import type { CreateLlmOutputOptions } from "@/types";
import { streamLlmCall } from "./openai";
import type { Eff } from "@moora/effects";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * LLM Output 的状态
 */
type LlmOutputState = {
  /**
   * 截止时间戳，表示截止到这个时间之前（包括这个时间）的 message 都已经发给 LLM 处理过了
   */
  cutOff: number;
};

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取最新的用户消息时间戳
 */
function getLatestUserMessageTimestamp(
  userMessages: Array<{ timestamp: number }>
): number {
  if (userMessages.length === 0) return 0;
  return Math.max(...userMessages.map((msg) => msg.timestamp));
}

/**
 * 检查是否有比 cutOff 更新的用户消息
 */
function hasNewerUserMessages(
  userMessages: Array<{ timestamp: number }>,
  cutOff: number
): boolean {
  return userMessages.some((msg) => msg.timestamp > cutOff);
}

/**
 * 检查是否有正在流式生成的消息
 */
function hasStreamingMessage(
  assiMessages: Array<{ streaming: boolean }>
): boolean {
  return assiMessages.some((msg) => msg.streaming === true);
}

// ============================================================================
// 主要函数
// ============================================================================

/**
 * 创建 LLM Output 函数
 *
 * 使用闭包管理 cutOff 状态，当有比 cutOff 更新的用户消息时调用 LLM
 *
 * @param options - 创建选项
 * @returns LLM Output 函数
 */
export function createLlmOutput(
  options: CreateLlmOutputOptions
): (dispatch: Dispatch<AgentInput>) => Eff<ContextOfLlm, void> {
  const { openai: openaiConfig, prompt, streamManager } = options;

  // 创建 OpenAI 客户端
  const openai = new OpenAI({
    apiKey: openaiConfig.endpoint.key,
    baseURL: openaiConfig.endpoint.url,
  });

  // 使用闭包管理状态
  let state: LlmOutputState = { cutOff: 0 };

  return (dispatch: Dispatch<AgentInput>) => {
    return (context: ContextOfLlm) => {
      const { userMessages, assiMessages } = context;

      const hasNewer = hasNewerUserMessages(userMessages, state.cutOff);
      const isStreaming = hasStreamingMessage(assiMessages);

      // 如果没有新消息，或者正在流式中，不做任何操作
      if (!hasNewer || isStreaming) {
        return;
      }

      // 更新 cutOff 为最新的用户消息时间戳
      const latestTimestamp = getLatestUserMessageTimestamp(userMessages);
      state = { cutOff: latestTimestamp };

      // 使用 queueMicrotask 执行异步 LLM 调用
      queueMicrotask(() => {
        executeLlmCall({
          openai,
          openaiConfig,
          prompt,
          streamManager,
          context,
          dispatch,
        }).catch((error) => {
          console.error("[createLlmOutput] Error executing LLM call:", error);
        });
      });
    };
  };
}

// ============================================================================
// 内部函数
// ============================================================================

/**
 * 执行 LLM 调用的参数
 */
type ExecuteLlmCallParams = {
  openai: OpenAI;
  openaiConfig: { model: string };
  prompt: string;
  streamManager: CreateLlmOutputOptions["streamManager"];
  context: ContextOfLlm;
  dispatch: Dispatch<AgentInput>;
};

/**
 * 执行 LLM 调用
 *
 * @internal
 */
async function executeLlmCall(params: ExecuteLlmCallParams): Promise<void> {
  const { openai, openaiConfig, prompt, streamManager, context, dispatch } = params;
  const { userMessages, assiMessages } = context;

  // 生成消息 ID
  const messageId = uuidv4();
  const timestamp = Date.now();

  // 先在 StreamManager 中创建流（确保前端连接时流已存在）
  streamManager.startStream(messageId);

  // 然后通知 Agent State 开始流式生成
  const startInput: InputFromLlm = {
    type: "start-assi-message-stream",
    id: messageId,
    timestamp,
  };
  dispatch(startInput);

  try {
    // 执行 Streaming LLM Call（内部会处理消息格式转换）
    const fullContent = await streamLlmCall({
      openai,
      model: openaiConfig.model,
      prompt,
      userMessages,
      assiMessages,
      streamManager,
      messageId,
    });

    // 通知 Agent State 结束流式生成
    const endInput: InputFromLlm = {
      type: "end-assi-message-stream",
      id: messageId,
      content: fullContent,
      timestamp: Date.now(),
    };
    dispatch(endInput);

    // 在 StreamManager 中结束流式生成
    streamManager.endStream(messageId, fullContent);
  } catch (error) {
    // 错误处理：直接结束 streaming
    console.error("OpenAI API error:", error);

    // 通知 Agent State 结束流式生成（使用空内容或错误消息）
    const endInput: InputFromLlm = {
      type: "end-assi-message-stream",
      id: messageId,
      content: "",
      timestamp: Date.now(),
    };
    dispatch(endInput);

    // 在 StreamManager 中结束流式生成（如果流还存在）
    streamManager.endStream(messageId, "");
  }
}

