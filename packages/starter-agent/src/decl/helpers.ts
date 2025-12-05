/**
 * Helper Generic 类型定义
 *
 * 用于类型推导的辅助类型
 */

import type { Actors } from "./actors";
import type { StateOfUser, StateOfLlm } from "./states";
import type { ContextOfUser, ContextOfLlm } from "./contexts";
import type { InputFromUser, InputFromLlm } from "./inputs";
import type { USER, LLM } from "./actors";
import type { Output } from "./agent";

// ============================================================================
// Helper Generic 类型
// ============================================================================

/**
 * 根据 Actor 类型推导对应的 State
 */
export type StateOf<Actor extends Actors> = Actor extends typeof USER
  ? StateOfUser
  : Actor extends typeof LLM
    ? StateOfLlm
    : never;

/**
 * 根据 Actor 类型推导对应的 Context
 */
export type ContextOf<Actor extends Actors> = Actor extends typeof USER
  ? ContextOfUser
  : Actor extends typeof LLM
    ? ContextOfLlm
    : never;

/**
 * 根据 Actor 类型推导对应的 Input
 */
export type InputFrom<Actor extends Actors> = Actor extends typeof USER
  ? InputFromUser
  : Actor extends typeof LLM
    ? InputFromLlm
    : never;

// ============================================================================
// 关键函数的类型定义
// ============================================================================

/**
 * Initial 函数类型
 */
export type InitialFnOf<Actor extends Actors> = () => StateOf<Actor>;

/**
 * Transition 函数类型
 */
export type TransitionFnOf<Actor extends Actors> = (
  input: InputFrom<Actor>
) => (state: StateOf<Actor>) => StateOf<Actor>;

/**
 * Output 函数类型
 *
 * 注意：参数应该是 ContextOf<Actor> 而不是 StateOf<Actor>，
 * 因为 Output 函数需要根据 Actor 的 Context（发出的 Observation）来决定要触发的副作用。
 */
export type OutputFnOf<Actor extends Actors> = (
  context: ContextOf<Actor>
) => Output<InputFrom<Actor>>;
