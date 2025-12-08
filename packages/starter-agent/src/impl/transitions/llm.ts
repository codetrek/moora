/**
 * Llm Actor 的 Transition 函数实现
 */

import type { AppearanceOfLlm } from "@/decl/appearances";
import type { ActionFromLlm, SendAssiMessage } from "@/decl/actions";

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
    if (action.type === "send-assi-message") {
      return transitionLlmSendMessage(action)(appearance);
    }
    return appearance;
  };
}

/**
 * 处理发送助手消息的转换
 */
function transitionLlmSendMessage(
  action: SendAssiMessage
): (appearance: AppearanceOfLlm) => AppearanceOfLlm {
  return (appearance: AppearanceOfLlm) => {
    return {
      ...appearance,
      assiMessages: [
        ...appearance.assiMessages,
        {
          id: action.id,
          content: action.content,
          timestamp: action.timestamp,
          role: "assistant",
        },
      ],
    };
  };
}
