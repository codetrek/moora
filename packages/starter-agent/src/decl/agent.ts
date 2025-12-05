/**
 * Agent 总的 State 和 Input 定义
 */

import type { Procedure } from "@moora/automata";
import type { StateOfUser, StateOfLlm } from "./states";
import type { InputFromUser, InputFromLlm } from "./inputs";

// ============================================================================
// Output 类型定义
// ============================================================================

/**
 * Output 类型定义（两阶段副作用）
 *
 * Output 采用两阶段副作用定义：
 * - 第一阶段（同步）：返回一个 Procedure 函数
 * - 第二阶段（异步）：Procedure 函数在微任务队列中执行，可以异步 dispatch 新的 Input
 */
export type Output<Input> = () => Procedure<Input>;

// ============================================================================
// Agent 统合类型
// ============================================================================

/**
 * Agent 的总 State = 各个 Actor State 的并集
 */
export type AgentState = StateOfUser & StateOfLlm;

/**
 * Agent 的总 Input = 各个 Actor Input 的并集
 */
export type AgentInput = InputFromUser | InputFromLlm;
