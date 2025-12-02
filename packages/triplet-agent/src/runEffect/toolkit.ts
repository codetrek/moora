// ============================================================================
// Toolkit 节点的 makeRunEffectForToolkit 函数
// ============================================================================

import type { Dispatch, EffectController } from "@moora/moorex";
import type {
  EffectOfToolkit,
  MakeRunEffectForToolkitOptions,
  StateForToolkit,
} from "../types/effects";
import type { OutputFromToolkit } from "../types/signal";

/**
 * Toolkit 节点的 makeRunEffectForToolkit 函数
 * 
 * 柯里化函数，接收 options，返回符合 MoorexDefinition 要求的 runEffect 函数。
 * 
 * @param options - 包含所有需要注入的依赖
 * @returns 符合 MoorexDefinition 要求的 runEffect 函数
 */
export function makeRunEffectForToolkit(
  options: MakeRunEffectForToolkitOptions
): (
  effect: EffectOfToolkit,
  state: StateForToolkit,
  key: string
) => EffectController<OutputFromToolkit> {
  return (
    effect: EffectOfToolkit,
    state: StateForToolkit,
    key: string
  ): EffectController<OutputFromToolkit> => {
    return {
      start: async (dispatch: Dispatch<OutputFromToolkit>) => {
        // 从 state 中查找对应的工具调用
        const toolCall = state.agentToolkit.pendingToolCalls.find(
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
          const toolNames = await options.getToolNames();
          const tools = await options.getToolDefinitions(toolNames);

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
  };
}

