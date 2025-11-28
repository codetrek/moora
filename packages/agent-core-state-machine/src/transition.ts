// ============================================================================
// Agent State Machine - Transition Functions
// ============================================================================

import { create } from "mutative";
import type { AgentState } from "./state";
import type {
  AgentInput,
  UserMessageReceived,
  LlmMessageStarted,
  LlmMessageCompleted,
  ToolCallStarted,
  ToolCallCompleted,
  ContextWindowExpanded,
  HistoryToolCallsAdded,
} from "./input";

/**
 * 处理用户消息输入
 *
 * @internal
 */
const handleUserMessage = (
  input: UserMessageReceived,
  state: AgentState
): AgentState => {
  // 检查消息 ID 是否已存在
  const existingIndex = state.messages.findIndex(
    (msg) => msg.id === input.messageId
  );

  if (existingIndex >= 0) {
    console.warn(
      `[AgentStateMachine] Ignoring user message with duplicate ID: ${input.messageId}`
    );
    return state;
  }

  // 检查时间戳是否大于最后一条消息的时间戳
  if (state.messages.length > 0) {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage && input.timestamp <= lastMessage.timestamp) {
      console.warn(
        `[AgentStateMachine] Ignoring user message with invalid timestamp: messageId=${input.messageId}, timestamp=${input.timestamp}, lastMessageTimestamp=${lastMessage.timestamp}`
      );
      return state;
    }
  }

  return create(state, (draft) => {
    const newMessage = {
      id: input.messageId,
      role: "user" as const,
      content: input.content,
      timestamp: input.timestamp,
      taskIds: [] as string[],
    };

    // 添加新消息（由于已验证时间戳，直接 push 到末尾即可）
    draft.messages.push(newMessage);

    // 自动扩展 context window 以确保新消息包含在上下文中
    // 将 contextWindowSize 加 1 以适应当前新增的 UserMessage
    draft.reactContext.contextWindowSize += 1;
  });
};

/**
 * 处理 LLM 消息开始输入
 *
 * 当 LLM 开始 streaming 时，创建一个 content 为空字符串的 assistant message。
 * 在 streaming 过程中，content 保持为空，直到 llm-message-completed 事件触发。
 *
 * @internal
 */
const handleLlmMessageStarted = (
  input: LlmMessageStarted,
  state: AgentState
): AgentState => {
  // 检查消息 ID 是否已存在
  const existingIndex = state.messages.findIndex(
    (msg) => msg.id === input.messageId
  );

  if (existingIndex >= 0) {
    // 如果消息已存在，不做任何操作
    console.warn(
      `[AgentStateMachine] Ignoring llm message started with duplicate ID: ${input.messageId}`
    );
    return state;
  }

  return create(state, (draft) => {
    // 创建新的助手消息，content 为空字符串
    const timestamp = Date.now();
    const newMessage = {
      id: input.messageId,
      role: "assistant" as const,
      content: "",
      timestamp,
      streaming: true,
      taskIds: [] as string[],
    };

    // 保持按时间戳排序
    const insertIndex = draft.messages.findIndex(
      (msg) => msg.timestamp > timestamp
    );
    if (insertIndex >= 0) {
      draft.messages.splice(insertIndex, 0, newMessage);
    } else {
      draft.messages.push(newMessage);
    }
  });
};

/**
 * 处理 LLM 消息完成输入
 *
 * 在 streaming 过程中，assistant message 的 content 保持为空字符串，
 * 只有在此事件触发时才更新为完整的 content。
 *
 * @internal
 */
const handleLlmMessageCompleted = (
  input: LlmMessageCompleted,
  state: AgentState
): AgentState => {
  return create(state, (draft) => {
    const existingIndex = draft.messages.findIndex(
      (msg) => msg.id === input.messageId
    );

    if (existingIndex >= 0) {
      const existingMessage = draft.messages[existingIndex];
      if (existingMessage && existingMessage.role === "assistant") {
        // 更新消息内容为完整内容，并标记不再流式输出
        draft.messages[existingIndex] = {
          ...existingMessage,
          content: input.content,
          streaming: false,
        };
      }
    } else {
      // 如果消息不存在，创建新的助手消息
      const timestamp = Date.now();
      const newMessage = {
        id: input.messageId,
        role: "assistant" as const,
        content: input.content,
        timestamp,
        streaming: false,
        taskIds: [] as string[],
      };

      // 保持按时间戳排序
      const insertIndex = draft.messages.findIndex(
        (msg) => msg.timestamp > timestamp
      );
      if (insertIndex >= 0) {
        draft.messages.splice(insertIndex, 0, newMessage);
      } else {
        draft.messages.push(newMessage);
      }
    }
  });
};

