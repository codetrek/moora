// ============================================================================
// Handle Context Window Expanded - 处理扩展上下文窗口输入
// ============================================================================

import { create } from "mutative";
import type { AgentState } from "../state";
import type { ContextWindowExpanded } from "../input";

/**
 * 处理扩展上下文窗口输入
 *
 * @internal
 */
export const handleContextWindowExpanded = (
  input: ContextWindowExpanded,
  state: AgentState,
  expandContextWindowSize: number
): AgentState => {
  return create(state, (draft) => {
    if (draft.reactContext) {
      // 增加上下文窗口大小
      draft.reactContext.contextWindowSize += expandContextWindowSize;
      // 限制为不超过实际消息数量
      draft.reactContext.contextWindowSize = Math.min(
        draft.reactContext.contextWindowSize,
        draft.messages.length
      );
    }

    // 更新状态时间戳
    draft.timestamp = input.timestamp;
  });
};


