/**
 * User Actor 的 Initial 函数实现
 */

import type { AppearanceOfUser } from "@/decl/appearances";

/**
 * User Actor 的初始状态
 *
 * @returns User 的初始状态
 */
export function initialUser(): AppearanceOfUser {
  return {
    userMessages: [],
  };
}
