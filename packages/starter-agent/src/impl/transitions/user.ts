/**
 * User Actor 的 Transition 函数实现
 */

import { create } from "mutative";
import type { StateOfUser } from "../../decl/states";
import type { InputFromUser, SendUserMessage } from "../../decl/inputs";

/**
 * User Actor 的状态转换函数
 *
 * 根据 Input 更新 User 的状态。
 * 这是一个纯函数，不产生副作用。
 *
 * @param input - User 的输入
 * @returns 状态转换函数
 */
export function transitionUser(
  input: InputFromUser
): (state: StateOfUser) => StateOfUser {
  return (state: StateOfUser) => {
    if (input.type === "send-user-message") {
      return transitionUserSendMessage(input)(state);
    }
    return state;
  };
}

/**
 * 处理发送用户消息的转换
 */
function transitionUserSendMessage(
  input: SendUserMessage
): (state: StateOfUser) => StateOfUser {
  return (state: StateOfUser) => {
    return create(state, (draft) => {
      draft.userMessages.push({
        id: `user-${input.timestamp}`,
        content: input.content,
        timestamp: input.timestamp,
        role: "user",
      });
    });
  };
}
