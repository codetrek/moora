// ============================================================================
// Channel AGENT -> TOOLKIT 的 transition 函数
// ============================================================================

import { create } from "mutative";
import type { OutputFromAgent } from "../types/signal";
import type { StateAgentToolkit } from "../types/state";

/**
 * Channel AGENT -> TOOLKIT 的 transition 函数
 * 
 * State 随 Agent 的 Output 变化：
 * - callTool: 添加待执行的工具调用
 * - sendChunk, completeMessage: 不影响此 Channel 的 State
 */
export function transitionAgentToolkit(
  output: OutputFromAgent,
  state: StateAgentToolkit
): StateAgentToolkit {
  if (output.type === "callTool") {
    return create(state, (draft) => {
      draft.pendingToolCalls.push({
        toolCallId: output.toolCallId,
        toolName: output.toolName,
        parameters: output.parameters,
        timestamp: Date.now(),
      });
    });
  }
  return state;
}

