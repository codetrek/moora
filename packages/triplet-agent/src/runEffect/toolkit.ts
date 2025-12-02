// ============================================================================
// Toolkit 节点的 runEffect 函数
// ============================================================================

import type { Dispatch, EffectController } from "@moora/moorex";
import type { EffectOfToolkit } from "../types/effects";
import type { StateAgentToolkit } from "../types/state";
import type { OutputFromToolkit } from "../types/signal";
import type {
  GetToolNamesFn,
  GetToolDefinitionsFn,
} from "../types/effects";

/**
 * Toolkit 节点的 runEffect 函数
 * 
 * 执行副作用，调用工具执行器，传递工具调用信息和 dispatch 方法。
 * 
 * @param effect - Effect 实例（包含 toolCallId）
 * @param stateAgentToolkit - Channel AGENT -> TOOLKIT 的 State
 * @param dispatch - Dispatch 函数，用于发送 OutputFromToolkit
 * @param getToolNames - 注入的获取工具名称列表的函数
 * @param getToolDefinitions - 注入的获取工具定义的函数
 */
export function runEffectForToolkit(
  effect: EffectOfToolkit,
  stateAgentToolkit: StateAgentToolkit,
  dispatch: Dispatch<OutputFromToolkit>,
  getToolNames: GetToolNamesFn,
  getToolDefinitions: GetToolDefinitionsFn
): EffectController<OutputFromToolkit> {
  return {
    start: async () => {
      // 从 state 中查找对应的工具调用
      const toolCall = stateAgentToolkit.pendingToolCalls.find(
        (tc) => tc.toolCallId === effect.toolCallId
      );

      if (!toolCall) {
        // 工具调用不存在，发送错误
        dispatch({
          type: "toolError",
          toolCallId: effect.toolCallId,
          toolName: "unknown",
          error: "Tool call not found",
        });
        return;
      }

      try {
        // 获取工具定义
        const toolNames = await getToolNames();
        const tools = await getToolDefinitions(toolNames);

        // 查找对应的工具定义
        const toolDef = tools.find((t) => t.name === toolCall.toolName);

        if (!toolDef) {
          dispatch({
            type: "toolError",
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            error: `Tool ${toolCall.toolName} not found`,
          });
          return;
        }

        // 执行工具（使用工具定义的 run 方法）
        const result = await toolDef.run(toolCall.parameters);

        dispatch({
          type: "toolResult",
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          result,
        });
      } catch (error) {
        dispatch({
          type: "toolError",
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    cancel: () => {
      // 取消工具执行（如果需要）
    },
  };
}

