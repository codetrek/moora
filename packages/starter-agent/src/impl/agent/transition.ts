/**
 * Agent 的状态转换函数实现
 */

import type { Worldscape, Actuation } from "@/decl/agent";
import { transitionUser } from "@/impl/transitions/user";
import { transitionLlm } from "@/impl/transitions/llm";

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
    const { userMessages, assiMessages } = worldscape;

    // 根据 Action 类型调用对应的 transition 函数
    if (action.type === "send-user-message") {
      const newUserAppearance = transitionUser(action)({ userMessages });
      return { ...worldscape, userMessages: newUserAppearance.userMessages };
    } else if (action.type === "send-assi-message") {
      const newLlmAppearance = transitionLlm(action)({ assiMessages });
      return { ...worldscape, assiMessages: newLlmAppearance.assiMessages };
    }

    return worldscape;
  };
}
