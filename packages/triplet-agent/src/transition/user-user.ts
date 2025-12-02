// ============================================================================
// Channel USER -> USER (Loopback) 的 transition 函数
// ============================================================================

import { create } from "mutative";
import type { OutputFromUser } from "../types/signal";
import type { StateUserUser } from "../types/state";

/**
 * Channel USER -> USER (Loopback) 的 transition 函数
 * 
 * State 随 User 的 Output 变化：
 * - 记录所有用户操作到历史中
 */
export function transitionUserUser(
  output: OutputFromUser,
  state: StateUserUser
): StateUserUser {
  return create(state, (draft) => {
    draft.actionHistory.push({
      type: output.type,
      messageId: output.messageId,
      timestamp: Date.now(),
    });
  });
}

