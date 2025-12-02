// ============================================================================
// Agent 节点的 effectsAt 函数
// ============================================================================

import type {
  StateUserAgent,
  StateToolkitAgent,
  StateAgentAgent,
} from "../types/state";
import type { EffectOfAgent } from "../types/effects";

/**
 * Agent 节点的 effectsAt 函数
 * 
 * 根据节点的"综合观察"（所有入边 Channel 的 State）推导出要触发的 Effect。
 * Agent 的入边：
 * - Channel_USER_AGENT: StateUserAgent
 * - Channel_TOOLKIT_AGENT: StateToolkitAgent
 * - Channel_AGENT_AGENT (loopback): StateAgentAgent
 * 
 * 当有新的用户消息或工具执行结果时，需要调用 LLM。
 */
export function effectsAtForAgent(
  stateUserAgent: StateUserAgent,
  stateToolkitAgent: StateToolkitAgent,
  stateAgentAgent: StateAgentAgent
): Record<string, EffectOfAgent> {
  // 如果有新的用户消息，需要调用 LLM
  if (stateUserAgent.userMessages.length > 0) {
    return { agent: { kind: "callLLM" } };
  }
  // 如果有工具执行结果，需要继续调用 LLM 处理
  if (stateToolkitAgent.toolResults.length > 0) {
    return { agent: { kind: "callLLM" } };
  }
  return {};
}

