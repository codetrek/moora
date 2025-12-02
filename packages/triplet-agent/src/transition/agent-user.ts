// ============================================================================
// Channel AGENT -> USER 的 transition 函数
// ============================================================================

import { create } from "mutative";
import type { OutputFromAgent } from "../types/signal";
import type { StateAgentUser } from "../types/state";

/**
 * Channel AGENT -> USER 的 transition 函数
 * 
 * State 随 Agent 的 Output 变化：
 * - sendChunk: 更新或创建消息，追加内容块，记录 chunk 到 streamingChunks
 * - completeMessage: 标记消息流式输出完成，清理 streamingChunks
 * - callTool: 不影响此 Channel 的 State
 * 
 * 注意：streamingChunks 的 keys 就是正在流式输出的消息 ID 列表
 */
export function transitionAgentUser(
  output: OutputFromAgent,
  state: StateAgentUser
): StateAgentUser {
  if (output.type === "sendChunk") {
    return create(state, (draft) => {
      // 查找或创建消息
      let message = draft.messages.find((m) => m.id === output.messageId);
      if (!message) {
        // 创建新消息
        message = {
          id: output.messageId,
          role: "assistant" as const,
          content: "",
          timestamp: Date.now(),
        };
        draft.messages.push(message);
        // 初始化 streamingChunks（key 的存在表示正在流式输出）
        draft.streamingChunks[output.messageId] = [];
      }
      // 追加内容块到消息
      message.content += output.chunk;
      message.timestamp = Date.now();
      // 记录 chunk 到 streamingChunks（确保数组存在）
      const chunks = draft.streamingChunks[output.messageId] ?? [];
      chunks.push(output.chunk);
      draft.streamingChunks[output.messageId] = chunks;
    });
  }
  if (output.type === "completeMessage") {
    return create(state, (draft) => {
      // 清理 streamingChunks（删除 key 表示流式输出完成）
      delete draft.streamingChunks[output.messageId];
    });
  }
  return state;
}

