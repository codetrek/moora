/**
 * Agent 的初始状态实现
 */

import { initialLlm } from "@/impl/initials/llm";
import { initialToolkit } from "@/impl/initials/toolkit";
import { initialUser } from "@/impl/initials/user";

import type { Worldscape } from "@/decl/agent";

/**
 * Agent 的初始状态
 *
 * @returns Agent 的初始状态
 */
export function initial(): Worldscape {
  const userAppearance = initialUser();
  const llmAppearance = initialLlm();
  const toolkitAppearance = initialToolkit();

  return {
    ...userAppearance,
    ...llmAppearance,
    ...toolkitAppearance,
  };
}
