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
 * - 当 LLM call 完成时（completeMessage），更新 lastProcessedTimestamp
 */
export function transitionAgentAgent(
  output: OutputFromAgent,
  state: StateAgentAgent
): StateAgentAgent {
  if (output.type === "completeMessage" && output.processedTimestamp) {
    return create(state, (draft) => {
      draft.lastProcessedTimestamp = output.processedTimestamp;
    });
  }
  return state;
}

