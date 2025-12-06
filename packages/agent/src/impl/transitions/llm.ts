/**
 * Llm Actor 的 Transition 函数实现
 */

import type { StateOfLlm } from "@/decl/states";
import type { InputFromLlm, SendAssiMessage } from "@/decl/inputs";

/**
 * Llm Actor 的状态转换函数
 *
 * 根据 Input 更新 Llm 的状态。
 * 这是一个纯函数，不产生副作用。
 *
 * @param input - Llm 的输入
 * @returns 状态转换函数
 */
export function transitionLlm(
  input: InputFromLlm
): (state: StateOfLlm) => StateOfLlm {
  return (state: StateOfLlm) => {
    if (input.type === "send-assi-message") {
      return transitionLlmSendMessage(input)(state);
    }
    return state;
  };
}

/**
 * 处理发送助手消息的转换
 */
function transitionLlmSendMessage(
  input: SendAssiMessage
): (state: StateOfLlm) => StateOfLlm {
  return (state: StateOfLlm) => {
    return {
      ...state,
      assiMessages: [
        ...state.assiMessages,
        {
          id: input.id,
          content: input.content,
          timestamp: input.timestamp,
          role: "assistant",
        },
      ],
    };
  };
}
