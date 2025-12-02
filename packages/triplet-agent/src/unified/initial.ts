// ============================================================================
// initial 函数
// ============================================================================

import type { State } from "../types/unified";

/**
 * initial 函数
 * 
 * 返回初始 State。
 */
export function initial(): State {
  return {
    userAgent: {
      userMessages: [],
      canceledStreamingMessageIds: [],
    },
    agentToolkit: {
      pendingToolCalls: [],
    },
    toolkitAgent: {
      toolResults: [],
    },
    agentUser: {
      messages: [],
      streamingChunks: {},
    },
    userUser: {
      actionHistory: [],
    },
    agentAgent: {
      processingHistory: [],
    },
    toolkitToolkit: {
      executionHistory: [],
    },
  };
}

