/**
 * User Actor 的 Transition 函数实现
 */

import type { ActionFromUser, SendUserMessage } from "@/decl/actions";
import type { AppearanceOfUser } from "@/decl/appearances";

/**
 * User Actor 的状态转换函数
 *
 * 根据 Action 更新 User 的状态。
 * 这是一个纯函数，不产生副作用。
 *
 * @param action - User 的输入动作
 * @returns 状态转换函数
 */
export function transitionUser(
  action: ActionFromUser
): (appearance: AppearanceOfUser) => AppearanceOfUser {
  return (appearance: AppearanceOfUser) => {
    if (action.type === "send-user-message") {
      return transitionUserSendMessage(action)(appearance);
    }
    return appearance;
  };
}

/**
 * 处理发送用户消息的转换
 */
function transitionUserSendMessage(
  action: SendUserMessage
): (appearance: AppearanceOfUser) => AppearanceOfUser {
  return (appearance: AppearanceOfUser) => {
    return {
      ...appearance,
      userMessages: [
        ...appearance.userMessages,
        {
          id: action.id,
          content: action.content,
          timestamp: action.timestamp,
          role: "user",
        },
      ],
    };
  };
}
