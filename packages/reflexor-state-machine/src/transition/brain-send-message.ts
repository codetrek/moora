// ============================================================================
// 处理 BrainSendMessageStart 和 BrainSendMessageComplete 输入
// ============================================================================

import type {
  BrainSendMessageStart,
  BrainSendMessageComplete,
} from "../input";
import type { AssistantMessage, ReflexorState } from "../state";
import { findAssistantMessageIndex } from "../state-helper";

/**
 * 处理 Brain 开始输出消息
 *
 * 在 state 中创建空内容的 assistant message，并更新 calledBrainAt。
 *
 * @param input - BrainSendMessageStart 输入
 * @param state - 当前状态
 * @returns 新状态
 */
export function handleBrainSendMessageStart(
  input: BrainSendMessageStart,
  state: ReflexorState
): ReflexorState {
  const assistantMessage: AssistantMessage = {
    kind: "assistant",
    id: input.messageId,
    content: "", // 空内容，等待 streaming 完成
    receivedAt: input.timestamp,
    updatedAt: input.timestamp,
  };

  return {
    ...state,
    updatedAt: input.timestamp,
    assistantMessages: [...state.assistantMessages, assistantMessage],
    calledBrainAt: input.calledBrainAt,
  };
}

/**
 * 处理 Brain 完成输出消息
 *
 * 更新 state 中的 assistant message 为完整内容。
 *
 * @param input - BrainSendMessageComplete 输入
 * @param state - 当前状态
 * @returns 新状态
 */
export function handleBrainSendMessageComplete(
  input: BrainSendMessageComplete,
  state: ReflexorState
): ReflexorState {
  const messageIndex = findAssistantMessageIndex(state, input.messageId);

  // 如果找不到消息，打 warning 并忽略
  if (messageIndex === -1) {
    console.warn(
      `[brain-send-message-complete] Message not found: ${input.messageId}, ignoring.`
    );
    return state;
  }

  // 更新现有消息的内容
  return {
    ...state,
    updatedAt: input.timestamp,
    assistantMessages: state.assistantMessages.map((msg, index) => {
      if (index === messageIndex) {
        return {
          ...msg,
          content: input.content,
          updatedAt: input.timestamp,
        };
      }
      return msg;
    }),
    calledBrainAt: input.calledBrainAt,
  };
}
