/**
 * User Actor Reaction 工厂函数
 */

import type { USER } from "@/decl/actors";
import type { ReactionFnOf } from "@/decl/helpers";
import type { UserReactionOptions } from "@/decl/reactions";

// ============================================================================
// 类型定义
// ============================================================================

type UserReactionFn = ReactionFnOf<typeof USER>;

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建 User Actor 的 Reaction 函数
 *
 * User Actor 的 reaction 负责将 perspective 变化通知给外部（如 UI、WebSocket 等）。
 *
 * @param options - User reaction 配置选项
 * @returns User Actor 的 reaction 函数
 *
 * @example
 * ```typescript
 * const userReaction = createUserReaction({
 *   notifyUser: (perspective) => {
 *     // 发送 RFC6902 patch 到客户端
 *     const patch = createPatch(prevPerspective, perspective);
 *     ws.send(JSON.stringify(patch));
 *   },
 * });
 * ```
 */
export const createUserReaction = (options: UserReactionOptions): UserReactionFn => {
  const { notifyUser } = options;

  return ({ perspective }) => {
    notifyUser(perspective);
  };
};
