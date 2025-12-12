/**
 * Agent 的状态转换函数实现
 */

import { transitionLlm } from "@/impl/transitions/llm";
import { transitionUser } from "@/impl/transitions/user";

import type { Worldscape, Actuation } from "@/decl/agent";

/**
 * Agent 的状态转换函数
 *
 * 根据 Action 的类型，调用对应 Actor 的 transition 函数。
 *
 * @param action - Agent 的输入动作
 * @returns 状态转换函数
 */
export function transition(
  action: Actuation
): (worldscape: Worldscape) => Worldscape {
  return (worldscape: Worldscape) => {
    const { userMessages, assiMessages, cutOff } = worldscape;

    // 根据 Action 类型调用对应的 transition 函数
    if (action.type === "send-user-message") {
      const newUserAppearance = transitionUser(action)({ userMessages });
      return { ...worldscape, userMessages: newUserAppearance.userMessages };
    } else if (
      action.type === "start-assi-message-stream" ||
      action.type === "end-assi-message-stream"
    ) {
      const newLlmAppearance = transitionLlm(action)({
        assiMessages,
        cutOff: cutOff ?? 0,
      });
      return {
        ...worldscape,
        assiMessages: newLlmAppearance.assiMessages,
        cutOff: newLlmAppearance.cutOff,
      };
    }

    return worldscape;
  };
}
