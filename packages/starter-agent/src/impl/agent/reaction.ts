/**
 * Agent 的 Reaction 函数实现
 */

import type { Worldscape, Actuation, ReactionFns } from "@/decl/agent";
import type { PerspectiveOfUser, PerspectiveOfLlm } from "@/decl/perspectives";
import type { Dispatch } from "@moora/automata";
import type { Eff } from "@moora/effects";

// ============================================================================
// Reaction 相关函数
// ============================================================================

/**
 * 创建 Agent 的 Reaction 函数
 *
 * 根据当前状态，统合各个 Actor 的 Reaction，返回副作用函数。
 *
 * 由于 Automata 的输出需要统合所有 Actor 的 Reaction，
 * 这里我们将各个 Actor 的 Reaction 统合为一个函数。
 *
 * @param reactionFns - 各个 Actor 的 Reaction 函数映射
 * @returns 统合后的 reaction 函数
 */
export const createReaction =
  (reactionFns: ReactionFns) =>
    (worldscape: Worldscape): Eff<Dispatch<Actuation>> => {
      // 确保 worldscape 存在并提取所需的字段，使用默认值防止 undefined
      if (!worldscape) {
        console.error("[createReaction] Worldscape is undefined!");
        throw new Error("Worldscape is undefined in createReaction");
      }
      const userMessages = worldscape.userMessages ?? [];
      const assiMessages = worldscape.assiMessages ?? [];
      return (dispatch: Dispatch<Actuation>) => {
        const perspectiveUser: PerspectiveOfUser = {
          userMessages,
          assiMessages,
        };
        const perspectiveLlm: PerspectiveOfLlm = {
          userMessages,
          assiMessages,
        };
        reactionFns.user({ perspective: perspectiveUser, dispatch });
        reactionFns.llm({ perspective: perspectiveLlm, dispatch });
      };
    };
