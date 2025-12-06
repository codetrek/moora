/**
 * User Output 函数实现
 *
 * 通过 SSE 发送 ContextOfUser 的变化
 */

import { createPatch } from "rfc6902";
import type { ContextOfUser, AgentInput, Output } from "@moora/agent";
import type { Dispatch } from "@moora/automata";

/**
 * SSE 连接管理器
 */
type SSEConnection = {
  queue: string[];
  resolve: (() => void) | null;
  closed: boolean;
};

/**
 * 创建 User Output 函数的选项
 */
export type CreateUserOutputOptions = {
  /**
   * SSE 连接集合
   */
  connections: Set<SSEConnection>;
};

/**
 * 创建 User Output 函数
 *
 * 当 ContextOfUser 发生变化时，通过 SSE 发送 RFC6902 patch
 *
 * @param options - 创建选项
 * @returns User Output 函数
 */
export function createUserOutput(
  options: CreateUserOutputOptions
): (context: ContextOfUser) => Output<AgentInput> {
  const { connections } = options;
  let previousContext: ContextOfUser | null = null;

  return (context: ContextOfUser) => {
    return () => async (dispatch: Dispatch<AgentInput>) => {
      // 如果是第一次，记录 context，不发送（全量数据在连接时发送）
      if (previousContext === null) {
        previousContext = context;
        return;
      }

      // 计算 diff
      const patches = createPatch(previousContext, context);

      // 如果有变化，发送 patch
      if (patches.length > 0) {
        const patchData = JSON.stringify({
          type: "patch",
          patches,
        });

        connections.forEach((conn) => {
          // 如果连接已关闭，跳过
          if (conn.closed) {
            connections.delete(conn);
            return;
          }

          try {
            // 将数据添加到队列
            conn.queue.push(patchData);
            // 触发生成器继续执行
            if (conn.resolve) {
              conn.resolve();
              conn.resolve = null;
            }
          } catch (error) {
            // 连接异常，标记为关闭并移除
            conn.closed = true;
            connections.delete(conn);
          }
        });

        previousContext = context;
      }
    };
  };
}

