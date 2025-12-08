/**
 * Agent 总的 Worldscape 和 Actuation 定义
 */

import type { Dispatch } from "@moora/automata";
import type { Eff } from "@moora/effects";
import type { AppearanceOfUser, AppearanceOfLlm, AppearanceOfToolkit } from "./appearances";
import type { ActionFromUser, ActionFromLlm, ActionFromToolkit } from "./actions";
import type { Actors } from "./actors";
import type { ReactionFnOf } from "./helpers";

// ============================================================================
// Agent 统合类型
// ============================================================================

/**
 * Agent 的总 Worldscape = 各个 Actor Appearance 的并集
 */
export type Worldscape = AppearanceOfUser & AppearanceOfLlm & AppearanceOfToolkit;

/**
 * Agent 的总 Actuation = 各个 Actor Action 的并集
 */
export type Actuation = ActionFromUser | ActionFromLlm | ActionFromToolkit;

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

/**
 * 部分 Reaction 函数映射类型
 *
 * 用于 createAgent 函数的参数类型，允许只提供部分 Actor 的 Reaction 函数
 */
export type PartialReactionFns = Partial<ReactionFns>;
