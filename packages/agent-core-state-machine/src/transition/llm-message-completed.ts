// ============================================================================
// Handle LLM Message Completed - 处理 LLM 消息完成输入
// ============================================================================

import { create } from "mutative";
import type { AgentState } from "../state";
import type { LlmMessageCompleted } from "../input";

/**
 * 处理 LLM 消息完成输入
 *
 * 在 streaming 过程中，assistant message 的 content 保持为空字符串，
 * 只有在此事件触发时才更新为完整的 content。
 *
 * @internal
 */
export const handleLlmMessageCompleted = (
  input: LlmMessageCompleted,
  state: AgentState
): AgentState => {
  return create(state, (draft) => {
    const existingIndex = draft.messages.findIndex(
      (msg) => msg.id === input.messageId
    );

    if (existingIndex >= 0) {
      const existingMessage = draft.messages[existingIndex];
      if (existingMessage && existingMessage.role === "assistant") {
        // 更新消息内容为完整内容，并标记不再流式输出
        draft.messages[existingIndex] = {
          ...existingMessage,
          content: input.content,
          streaming: false,
        };
      }
    } else {
      // 如果消息不存在，创建新的助手消息
      const newMessage = {
        id: input.messageId,
        role: "assistant" as const,
        content: input.content,
        timestamp: input.timestamp,
        streaming: false,
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
    }

    // 更新状态时间戳
    draft.timestamp = input.timestamp;
  });
};


