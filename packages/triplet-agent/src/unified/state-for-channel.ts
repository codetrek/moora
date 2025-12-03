// ============================================================================
// 从统合 State 推导每个 Channel State 的函数
// ============================================================================

import type { State } from "../types/unified";
import type {
  StateUserAgent,
  StateAgentToolkit,
  StateToolkitAgent,
  StateAgentUser,
  StateAgentAgent,
  StateToolkitToolkit,
} from "../types/state";

/**
 * 从统合 State 推导 Channel USER -> AGENT 的 State
 * 
 * 实现逻辑：
 * - 从统合 State 中提取 Channel USER -> AGENT 需要的字段
 * - 构建并返回 StateUserAgent 类型
 */
export function stateForUserAgent(state: State): StateUserAgent {
  return {
    userMessages: state.userMessages,
    canceledStreamingMessageIds: state.canceledStreamingMessageIds,
  };
}

/**
 * 从统合 State 推导 Channel AGENT -> TOOLKIT 的 State
 */
export function stateForAgentToolkit(state: State): StateAgentToolkit {
  return {
    pendingToolCalls: state.pendingToolCalls,
  };
}

/**
 * 从统合 State 推导 Channel TOOLKIT -> AGENT 的 State
 */
export function stateForToolkitAgent(state: State): StateToolkitAgent {
  return {
    toolResults: state.toolResults,
  };
}

/**
 * 从统合 State 推导 Channel AGENT -> USER 的 State
 */
export function stateForAgentUser(state: State): StateAgentUser {
  return {
    messages: state.messages,
    streamingChunks: state.streamingChunks,
  };
}

/**
 * 从统合 State 推导 Channel AGENT -> AGENT (Loopback) 的 State
 */
export function stateForAgentAgent(state: State): StateAgentAgent {
  return {
    lastProcessedTimestamp: state.lastProcessedTimestamp,
  };
}

/**
 * 从统合 State 推导 Channel TOOLKIT -> TOOLKIT (Loopback) 的 State
 */
export function stateForToolkitToolkit(state: State): StateToolkitToolkit {
  return {
    executionHistory: state.executionHistory,
  };
}

