// ============================================================================
// Channel AGENT -> AGENT (Loopback) 的 transition 函数
// ============================================================================

import { create } from "mutative";
import type { OutputFromAgent } from "../types/signal";
import type { StateAgentAgent } from "../types/state";

/**
 * Channel AGENT -> AGENT (Loopback) 的 transition 函数
 * 
 * State 随 Agent 的 Output 变化：
 * - 记录所有 Agent 处理操作到历史中
 */
export function transitionAgentAgent(
  output: OutputFromAgent,
  state: StateAgentAgent
): StateAgentAgent {
  return create(state, (draft) => {
    draft.processingHistory.push({
      type: output.type,
      toolCallId: output.type === "callTool" ? output.toolCallId : undefined,
      messageId:
        output.type === "sendChunk" || output.type === "completeMessage"
          ? output.messageId
          : undefined,
      timestamp: Date.now(),
    });
  });
}

