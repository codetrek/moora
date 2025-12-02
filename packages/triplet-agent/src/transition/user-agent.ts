// ============================================================================
// Channel USER -> AGENT 的 transition 函数
// ============================================================================

import { create } from "mutative";
import type { OutputFromUser } from "../types/signal";
import type { StateUserAgent } from "../types/state";

/**
 * Channel USER -> AGENT 的 transition 函数
 * 
 * State 随 User 的 Output 变化：
 * - sendMessage: 添加用户消息
 * - cancelStreaming: 添加被取消流式输出的消息 ID
 */
export function transitionUserAgent(
  output: OutputFromUser,
  state: StateUserAgent
): StateUserAgent {
  if (output.type === "sendMessage") {
    return create(state, (draft) => {
      draft.userMessages.push({
        id: output.messageId,
        content: output.message,
        timestamp: Date.now(),
      });
    });
  }
  if (output.type === "cancelStreaming") {
    return create(state, (draft) => {
      if (!draft.canceledStreamingMessageIds.includes(output.messageId)) {
        draft.canceledStreamingMessageIds.push(output.messageId);
      }
    });
  }
  return state;
}

