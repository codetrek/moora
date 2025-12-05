/**
 * User Actor 的 Initial 函数实现
 */

import type { StateOfUser } from "../../decl/states";

/**
 * User Actor 的初始状态
 *
 * @returns User 的初始状态
 */
export function initialUser(): StateOfUser {
  return {
    userMessages: [],
  };
}
