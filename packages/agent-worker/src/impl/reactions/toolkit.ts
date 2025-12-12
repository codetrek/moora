/**
 * Toolkit Actor Reaction 工厂函数
 */

import { stateful } from "@moora/effects";

import type { TOOLKIT } from "@/decl/actors";
import type { Actuation } from "@/decl/agent";
import type { ReactionFnOf } from "@/decl/helpers";
import type { PerspectiveOfToolkit } from "@/decl/perspectives";
import type { ToolkitReactionOptions } from "@/decl/reactions";
import type { Dispatch } from "@moora/automata";

// ============================================================================
// 类型定义
// ============================================================================

type ToolkitReactionFn = ReactionFnOf<typeof TOOLKIT>;

/**
 * Toolkit Reaction 的内部状态
 * 用于跟踪正在执行的 tool calls
 */
type ToolkitReactionInternalState = {
  /**
   * 正在执行的 tool call IDs
   */
  executingToolCalls: string[];
};

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建 Toolkit Actor 的 Reaction 函数
 *
 * Toolkit Actor 的 reaction 负责：
 * 1. 监听 toolCallRequests 中未处理的请求
 * 2. 调用 callTool 执行工具
 * 3. dispatch receive-tool-result Action
 *
 * @param options - Toolkit reaction 配置选项
 * @returns Toolkit Actor 的 reaction 函数
 *
 * @example
 * ```typescript
 * const toolkitReaction = createToolkitReaction({
 *   callTool: async (request) => {
 *     // 执行工具调用
 *     const result = await toolkit.invoke(request.name, request.arguments);
 *     return result;
 *   },
 * });
 * ```
 */
export const createToolkitReaction = (options: ToolkitReactionOptions): ToolkitReactionFn => {
  const { callTool } = options;

  return stateful<{ perspective: PerspectiveOfToolkit; dispatch: Dispatch<Actuation> }, ToolkitReactionInternalState>(
    { executingToolCalls: [] },
    ({ context: ctx, state, setState }) => {
      const { perspective, dispatch } = ctx;
      const { toolCallRequests, toolResults } = perspective;

      // 找出已经有结果的 tool call IDs
      const completedToolCallIds = new Set(toolResults.map((r) => r.toolCallId));

      // 找出需要执行的 tool calls（没有结果且不在执行中）
      const pendingToolCalls = toolCallRequests.filter(
        (req) =>
          !completedToolCallIds.has(req.toolCallId) &&
          !state.executingToolCalls.includes(req.toolCallId)
      );

      if (pendingToolCalls.length === 0) {
        return;
      }

      // 将所有 pending tool calls 标记为执行中
      setState((prev) => ({
        executingToolCalls: [
          ...prev.executingToolCalls,
          ...pendingToolCalls.map((t) => t.toolCallId),
        ],
      }));

      // 异步执行每个 tool call
      for (const toolCall of pendingToolCalls) {
        const { toolCallId } = toolCall;

        queueMicrotask(async () => {
          let result: string;

          try {
            result = await callTool(toolCall);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result = JSON.stringify({ error: errorMessage });
          }

          // Dispatch tool result
          dispatch({
            type: "receive-tool-result",
            toolCallId,
            result,
            timestamp: Date.now(),
          });

          // 从执行中移除
          setState((prev) => ({
            executingToolCalls: prev.executingToolCalls.filter((id) => id !== toolCallId),
          }));
        });
      }
    }
  );
};
