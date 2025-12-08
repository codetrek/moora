/**
 * Llm Actor 的 Initial 函数实现
 */

import type { AppearanceOfLlm } from "@/decl/appearances";

/**
 * Llm Actor 的初始状态
 *
 * @returns Llm 的初始状态
 */
export function initialLlm(): AppearanceOfLlm {
  return {
    assiMessages: [],
    cutOff: 0,
    toolCallRequests: [],
  };
}
