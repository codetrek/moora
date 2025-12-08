/**
 * Toolkit Actor 的 Initial 函数实现
 */

import type { AppearanceOfToolkit } from "@/decl/appearances";

/**
 * Toolkit Actor 的初始状态
 *
 * @returns Toolkit 的初始状态
 */
export function initialToolkit(): AppearanceOfToolkit {
  return {
    toolResults: [],
  };
}
