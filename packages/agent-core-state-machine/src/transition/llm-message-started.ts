// ============================================================================
// Handle LLM Message Started - 处理 LLM 消息开始输入
// ============================================================================

import { create } from "mutative";
import type { AgentState } from "../state";
import type { LlmMessageStarted } from "../input";

/**
 * 处理 LLM 消息开始输入
 *
 * 当 LLM 开始 streaming 时，创建一个 content 为空字符串的 assistant message。
 * 在 streaming 过程中，content 保持为空，直到 llm-message-completed 事件触发。
 *
 * @internal
 */
export const handleLlmMessageStarted = (
  input: LlmMessageStarted,
  state: AgentState
): AgentState => {
  // 检查消息 ID 是否已存在
  const existingIndex = state.messages.findIndex(
    (msg) => msg.id === input.messageId
  );

  if (existingIndex >= 0) {
    // 如果消息已存在，不做任何操作
    console.warn(
      `[AgentStateMachine] Ignoring llm message started with duplicate ID: ${input.messageId}`
    );
    return state;
  }

  return create(state, (draft) => {
    // 创建新的助手消息，content 为空字符串
    const newMessage = {
      id: input.messageId,
      role: "assistant" as const,
      content: "",
      timestamp: input.timestamp,
      streaming: true,
      taskIds: [] as string[],
    };

    // 保持按时间戳排序
    const insertIndex = draft.messages.findIndex(
      (msg) => msg.timestamp > input.timestamp
    );
    if (insertIndex >= 0) {
      draft.messages.splice(insertIndex, 0, newMessage);
    } else {
      draft.messages.push(newMessage);
    }

    // 更新状态时间戳
    draft.timestamp = input.timestamp;
  });
};


