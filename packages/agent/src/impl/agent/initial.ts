/**
 * Agent 的初始状态实现
 */

import type { AgentState } from "@/decl/agent";
import { initialUser } from "@/impl/initials/user";
import { initialLlm } from "@/impl/initials/llm";

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
