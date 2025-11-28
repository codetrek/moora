// ============================================================================
// Handle Tool Call Started - 处理 Tool Call 开始输入
// ============================================================================

import { create } from "mutative";
import type { AgentState } from "../state";
import type { ToolCallStarted } from "../input";

/**
 * 处理 Tool Call 开始输入
 *
 * @internal
 */
export const handleToolCallStarted = (
  input: ToolCallStarted,
  state: AgentState
): AgentState => {
  return create(state, (draft) => {
    // 创建 Tool Call 记录
    draft.toolCalls[input.toolCallId] = {
      name: input.name,
      parameters: input.parameters,
      timestamp: input.timestamp,
      result: null,
    };

    // 将 Tool Call 添加到当前 ReAct Loop 上下文
    if (draft.reactContext) {
      if (!draft.reactContext.toolCallIds.includes(input.toolCallId)) {
        draft.reactContext.toolCallIds.push(input.toolCallId);
      }
    }

    // 更新状态时间戳
    draft.timestamp = input.timestamp;
  });
};


