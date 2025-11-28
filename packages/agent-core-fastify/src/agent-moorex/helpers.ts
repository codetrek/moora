// ============================================================================
// Agent Moorex 辅助函数
// ============================================================================

import type { Dispatch, EffectController } from "@moora/moorex";
import type { AgentInput } from "@moora/agent-core-state-machine";
import type { CallLLMEffect, CallToolEffect, Tool } from "../types";

/**
 * 创建 LLM 调用的 Effect 控制器
 * @internal
 */
export const createLLMEffectController = (
  effect: CallLLMEffect,
  callLLM: (options: {
    prompt: string;
    systemPrompt?: string;
    messageHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  }) => Promise<string>
): EffectController<AgentInput> => {
  let canceled = false;

  return {
    start: async (dispatch: Dispatch<AgentInput>) => {
      if (canceled) {
        return;
      }

      // 生成消息 ID
      const messageId = `msg-${effect.callId}`;

      // 发送 LLM 消息开始事件
      dispatch({
        type: "llm-message-started",
        messageId,
      });

      if (canceled) {
        return;
      }

      try {
        // 调用 LLM
        const response = await callLLM({
          prompt: effect.prompt,
          systemPrompt: effect.systemPrompt,
          messageHistory: effect.messageHistory,
        });

        if (canceled) {
          return;
        }

        // 发送 LLM 消息完成事件，带上完整的 content
        dispatch({
          type: "llm-message-completed",
          messageId,
          content: response,
        });
      } catch (error) {
        if (canceled) {
          return;
        }

        // 对于错误情况，发送包含错误信息的完成事件
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        dispatch({
          type: "llm-message-completed",
          messageId,
          content: `Error: ${errorMessage}`,
        });
      }
    },
    cancel: () => {
      canceled = true;
    },
  };
};

/**
 * 创建 Tool 调用的 Effect 控制器
 * @internal
 */
export const createToolEffectController = (
  effect: CallToolEffect,
  tool: Tool | undefined
): EffectController<AgentInput> => {
  let canceled = false;

  if (!tool) {
    // Tool 不存在，立即分发错误结果
    return {
      start: async (dispatch: Dispatch<AgentInput>) => {
        dispatch({
          type: "tool-call-started",
          toolCallId: effect.callId,
          name: effect.toolName,
          parameters: effect.parameter,
          timestamp: Date.now(),
        });

        dispatch({
          type: "tool-call-completed",
          toolCallId: effect.callId,
          result: {
            isSuccess: false,
            error: `Tool "${effect.toolName}" not found`,
          },
        });
      },
      cancel: () => {
        canceled = true;
      },
    };
  }

  return {
    start: async (dispatch: Dispatch<AgentInput>) => {
      if (canceled) {
        return;
      }

      // 分发 Tool Call 开始事件
      dispatch({
        type: "tool-call-started",
        toolCallId: effect.callId,
        name: effect.toolName,
        parameters: effect.parameter,
        timestamp: Date.now(),
      });

      if (canceled) {
        return;
      }

      try {
        // 执行 Tool
        const args = JSON.parse(effect.parameter);
        const result = await tool.execute(args);

        if (canceled) {
          return;
        }

        // 分发 Tool 结果（成功）
        dispatch({
          type: "tool-call-completed",
          toolCallId: effect.callId,
          result: {
            isSuccess: true,
            content: typeof result === "string" ? result : JSON.stringify(result),
          },
        });
      } catch (error) {
        if (canceled) {
          return;
        }

        // 分发错误结果
        dispatch({
          type: "tool-call-completed",
          toolCallId: effect.callId,
          result: {
            isSuccess: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    },
    cancel: () => {
      canceled = true;
    },
  };
};

