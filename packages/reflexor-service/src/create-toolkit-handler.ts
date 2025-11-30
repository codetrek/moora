// ============================================================================
// 创建 Toolkit Handler
// ============================================================================

import type { EffectController, Dispatch } from "@moora/moorex";
import type {
  ReflexorInput,
  ReflexorState,
} from "@moora/reflexor-state-machine";
import { findToolCallIndex } from "@moora/reflexor-state-machine";
import type { ToolkitHandler, ToolDefinitionExt } from "./types";

/**
 * 创建 Toolkit Handler 的选项
 */
export type CreateToolkitHandlerOptions = {
  tools: Record<string, ToolDefinitionExt>;
};

/**
 * 创建 Toolkit Handler
 *
 * @param options - 配置选项
 * @returns ToolkitHandler 实例
 */
export const createToolkitHandler = (
  options: CreateToolkitHandlerOptions
): ToolkitHandler => {
  const { tools } = options;

  return {
    execute: (
      state: ReflexorState,
      toolCallId: string
    ): EffectController<ReflexorInput> => {
      let isCancelled = false;

      return {
        start: async (dispatch: Dispatch<ReflexorInput>) => {
          if (isCancelled) return;

          // 查找 tool call
          const index = findToolCallIndex(state, toolCallId);
          if (index === -1) {
            console.warn(
              `[toolkit-handler] Tool call not found: ${toolCallId}`
            );
            return;
          }

          const toolCallRecord = state.toolCallRecords[index];
          if (!toolCallRecord) {
            console.warn(
              `[toolkit-handler] Tool call record not found at index: ${index}`
            );
            return;
          }

          const { name, parameters } = toolCallRecord;

          // 查找工具定义
          const tool = tools[name];
          if (!tool) {
            // 工具不存在，返回错误
            dispatch({
              type: "toolkit-error",
              toolCallId,
              error: `Tool not found: ${name}`,
              timestamp: Date.now(),
            });
            return;
          }

          try {
            // 解析参数
            const parsedParams = JSON.parse(parameters) as Record<
              string,
              unknown
            >;

            // 执行工具
            const result = await tool.execute(parsedParams);

            if (isCancelled) return;

            // 发送成功结果
            dispatch({
              type: "toolkit-respond",
              toolCallId,
              result,
              timestamp: Date.now(),
            });
          } catch (error) {
            if (isCancelled) return;

            // 发送错误结果
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            dispatch({
              type: "toolkit-error",
              toolCallId,
              error: errorMessage,
              timestamp: Date.now(),
            });
          }
        },
        cancel: () => {
          isCancelled = true;
        },
      };
    },
  };
};

