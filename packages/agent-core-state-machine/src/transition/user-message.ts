// ============================================================================
// Handle User Message - 处理用户消息输入
// ============================================================================

import type { UserMessage } from "@moora/agent-webui-protocol";
import type { AgentState } from "../state";
import type { UserMessageReceived } from "../input";
import { messageIdExists } from "./utils";

/**
 * 处理用户消息输入
 *
 * 当收到用户消息时：
 * - 将消息加入消息列表
 * - 如果有 reactContext，则把 context window + 1
 * - 否则，按照 initialContextWindowSize 创建一个 reactContext
 *
 * @internal
 */
export const handleUserMessage = (
  { messageId, content, timestamp }: UserMessageReceived,
  state: AgentState,
  initialContextWindowSize: number
): AgentState => {
  // 检查消息 ID 是否已存在
  if (messageIdExists(state, messageId)) {
    console.warn(
      `[AgentStateMachine] Ignoring user message with duplicate ID: ${messageId}`
    );
    return state;
  }

  // 创建新的用户消息
  const newMessage: UserMessage = {
    id: messageId,
    role: "user",
    content,
    receivedAt: timestamp,
    taskIds: [],
  };

  // 在消息列表末尾加入 newMessage
  const messages = [...state.messages, newMessage];

  const currentReactContext = state.reactContext;

  // 判断是否有 reactContext
  const reactContext = currentReactContext
    ? // 如果有 reactContext，则把 context window + 1
      {
        ...currentReactContext,
        contextWindowSize: currentReactContext.contextWindowSize + 1,
        updatedAt: timestamp,
      }
    : // 如果没有 reactContext，则创建新的 reactContext
      {
        contextWindowSize: initialContextWindowSize,
        toolCallIds: [],
        startedAt: timestamp,
        updatedAt: timestamp,
      };

  return {
    ...state,
    messages,
    reactContext,
    // 更新状态时间戳
    updatedAt: timestamp,
  };
};


