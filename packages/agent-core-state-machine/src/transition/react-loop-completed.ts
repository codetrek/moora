// ============================================================================
// Handle React Loop Completed - 处理 ReAct Loop 完成输入
// ============================================================================

import { create } from "mutative";
import type { AgentState } from "../state";
import type { ReactLoopCompleted } from "../input";

/**
 * 处理 ReAct Loop 完成输入
 *
 * 将 react context 设置为 null。
 *
 * @internal
 */
export const handleReactLoopCompleted = (
  input: ReactLoopCompleted,
  state: AgentState
): AgentState => {
  return create(state, (draft) => {
    // 将 react context 设置为 null
    draft.reactContext = null;

    // 更新状态时间戳
    draft.timestamp = input.timestamp;
  });
};