/**
 * 处理 Tool Call 开始输入
 *
 * @internal
 */
const handleToolCallStarted = (
  input: ToolCallStarted,
  state: AgentState
): AgentState => {
  return create(state, (draft) => {
    // 创建 Tool Call 记录
    draft.toolCalls[input.toolCallId] = {
      name: input.name,
      parameters: input.parameters,
      timestamp: input.timestamp,
      result: null,
    };

    // 将 Tool Call 添加到当前 ReAct Loop 上下文
    if (!draft.reactContext.toolCallIds.includes(input.toolCallId)) {
      draft.reactContext.toolCallIds.push(input.toolCallId);
    }
  });
};

/**
 * 处理 Tool Call 结果输入
 *
 * @internal
 */
const handleToolCallCompleted = (
  input: ToolCallCompleted,
  state: AgentState
): AgentState => {
  return create(state, (draft) => {
    const existingToolCall = draft.toolCalls[input.toolCallId];

    if (existingToolCall) {
      // 更新 Tool Call 记录的结果
      draft.toolCalls[input.toolCallId] = {
        ...existingToolCall,
        result: input.result,
      };
    }
  });
};

/**
 * 处理扩展上下文窗口输入
 *
 * @internal
 */
const handleContextWindowExpanded = (
  input: ContextWindowExpanded,
  state: AgentState,
  expandContextWindowSize: number
): AgentState => {
  return create(state, (draft) => {
    // 增加上下文窗口大小
    draft.reactContext.contextWindowSize += expandContextWindowSize;
    // 限制为不超过实际消息数量
    draft.reactContext.contextWindowSize = Math.min(
      draft.reactContext.contextWindowSize,
      draft.messages.length
    );
  });
};

/**
 * 处理加载历史 ToolCall 结果到上下文输入
 *
 * @internal
 */
const handleHistoryToolCallsAdded = (
  input: HistoryToolCallsAdded,
  state: AgentState
): AgentState => {
  return create(state, (draft) => {
    // 将 Tool Call ID 添加到当前 ReAct Loop 上下文
    for (const toolCallId of input.toolCallIds) {
      if (!draft.reactContext.toolCallIds.includes(toolCallId)) {
        draft.reactContext.toolCallIds.push(toolCallId);
      }
    }
  });
};

/**
 * Agent 状态转换函数
 *
 * @param input - 输入信号（AgentInput）
 * @param options - 可选配置
 * @param options.initialContextWindowSize - 初始上下文窗口大小，默认为 10
 * @param options.expandContextWindowSize - 每次扩展上下文窗口的增量，默认为 10
 * @returns 状态转换函数
 *
 * @example
 * ```typescript
 * const transition = agentTransition(
 *   {
 *     type: "user-message-received",
 *     messageId: "msg-1",
 *     content: "Hello",
 *     timestamp: Date.now(),
 *   },
 *   {
 *     initialContextWindowSize: 20,
 *     expandContextWindowSize: 5,
 *   }
 * );
 *
 * const newState = transition(currentState);
 * ```
 */
export function agentTransition(
  input: AgentInput,
  options?: {
    initialContextWindowSize?: number;
    expandContextWindowSize?: number;
  }
) {
  const expandContextWindowSize = options?.expandContextWindowSize ?? 10;

  return (state: AgentState): AgentState => {
    switch (input.type) {
      case "user-message-received":
        return handleUserMessage(input, state);
      case "llm-message-started":
        return handleLlmMessageStarted(input, state);
      case "llm-message-completed":
        return handleLlmMessageCompleted(input, state);
      case "tool-call-started":
        return handleToolCallStarted(input, state);
      case "tool-call-completed":
        return handleToolCallCompleted(input, state);
      case "context-window-expanded":
        return handleContextWindowExpanded(input, state, expandContextWindowSize);
      case "history-tool-calls-added":
        return handleHistoryToolCallsAdded(input, state);
      default:
        // 确保所有 case 都被处理
        const _exhaustive: never = input;
        return state;
    }
  };
}

