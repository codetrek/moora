// ============================================================================
// initial 函数
// ============================================================================

import type { State } from "../types/unified";

/**
 * 初始化函数
 * 
 * 实现逻辑：
 * - 返回所有去重后字段的初始值
 * - 构建符合 State 类型的初始状态对象
 */
export function initial(): State {
  return {
    // 来自 StateUserAgent
    userMessages: [],
    canceledStreamingMessageIds: [],
    
    // 来自 StateAgentToolkit
    pendingToolCalls: [],
    
    // 来自 StateToolkitAgent
    toolResults: [],
    
    // 来自 StateAgentUser
    messages: [],
    streamingChunks: {},
    
    // 来自 StateAgentAgent
    lastProcessedTimestamp: 0,
    
    // 来自 StateToolkitToolkit
    executionHistory: [],
  };
}

