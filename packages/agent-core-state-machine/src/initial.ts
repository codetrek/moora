// ============================================================================
// Agent State Machine - Initial State
// ============================================================================

import type { AgentState } from "./state";

/**
 * Agent 状态机的初始状态
 *
 * @returns 初始的 Agent 状态
 *
 * @example
 * ```typescript
 * const initialState = initialAgentState();
 * // {
 * //   messages: {},
 * //   tools: {},
 * //   toolCalls: {},
 * //   reactContext: { messageIds: [], toolCallIds: [] }
 * // }
 * ```
 */
export function initialAgentState(): AgentState {
  return {
    messages: {},
    tools: {},
    toolCalls: {},
    reactContext: {
      messageIds: [],
      toolCallIds: [],
    },
  };
}

