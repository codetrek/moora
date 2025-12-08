/**
 * Agent 总的 Worldscape 和 Actuation 定义
 */

import type { AppearanceOfUser, AppearanceOfLlm } from "./appearances";
import type { ActionFromUser, ActionFromLlm } from "./actions";
import type { Actors } from "./actors";
import type { ReactionFnOf } from "./helpers";

// ============================================================================
// Agent 统合类型
// ============================================================================

/**
 * Agent 的总 Worldscape = 各个 Actor Appearance 的并集
 */
export type Worldscape = AppearanceOfUser & AppearanceOfLlm;

/**
 * Agent 的总 Actuation = 各个 Actor Action 的并集
 */
export type Actuation = ActionFromUser | ActionFromLlm;

// ============================================================================
// ReactionFns 类型定义
// ============================================================================

/**
 * 各个 Actor 的 Reaction 函数映射类型
 *
 * 用于 createAgent 函数的参数类型
 */
export type ReactionFns = {
  [A in Actors]: ReactionFnOf<A>;
};
