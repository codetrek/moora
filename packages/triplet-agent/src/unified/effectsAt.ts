// ============================================================================
// effectsAt 函数（统合所有 effectsAt）
// ============================================================================

import type { State, Effect } from "../types/unified";
import {
  effectsAtForUser,
  effectsAtForAgent,
  effectsAtForToolkit,
} from "../effectsAt";

/**
 * effectsAt 函数
 * 
 * 综合所有节点的 effectsAt 逻辑，从全局 State 推导 Effect。
 */
export function effectsAt(state: State): Record<string, Effect> {
  const effects: Record<string, Effect> = {};

  // User 节点的 effectsAt
  const userEffects = effectsAtForUser(state.agentUser, state.userUser);
  Object.assign(effects, userEffects);

  // Agent 节点的 effectsAt
  const agentEffects = effectsAtForAgent(
    state.userAgent,
    state.toolkitAgent,
    state.agentAgent
  );
  Object.assign(effects, agentEffects);

  // Toolkit 节点的 effectsAt
  const toolkitEffects = effectsAtForToolkit(
    state.agentToolkit,
    state.toolkitToolkit
  );
  Object.assign(effects, toolkitEffects);

  return effects;
}

