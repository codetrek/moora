// ============================================================================
// Frontend Controller Mappers - 状态和事件映射函数
// ============================================================================

import type { AgentAppState, AgentAppEvent } from "@moora/agent-webui-protocol";
import type { AgentState, AgentInput } from "../types";

/**
 * 将 AgentState 映射为 AgentAppState
 * 
 * @param state - Agent 内部状态
 * @returns 用户可见的应用状态
 * 
 * @example
 * ```typescript
 * const agentState: AgentState = {
 *   phase: 'processing',
 *   messages: [{ id: '1', role: 'user', content: 'Hello', timestamp: Date.now() }],
 *   llmHistory: [],
 *   toolHistory: [],
 * };
 * 
 * const appState = mapAppState(agentState);
 * // { status: 'thinking', messages: [...], isProcessing: true }
 * ```
 */
export const mapAppState = (state: AgentState): AgentAppState => {
  // 确定状态
  let status: AgentAppState["status"] = "idle";
  if (state.phase === "error") {
    status = "error";
  } else if (state.phase === "processing") {
    // 检查是否有正在进行的 LLM 调用
    const hasActiveLLM = state.llmHistory.some(
      (call) =>
        call.requestId === state.currentRequestId &&
        !call.response &&
        !call.error
    );
    status = hasActiveLLM ? "thinking" : "responding";
  }

  // 转换消息格式
  const messages = state.messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
    streaming: msg.streaming,
  }));

  return {
    status,
    messages,
    error: state.error,
    isProcessing: state.phase === "processing",
  };
};

/**
 * 将 AgentAppEvent 解释为 AgentInput 数组
 * 
 * @param event - 应用事件
 * @returns Agent 输入信号数组
 * 
 * @example
 * ```typescript
 * const event: AgentAppEvent = {
 *   type: 'user-message',
 *   content: 'Hello',
 * };
 * 
 * const inputs = interpretAppEvent(event);
 * // [{ type: 'user-message', requestId: '...', content: 'Hello' }]
 * ```
 */
export const interpretAppEvent = (event: AgentAppEvent): AgentInput[] => {
  switch (event.type) {
    case "user-message": {
      const requestId = `req-${Date.now()}-${Math.random()}`;
      return [
        {
          type: "user-message",
          requestId,
          content: event.content,
        },
      ];
    }

    case "cancel": {
      // 需要从当前状态获取 requestId，这里返回一个占位符
      // 实际实现中，controller 需要访问当前状态
      return [
        {
          type: "cancel",
          requestId: "", // 将在 createAgentController 中处理
        },
      ];
    }

    case "retry": {
      // 重试逻辑：重新发送最后一条用户消息
      // 实际实现中需要从状态中获取
      return [];
    }

    case "clear": {
      return [
        {
          type: "clear",
        },
      ];
    }

    default: {
      return [];
    }
  }
};

