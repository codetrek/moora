// ============================================================================
// Channel TOOLKIT -> TOOLKIT (Loopback) 的 transition 函数
// ============================================================================

import { create } from "mutative";
import type { OutputFromToolkit } from "../types/signal";
import type { StateToolkitToolkit } from "../types/state";

/**
 * Channel TOOLKIT -> TOOLKIT (Loopback) 的 transition 函数
 * 
 * State 随 Toolkit 的 Output 变化：
 * - 记录所有工具执行结果到历史中
 */
export function transitionToolkitToolkit(
  output: OutputFromToolkit,
  state: StateToolkitToolkit
): StateToolkitToolkit {
  return create(state, (draft) => {
    draft.executionHistory.push({
      type: output.type,
      toolCallId: output.toolCallId,
      toolName: output.toolName,
      timestamp: Date.now(),
    });
  });
}

