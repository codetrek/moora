// ============================================================================
// Agent State Machine - Transition Functions
// ============================================================================

import { create } from "mutative";
import type { AgentState } from "./state";
import type { AgentEvent } from "./input";

/**
 * 处理用户消息事件
 *
 * @internal
 */
const handleUserMessage = (
  event: Extract<AgentEvent, { type: "user-message" }>,
  state: AgentState
): AgentState => {
  return create(state, (draft) => {
    // 添加用户消息到历史消息
    draft.messages[event.messageId] = {
      id: event.messageId,
      role: "user",
      content: event.content,
      timestamp: event.timestamp,
      taskIds: [],
    };

    // 将消息添加到当前 ReAct Loop 上下文
    if (!draft.reactContext.messageIds.includes(event.messageId)) {
      draft.reactContext.messageIds.push(event.messageId);
    }
  });
};

/**
 * 处理 LLM Chunk 事件
 *
 * @internal
 */
const handleLlmChunk = (
  event: Extract<AgentEvent, { type: "llm-chunk" }>,
  state: AgentState
): AgentState => {
  return create(state, (draft) => {
    const existingMessage = draft.messages[event.messageId];

    if (existingMessage && existingMessage.role === "assistant") {
      // 更新现有助手消息的内容
      draft.messages[event.messageId] = {
        ...existingMessage,
        content: existingMessage.content + event.chunk,
        streaming: true,
      };
    } else {
      // 创建新的助手消息
      draft.messages[event.messageId] = {
        id: event.messageId,
        role: "assistant",
        content: event.chunk,
        timestamp: Date.now(),
        streaming: true,
        taskIds: [],
      };

      // 将消息添加到当前 ReAct Loop 上下文
      if (!draft.reactContext.messageIds.includes(event.messageId)) {
        draft.reactContext.messageIds.push(event.messageId);
      }
    }
  });
};

/**
 * 处理 LLM 消息完成事件
 *
 * @internal
 */
const handleLlmMessageComplete = (
  event: Extract<AgentEvent, { type: "llm-message-complete" }>,
  state: AgentState
): AgentState => {
  return create(state, (draft) => {
    const existingMessage = draft.messages[event.messageId];

    if (existingMessage && existingMessage.role === "assistant") {
      // 标记消息不再流式输出
      draft.messages[event.messageId] = {
        ...existingMessage,
        streaming: false,
      };
    }
  });
};

/**
 * 处理 Tool Call 开始事件
 *
 * @internal
 */
const handleToolCallStarted = (
  event: Extract<AgentEvent, { type: "tool-call-started" }>,
  state: AgentState
): AgentState => {
  return create(state, (draft) => {
    // 创建 Tool Call 记录
    draft.toolCalls[event.toolCallId] = {
      name: event.name,
      parameters: event.parameters,
      timestamp: event.timestamp,
      result: null,
    };

    // 将 Tool Call 添加到当前 ReAct Loop 上下文
    if (!draft.reactContext.toolCallIds.includes(event.toolCallId)) {
      draft.reactContext.toolCallIds.push(event.toolCallId);
    }
  });
};

/**
 * 处理 Tool Call 结果事件
 *
 * @internal
 */
const handleToolCallResult = (
  event: Extract<AgentEvent, { type: "tool-call-result" }>,
  state: AgentState
): AgentState => {
  return create(state, (draft) => {
    const existingToolCall = draft.toolCalls[event.toolCallId];

    if (existingToolCall) {
      // 更新 Tool Call 记录的结果
      draft.toolCalls[event.toolCallId] = {
        ...existingToolCall,
        result: event.result,
      };
    }
  });
};

/**
 * 处理追加历史消息到上下文事件
 *
 * @internal
 */
const handleAddMessagesToContext = (
  event: Extract<AgentEvent, { type: "add-messages-to-context" }>,
  state: AgentState
): AgentState => {
  return create(state, (draft) => {
    // 将消息 ID 添加到当前 ReAct Loop 上下文
    for (const messageId of event.messageIds) {
      if (!draft.reactContext.messageIds.includes(messageId)) {
        draft.reactContext.messageIds.push(messageId);
      }
    }
  });
};

/**
 * 处理加载历史 ToolCall 结果到上下文事件
 *
 * @internal
 */
const handleAddToolCallsToContext = (
  event: Extract<AgentEvent, { type: "add-tool-calls-to-context" }>,
  state: AgentState
): AgentState => {
  return create(state, (draft) => {
    // 将 Tool Call ID 添加到当前 ReAct Loop 上下文
    for (const toolCallId of event.toolCallIds) {
      if (!draft.reactContext.toolCallIds.includes(toolCallId)) {
        draft.reactContext.toolCallIds.push(toolCallId);
      }
    }
  });
};

/**
 * Agent 状态转换函数
 *
 * @param input - 输入信号（AgentEvent）
 * @returns 状态转换函数
 *
 * @example
 * ```typescript
 * const transition = agentTransition({
 *   type: "user-message",
 *   messageId: "msg-1",
 *   content: "Hello",
 *   timestamp: Date.now(),
 * });
 *
 * const newState = transition(currentState);
 * ```
 */
export function agentTransition(input: AgentEvent) {
  return (state: AgentState): AgentState => {
    switch (input.type) {
      case "user-message":
        return handleUserMessage(input, state);
      case "llm-chunk":
        return handleLlmChunk(input, state);
      case "llm-message-complete":
        return handleLlmMessageComplete(input, state);
      case "tool-call-started":
        return handleToolCallStarted(input, state);
      case "tool-call-result":
        return handleToolCallResult(input, state);
      case "add-messages-to-context":
        return handleAddMessagesToContext(input, state);
      case "add-tool-calls-to-context":
        return handleAddToolCallsToContext(input, state);
      default:
        // 确保所有 case 都被处理
        const _exhaustive: never = input;
        return state;
    }
  };
}

