// ============================================================================
// User 节点的 effectsAt 函数
// ============================================================================

import type { StateAgentUser } from "../types/state";
import type { EffectOfUser } from "../types/effects";

/**
 * User 节点的 effectsAt 函数
 * 
 * 根据节点的"综合观察"（所有入边 Channel 的 State）推导出要触发的 Effect。
 * User 的入边：
 * - Channel_AGENT_USER: StateAgentUser
 * 
 * 无条件返回 updateUI effect，确保 UI 始终与状态同步。
 */
export function effectsAtForUser(
  stateAgentUser: StateAgentUser
): Record<string, EffectOfUser> {
  // 无条件返回 updateUI effect
  return { user: { kind: "updateUI" } };
}

