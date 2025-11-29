// ============================================================================
// Handle History Tool Calls Added - 处理加载历史 ToolCall 结果到上下文输入
// ============================================================================

import type { AgentState } from "../state";
import type { HistoryToolCallsAdded } from "../input";

/**
 * 处理加载历史 ToolCall 结果到上下文输入
 *
 * @internal
 */
export const handleHistoryToolCallsAdded = (
  { toolCallIds, timestamp }: HistoryToolCallsAdded,
  state: AgentState
): AgentState => {
  const { reactContext } = state;

  // 检查 reactContext 是否存在
  if (!reactContext) {
    console.warn(
      `[AgentStateMachine] Ignoring history tool calls added without react context`
    );
    return state;
  }

  return {
    ...state,
    reactContext: {
      ...reactContext,

      // 把 input.toolCallIds 添加到 reactContext.toolCallIds 中，去重
      toolCallIds: [
        ...new Set([
          ...reactContext.toolCallIds,
          ...toolCallIds,
        ]),
      ],

      // 更新 reactContext 时间戳
      updatedAt: timestamp,
    },

    // 更新状态时间戳
    updatedAt: timestamp,
  };
};
