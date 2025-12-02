// ============================================================================
// Channel TOOLKIT -> AGENT 的 transition 函数
// ============================================================================

import { create } from "mutative";
import type { OutputFromToolkit } from "../types/signal";
import type { StateToolkitAgent } from "../types/state";

/**
 * Channel TOOLKIT -> AGENT 的 transition 函数
 * 
 * State 随 Toolkit 的 Output 变化：
 * - toolResult: 添加工具执行成功结果
 * - toolError: 添加工具执行失败结果
 */
export function transitionToolkitAgent(
  output: OutputFromToolkit,
  state: StateToolkitAgent
): StateToolkitAgent {
  if (output.type === "toolResult") {
    return create(state, (draft) => {
      draft.toolResults.push({
        isSuccess: true,
        toolCallId: output.toolCallId,
        toolName: output.toolName,
        result: output.result,
        timestamp: Date.now(),
      });
    });
  }
  if (output.type === "toolError") {
    return create(state, (draft) => {
      draft.toolResults.push({
        isSuccess: false,
        toolCallId: output.toolCallId,
        toolName: output.toolName,
        error: output.error,
        timestamp: Date.now(),
      });
    });
  }
  return state;
}

