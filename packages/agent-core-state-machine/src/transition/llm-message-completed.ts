// ============================================================================
// Handle LLM Message Completed - 处理 LLM 消息完成输入
// ============================================================================

import type { AgentState } from "../state";
import type { LlmMessageCompleted } from "../input";
import { findMessageById } from "./utils";

/**
 * 处理 LLM 消息完成输入
 *
 * 当 LLM 完成消息流式输出时：
 * - 只修改 content，不修改时间戳
 * - 确保历史消息列表按事件排序（时间戳以开始事件为准）
 *
 * @internal
 */
export const handleLlmMessageCompleted = (
  { messageId, content, timestamp }: LlmMessageCompleted,
  state: AgentState
): AgentState => {
  const findResult = findMessageById(state.messages, messageId);

  // 检查消息是否存在
  if (!findResult) {
    console.warn(
      `[AgentStateMachine] llm-message-completed received for non-existent message: ${messageId}`
    );
    return state;
  }

  const [existingIndex, existingMessage] = findResult;

  // 检查消息是否是助手消息
  if (existingMessage.role !== "assistant") {
    console.warn(
      `[AgentStateMachine] llm-message-completed received for non-assistant message: ${messageId}`
    );
    return state;
  }

  // 只更新消息内容为完整内容，并标记不再流式输出
  // 更新 updatedAt，不修改 receivedAt，保持以开始事件为准
  const messages = state.messages.with(existingIndex, {
    ...existingMessage,
    content,
    updatedAt: timestamp,
    streaming: false,
  });

  return {
    ...state,
    messages,
    // 更新状态时间戳
    updatedAt: timestamp,
  };
};


