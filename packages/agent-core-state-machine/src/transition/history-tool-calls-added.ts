// ============================================================================
// Handle History Tool Calls Added - 处理加载历史 ToolCall 结果到上下文输入
// ============================================================================

import { create } from "mutative";
import type { AgentState } from "../state";
import type { HistoryToolCallsAdded } from "../input";

/**
 * 处理加载历史 ToolCall 结果到上下文输入
 *
 * @internal
 */
export const handleHistoryToolCallsAdded = (
  input: HistoryToolCallsAdded,
  state: AgentState
): AgentState => {
  return create(state, (draft) => {
    // 将 Tool Call ID 添加到当前 ReAct Loop 上下文
    if (draft.reactContext) {
      for (const toolCallId of input.toolCallIds) {
        if (!draft.reactContext.toolCallIds.includes(toolCallId)) {
          draft.reactContext.toolCallIds.push(toolCallId);
        }
      }
    }

    // 更新状态时间戳
    draft.timestamp = input.timestamp;
  });
};


