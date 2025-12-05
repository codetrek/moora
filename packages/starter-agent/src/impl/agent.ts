/**
 * Agent 的综合实现
 *
 * 统合各个 Actor 的 initial、transition、output 函数，
 * 创建完整的 Agent 自动机定义。
 */

import { create } from "mutative";
import type { AgentState, AgentInput } from "../decl/agent";
import type { StateOfUser, StateOfLlm } from "../decl/states";
import type { ContextOfUser, ContextOfLlm } from "../decl/contexts";
import { initialUser } from "./initials/user";
import { initialLlm } from "./initials/llm";
import { transitionUser } from "./transitions/user";
import { transitionLlm } from "./transitions/llm";
import { outputUser } from "./output/user";
import { outputLlm } from "./output/llm";
import type { InputFromUser, InputFromLlm } from "../decl/inputs";

/**
 * Agent 的初始状态
 *
 * @returns Agent 的初始状态
 */
export function initialAgent(): AgentState {
  const userState = initialUser();
  const llmState = initialLlm();

  return {
    ...userState,
    ...llmState,
  };
}

/**
 * Agent 的状态转换函数
 *
 * 根据 Input 的类型，调用对应 Actor 的 transition 函数。
 *
 * @param input - Agent 的输入
 * @returns 状态转换函数
 */
export function transitionAgent(
  input: AgentInput
): (state: AgentState) => AgentState {
  return (state: AgentState) => {
    // 提取各个 Actor 的状态
    // StateOfUser = UserObUser & LlmObUser，两者都有 userMessages，所以只需要 userMessages
    const userState: StateOfUser = {
      userMessages: state.userMessages,
    };

    // StateOfLlm = LlmObLlm & UserObLlm，两者都有 assiMessages，所以只需要 assiMessages
    const llmState: StateOfLlm = {
      assiMessages: state.assiMessages,
    };

    // 根据 Input 类型调用对应的 transition 函数
    if (input.type === "send-user-message") {
      const newUserState = transitionUser(input as InputFromUser)(userState);
      // 更新 User 的状态会影响 Llm 的状态（因为 Llm 观察 User）
      return create(state, (draft) => {
        draft.userMessages = newUserState.userMessages;
        draft.assiMessages = newUserState.assiMessages;
      });
    } else if (input.type === "send-assi-message") {
      const newLlmState = transitionLlm(input as InputFromLlm)(llmState);
      // 更新 Llm 的状态会影响 User 的状态（因为 User 观察 Llm）
      return create(state, (draft) => {
        draft.assiMessages = newLlmState.assiMessages;
        draft.userMessages = newLlmState.userMessages;
      });
    }

    return state;
  };
}

/**
 * Agent 的输出函数
 *
 * 根据当前状态，统合各个 Actor 的输出。
 * 由于 Automata 的 moore 函数只接受一个 output 函数，
 * 这里我们需要统合所有 Actor 的输出。
 *
 * 注意：实际使用中，可能需要根据具体需求来决定如何统合多个 Actor 的输出。
 *
 * @param state - Agent 的当前状态
 * @returns 两阶段副作用函数
 */
export function outputAgent(state: AgentState) {
  // 提取各个 Actor 的 Context
  // ContextOfUser = UserObUser & UserObLlm = { userMessages, assiMessages }
  const userContext: ContextOfUser = {
    userMessages: state.userMessages,
    assiMessages: state.assiMessages,
  };

  // ContextOfLlm = LlmObUser & LlmObLlm = { userMessages, assiMessages }
  const llmContext: ContextOfLlm = {
    userMessages: state.userMessages,
    assiMessages: state.assiMessages,
  };

  // 获取各个 Actor 的输出
  const userOutput = outputUser(userContext);
  const llmOutput = outputLlm(llmContext);

  // 统合输出：返回一个函数，执行时会同时执行所有 Actor 的输出
  return () => {
    // 第一阶段：同步执行所有 Actor 的输出
    const userAsyncEffect = userOutput();
    const llmAsyncEffect = llmOutput();

    // 返回第二阶段：异步副作用函数
    return async (dispatch: (input: AgentInput) => void) => {
      // 第二阶段：异步执行所有 Actor 的输出
      await Promise.all([
        userAsyncEffect(dispatch as (input: InputFromUser) => void),
        llmAsyncEffect(dispatch as (input: InputFromLlm) => void),
      ]);
    };
  };
}
