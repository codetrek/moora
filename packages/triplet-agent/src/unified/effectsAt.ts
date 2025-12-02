// ============================================================================
// effectsAt 函数（统合所有 effectsAt）
// ============================================================================

import type { State, Effect } from "../types/unified";
import {
  effectsAtForUser,
  effectsAtForAgent,
  effectsAtForToolkit,
} from "../effectsAt";
import {
  stateForAgentUser,
  stateForUserAgent,
  stateForToolkitAgent,
  stateForAgentAgent,
  stateForAgentToolkit,
  stateForToolkitToolkit,
} from "./state-for-channel";

/**
 * 统合的 effectsAt 函数
 * 
 * 实现逻辑：
 * - 使用对应的 stateForXxxYyy 函数从统合 State 提取各个 Channel State
 * - 调用各个节点的 effectsAtFor<P> 函数，传入对应的 Channel State
 * - 收集所有 Effect，合并为 Effect Record（注意 key 的唯一性）
 * - 返回 Effect Record
 */
export function effectsAt(state: State): Record<string, Effect> {
  const effects: Record<string, Effect> = {};

  // User 节点的 effectsAt
  const agentUserState = stateForAgentUser(state);
  const userEffects = effectsAtForUser(agentUserState);
  Object.assign(effects, userEffects);

  // Agent 节点的 effectsAt
  const userAgentState = stateForUserAgent(state);
  const toolkitAgentState = stateForToolkitAgent(state);
  const agentAgentState = stateForAgentAgent(state);
  const agentEffects = effectsAtForAgent(
    userAgentState,
    toolkitAgentState,
    agentAgentState
  );
  Object.assign(effects, agentEffects);

  // Toolkit 节点的 effectsAt
  const agentToolkitState = stateForAgentToolkit(state);
  const toolkitToolkitState = stateForToolkitToolkit(state);
  const toolkitEffects = effectsAtForToolkit(
    agentToolkitState,
    toolkitToolkitState
  );
  Object.assign(effects, toolkitEffects);

  return effects;
}

