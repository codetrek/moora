/**
 * Llm Actor 的 Transition 函数实现
 */

import type {
  ActionFromLlm,
  StartAssiMessageStream,
  EndAssiMessageStream,
  RequestToolCall,
} from "@/decl/actions";
import type { AppearanceOfLlm } from "@/decl/appearances";

/**
 * Llm Actor 的状态转换函数
 *
 * 根据 Action 更新 Llm 的状态。
 * 这是一个纯函数，不产生副作用。
 *
 * @param action - Llm 的输入动作
 * @returns 状态转换函数
 */
export function transitionLlm(
  action: ActionFromLlm
): (appearance: AppearanceOfLlm) => AppearanceOfLlm {
  return (appearance: AppearanceOfLlm) => {
    if (action.type === "start-assi-message-stream") {
      return transitionLlmStartStream(action)(appearance);
    }
    if (action.type === "end-assi-message-stream") {
      return transitionLlmEndStream(action)(appearance);
    }
    if (action.type === "request-tool-call") {
      return transitionLlmRequestToolCall(action)(appearance);
    }
    return appearance;
  };
}

/**
 * 处理开始流式生成助手消息的转换
 *
 * 确保 cutOff 只增不减，防止异步 dispatch 导致的时序问题
 */
function transitionLlmStartStream(
  action: StartAssiMessageStream
): (appearance: AppearanceOfLlm) => AppearanceOfLlm {
  return (appearance: AppearanceOfLlm) => {
    return {
      ...appearance,
      assiMessages: [
        ...appearance.assiMessages,
        {
          id: action.id,
          timestamp: action.timestamp,
          role: "assistant",
          streaming: true,
        },
      ],
      // 确保 cutOff 只增不减，防止异步 dispatch 导致的时序问题
      cutOff: Math.max(appearance.cutOff, action.cutOff),
    };
  };
}

/**
 * 处理结束流式生成助手消息的转换
 *
 * 保留 start stream 时的时间戳，不使用 end stream 的时间戳
 * 显式保留 cutOff，防止异步 dispatch 导致的时序问题导致 cutOff 被回退
 */
function transitionLlmEndStream(
  action: EndAssiMessageStream
): (appearance: AppearanceOfLlm) => AppearanceOfLlm {
  return (appearance: AppearanceOfLlm) => {
    // 找到对应的消息并更新
    const originalMessage = appearance.assiMessages.find(
      (msg) => msg.id === action.id
    );

    if (!originalMessage) {
      // 如果找不到消息，可能是状态不一致，返回原状态
      return appearance;
    }

    // 更新消息，保留原来的 timestamp（start stream 的时间）
    const updatedMessages = appearance.assiMessages.map((msg) => {
      if (msg.id === action.id) {
        return {
          id: action.id,
          timestamp: originalMessage.timestamp, // 保留 start stream 的时间戳
          role: "assistant" as const,
          streaming: false as const,
          content: action.content,
        };
      }
      return msg;
    });

    return {
      ...appearance,
      assiMessages: updatedMessages,
      // 显式保留 cutOff，防止异步 dispatch 导致的时序问题导致 cutOff 被回退
      cutOff: appearance.cutOff,
    };
  };
}

/**
 * 处理工具调用请求的转换
 *
 * 同时更新 cutOff，确保只有 tool_calls 时也能正确更新 cutOff
 */
function transitionLlmRequestToolCall(
  action: RequestToolCall
): (appearance: AppearanceOfLlm) => AppearanceOfLlm {
  return (appearance: AppearanceOfLlm) => {
    return {
      ...appearance,
      toolCallRequests: [
        ...appearance.toolCallRequests,
        {
          toolCallId: action.toolCallId,
          name: action.name,
          arguments: action.arguments,
          timestamp: action.timestamp,
        },
      ],
      // 确保 cutOff 只增不减
      cutOff: Math.max(appearance.cutOff, action.cutOff),
    };
  };
}
