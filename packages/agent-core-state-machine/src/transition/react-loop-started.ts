// ============================================================================
// Handle React Loop Started - 处理 ReAct Loop 开始输入
// ============================================================================

import { create } from "mutative";
import type { AgentState } from "../state";
import type { ReactLoopStarted } from "../input";

/**
 * 处理 ReAct Loop 开始输入
 *
 * 创建或重置 react context 为初始状态。
 *
 * @internal
 */
export const handleReactLoopStarted = (
  input: ReactLoopStarted,
  state: AgentState,
  initialContextWindowSize: number
): AgentState => {
  return create(state, (draft) => {
    // 创建或重置 react context 为初始状态
    draft.reactContext = {
      contextWindowSize: initialContextWindowSize,
      toolCallIds: [],
      startedAt: input.timestamp,
    };

    // 更新状态时间戳
    draft.timestamp = input.timestamp;
  });
};


