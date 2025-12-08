/**
 * createAgent 工厂函数
 */

import { automata } from "@moora/automata";
import type { StatefulTransferer, UpdatePack } from "@moora/automata";
import type { Worldscape, Actuation, ReactionFns, PartialReactionFns } from "@/decl/agent";
import { initial } from "@/impl/agent/initial";
import { transition } from "@/impl/agent/transition";
import { createReaction } from "@/impl/agent/reaction";
import { USER, LLM, TOOLKIT } from "@/decl/actors";
import type { ReactionFnOf } from "@/decl/helpers";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * Agent 的更新包类型（状态机的输出）
 *
 * 包含状态转换的完整信息：
 * - prev: 前一个状态和触发转换的动作（初始状态时为 null）
 * - state: 当前状态
 */
export type AgentUpdatePack = UpdatePack<Actuation, Worldscape>;

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 创建 noop Reaction 函数
 *
 * 返回一个空的 reaction，不执行任何操作
 */
function createNoopReaction<Actor extends typeof USER | typeof LLM | typeof TOOLKIT>(): ReactionFnOf<Actor> {
  return () => {};
}

/**
 * 填充 partial ReactionFns 为完整的 ReactionFns
 *
 * 对于缺失的 Actor，使用 noop 函数填充
 */
function fillReactionFns(partialReactionFns: PartialReactionFns): ReactionFns {
  return {
    [USER]: partialReactionFns[USER] ?? createNoopReaction<typeof USER>(),
    [LLM]: partialReactionFns[LLM] ?? createNoopReaction<typeof LLM>(),
    [TOOLKIT]: partialReactionFns[TOOLKIT] ?? createNoopReaction<typeof TOOLKIT>(),
  };
}

// ============================================================================
// 主要函数
// ============================================================================

/**
 * 创建 Agent 实例
 *
 * 使用 automata 实现，副作用在 reaction 函数中直接执行，
 * 输出为 UpdatePack，包含完整的状态更新信息用于日志和调试。
 *
 * 这种设计：
 * 1. 副作用在 automata 内部自动执行，subscribe 只需处理日志
 * 2. 暴露完整的状态更新信息（prev state, action, current state）
 * 3. 对于未提供的 Actor reaction 函数，会自动填充为 noop（空操作）
 *
 * @param partialReactionFns - 各个 Actor 的 Reaction 函数映射（可以是部分提供）
 * @returns Agent 自动机实例
 *
 * @example
 * ```typescript
 * import { createAgent } from '@moora/agent';
 *
 * const agent = createAgent({
 *   user: ({ perspective }) => {
 *     // User Actor 的副作用逻辑，直接执行
 *   },
 *   llm: ({ perspective }) => {
 *     // LLM Actor 的副作用逻辑
 *   },
 * });
 *
 * // subscribe 只需要处理日志，副作用已自动执行
 * agent.subscribe((update) => {
 *   console.log('State update:', update);
 * });
 *
 * agent.dispatch({ type: 'send-user-message', id: 'msg-1', content: 'Hello', timestamp: Date.now() });
 * ```
 */
export function createAgent(
  partialReactionFns: PartialReactionFns
): StatefulTransferer<Actuation, AgentUpdatePack, Worldscape> {
  const reactionFns = fillReactionFns(partialReactionFns);
  const executeReaction = createReaction(reactionFns);

  const machine = automata(
    { initial, transition },
    (update: AgentUpdatePack) => ({ output: update })
  );

  // 内部订阅，自动执行副作用
  machine.subscribe((update) => {
    executeReaction(update.state)(machine.dispatch);
  });

  return machine;
}
