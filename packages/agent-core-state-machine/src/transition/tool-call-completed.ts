// ============================================================================
// Handle Tool Call Completed - 处理 Tool Call 完成输入
// ============================================================================

import { create } from "mutative";
import type { AgentState } from "../state";
import type { ToolCallCompleted } from "../input";

/**
 * 处理 Tool Call 完成输入
 *
 * @internal
 */
export const handleToolCallCompleted = (
  input: ToolCallCompleted,
  state: AgentState
): AgentState => {
  return create(state, (draft) => {
    const existingToolCall = draft.toolCalls[input.toolCallId];

    if (existingToolCall) {
      // 更新 Tool Call 记录的结果
      draft.toolCalls[input.toolCallId] = {
        ...existingToolCall,
        result: input.result,
      };
    }

    // 更新状态时间戳
    draft.timestamp = input.timestamp;
  });
};


