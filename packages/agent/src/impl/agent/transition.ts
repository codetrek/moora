/**
 * Agent 的状态转换函数实现
 */

import type { Worldscape, Actuation } from "@/decl/agent";
import { transitionUser } from "@/impl/transitions/user";
import { transitionLlm } from "@/impl/transitions/llm";
import { transitionToolkit } from "@/impl/transitions/toolkit";

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
    const {
      userMessages,
      assiMessages,
      cutOff,
      toolCallRequests,
      toolResults,
    } = worldscape;

    // 根据 Action 类型调用对应的 transition 函数
    if (action.type === "send-user-message") {
      const newUserAppearance = transitionUser(action)({ userMessages });
      return { ...worldscape, userMessages: newUserAppearance.userMessages };
    } else if (
      action.type === "start-assi-message-stream" ||
      action.type === "end-assi-message-stream" ||
      action.type === "request-tool-call"
    ) {
      const newLlmAppearance = transitionLlm(action)({
        assiMessages,
        cutOff,
        toolCallRequests: toolCallRequests || [],
      });
      return {
        ...worldscape,
        assiMessages: newLlmAppearance.assiMessages,
        // 确保 cutOff 只增不减，防止异步 dispatch 导致的时序问题
        cutOff: Math.max(cutOff, newLlmAppearance.cutOff),
        toolCallRequests: newLlmAppearance.toolCallRequests,
      };
    } else if (action.type === "receive-tool-result") {
      const newToolkitAppearance = transitionToolkit(action)({
        toolResults: toolResults || [],
      });
      return {
        ...worldscape,
        toolResults: newToolkitAppearance.toolResults,
      };
    }

    return worldscape;
  };
}
