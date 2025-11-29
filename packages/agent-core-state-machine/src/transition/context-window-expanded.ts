// ============================================================================
// Handle Context Window Expanded - 处理扩展上下文窗口输入
// ============================================================================

import type { AgentState } from "../state";
import type { ContextWindowExpanded } from "../input";

/**
 * 处理扩展上下文窗口输入
 *
 * @internal
 */
export const handleContextWindowExpanded = (
  { timestamp }: ContextWindowExpanded,
  state: AgentState,
  expandContextWindowSize: number
): AgentState => {
  const { reactContext } = state;

  // 检查 reactContext 是否存在
  if (!reactContext) {
    console.warn(
      `[AgentStateMachine] Ignoring context window expanded without react context`
    );
    return state;
  }

  return {
    ...state,
    reactContext: {
      ...reactContext,

      // 扩展上下文窗口大小，但不超过消息列表长度
      contextWindowSize: Math.min(
        reactContext.contextWindowSize + expandContextWindowSize,
        state.messages.length
      ),

      // 更新 reactContext 时间戳
      updatedAt: timestamp,
    },

    // 更新状态时间戳
    updatedAt: timestamp,
  };
};


