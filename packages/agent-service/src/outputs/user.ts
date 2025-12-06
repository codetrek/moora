/**
 * User Output 函数实现
 *
 * 通过 PubSub 发布 ContextOfUser 的变化
 */

import { createPatch } from "rfc6902";
import type { ContextOfUser, AgentInput, Output } from "@moora/agent";
import type { Dispatch, PubSub } from "@moora/automata";

/**
 * 创建 User Output 函数的选项
 */
export type CreateUserOutputOptions = {
  /**
   * 发布 patch 的回调函数
   */
  publishPatch: PubSub<string>["pub"];
};

/**
 * 创建 User Output 函数
 *
 * 当 ContextOfUser 发生变化时，通过 publishPatch 发布 RFC6902 patch
 *
 * @param options - 创建选项
 * @returns User Output 函数
 */
export function createUserOutput(
  options: CreateUserOutputOptions
): (context: ContextOfUser) => Output<AgentInput> {
  const { publishPatch } = options;
  let previousContext: ContextOfUser | null = null;

  return (context: ContextOfUser) => {
    console.log("[createUserOutput] Context changed, userMessages:", context.userMessages.length, "assiMessages:", context.assiMessages.length);

    return () => async (_dispatch: Dispatch<AgentInput>) => {
      // 如果是第一次，记录 context，不发送（全量数据在连接时发送）
      if (previousContext === null) {
        console.log("[createUserOutput] First context, skipping patch");
        previousContext = context;
        return;
      }

      // 计算 diff
      const patches = createPatch(previousContext, context);
      console.log("[createUserOutput] Generated patches:", patches.length, "patches");

      // 如果有变化，发布 patch
      if (patches.length > 0) {
        const patchData = JSON.stringify({
          type: "patch",
          patches,
        });

        publishPatch(patchData);
        previousContext = context;
      } else {
        console.log("[createUserOutput] No patches generated, skipping");
      }
    };
  };
}
