/**
 * Agent 的初始状态实现
 */

import type { Worldscape } from "@/decl/agent";
import { initialUser } from "@/impl/initials/user";
import { initialLlm } from "@/impl/initials/llm";

/**
 * Agent 的初始状态
 *
 * @returns Agent 的初始状态
 */
export function initial(): Worldscape {
  const userAppearance = initialUser();
  const llmAppearance = initialLlm();

  return {
    ...userAppearance,
    ...llmAppearance,
  };
}
