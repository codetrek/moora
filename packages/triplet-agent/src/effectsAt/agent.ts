// ============================================================================
// Agent 节点的 effectsAt 函数
// ============================================================================

import type { StateForAgent, EffectOfAgent } from "../types/effects";

/**
 * Agent 节点的 effectsAt 函数
 * 
 * 根据节点的"综合观察"（所有入边 Channel 的 State）推导出要触发的 Effect。
 * Agent 的入边：
 * - Channel_USER_AGENT: StateUserAgent
 * - Channel_TOOLKIT_AGENT: StateToolkitAgent
 * - Channel_AGENT_AGENT (loopback): StateAgentAgent
 * - Channel_AGENT_TOOLKIT: StateAgentToolkit（用于查找 tool call 请求信息）
 * 
 * 判断是否需要新的 LLM call 的条件：
 * 1. 所有 tool call 都返回了（pendingToolCalls 为空）
 * 2. 有比上次截止时间更新的 user message 或 tool call result
 * 
 * 如果有 tool call 没返回，不着急 call LLM；如果没有更新的用户/tool 消息，没必要 call LLM。
 */
export function effectsAtForAgent(
  state: StateForAgent
): Record<string, EffectOfAgent> {
  // 条件 1：检查是否所有 tool call 都返回了
  const hasPendingToolCalls = state.agentToolkit.pendingToolCalls.length > 0;
  if (hasPendingToolCalls) {
    // 如果有待执行的 tool call，不着急 call LLM
    return {};
  }

  // 条件 2：检查是否有比上次截止时间更新的 user message 或 tool result
  const lastProcessedTimestamp = state.agentAgent.lastProcessedTimestamp;
  
  // 检查是否有更新的用户消息
  const hasNewUserMessages = state.userAgent.userMessages.some(
    (msg) => msg.timestamp > lastProcessedTimestamp
  );

  // 检查是否有更新的工具结果
  const hasNewToolResults = state.toolkitAgent.toolResults.some(
    (result) => result.timestamp > lastProcessedTimestamp
  );

  // 如果有新的输入，需要调用 LLM
  if (hasNewUserMessages || hasNewToolResults) {
    // 计算最新的时间戳：max(latest user message time, latest tool response time)
    const userMessageTimestamps = state.userAgent.userMessages.map(
      (msg) => msg.timestamp
    );
    const toolResultTimestamps = state.toolkitAgent.toolResults.map(
      (result) => result.timestamp
    );
    const allTimestamps = [...userMessageTimestamps, ...toolResultTimestamps];
    const latestTimestamp =
      allTimestamps.length > 0
        ? Math.max(...allTimestamps)
        : Date.now();
    
    return { agent: { kind: "callLLM", latestTimestamp } };
  }

  return {};
}

