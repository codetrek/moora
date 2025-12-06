/**
 * GET /agent SSE handler
 *
 * 处理 Agent 状态的 SSE 连接，发送全量数据和增量 patch
 */

import { sse } from "elysia";
import { createAgent } from "@moora/agent";
import type { ContextOfUser } from "@moora/agent";
import type { Subscribe } from "@moora/automata";

/**
 * SSE 连接状态
 */
type SSEConnectionState = {
  queue: string[];
  resolve: (() => void) | null;
  closed: boolean;
};

/**
 * 创建 GET /agent SSE handler
 *
 * @param agent - Agent 实例
 * @param subscribePatch - 订阅 patch 的回调函数
 * @returns SSE 生成器函数
 */
export function createAgentSSEHandler(
  agent: ReturnType<typeof createAgent>,
  subscribePatch: Subscribe<string>
) {
  return function* () {
    console.log("[createAgentSSEHandler] New SSE connection established");

    const state: SSEConnectionState = {
      queue: [],
      resolve: null,
      closed: false,
    };

    // 订阅 patch
    const unsubscribe = subscribePatch((patch) => {
      if (state.closed) return;

      state.queue.push(patch);
      if (state.resolve) {
        state.resolve();
        state.resolve = null;
      }
    });

    try {
      // 发送初始全量数据
      const agentState = agent.current();
      const context: ContextOfUser = {
        userMessages: agentState.userMessages,
        assiMessages: agentState.assiMessages,
      };
      const fullData = JSON.stringify({
        type: "full",
        data: context,
      });
      yield sse(fullData);

      // 保持连接打开，等待后续更新
      while (!state.closed) {
        yield new Promise<void>((resolve) => {
          state.resolve = resolve;
          if (state.queue.length > 0) {
            resolve();
          }
        });

        while (state.queue.length > 0 && !state.closed) {
          const data = state.queue.shift();
          if (data) {
            yield sse(data);
          }
        }
      }
    } catch (error) {
      console.log("[createAgentSSEHandler] Connection error:", error);
      state.closed = true;
      throw error;
    } finally {
      console.log("[createAgentSSEHandler] Connection closing");
      state.closed = true;
      unsubscribe();
    }
  };
}
