// ============================================================================
// Agent 节点的 runEffect 函数
// ============================================================================

import type { Dispatch, EffectController } from "@moora/moorex";
import type { EffectOfAgent } from "../types/effects";
import type { StateUserAgent, StateToolkitAgent } from "../types/state";
import type { OutputFromAgent } from "../types/signal";
import type {
  CallLLMFn,
  GetToolNamesFn,
  GetToolDefinitionsFn,
} from "../types/effects";
import type { Message } from "../types/signal";

/**
 * Agent 节点的 runEffect 函数
 * 
 * 执行副作用，调用 LLM API，传递完整的 context 和 dispatch 方法。
 * 
 * @param effect - Effect 实例（极简）
 * @param stateUserAgent - Channel USER -> AGENT 的 State
 * @param stateToolkitAgent - Channel TOOLKIT -> AGENT 的 State
 * @param dispatch - Dispatch 函数，用于发送 OutputFromAgent
 * @param callLLM - 注入的 LLM 调用函数
 * @param prompt - 系统提示词
 * @param getToolNames - 注入的获取工具名称列表的函数
 * @param getToolDefinitions - 注入的获取工具定义的函数
 */
export function runEffectForAgent(
  effect: EffectOfAgent,
  stateUserAgent: StateUserAgent,
  stateToolkitAgent: StateToolkitAgent,
  dispatch: Dispatch<OutputFromAgent>,
  callLLM: CallLLMFn,
  prompt: string,
  getToolNames: GetToolNamesFn,
  getToolDefinitions: GetToolDefinitionsFn
): EffectController<OutputFromAgent> {
  return {
    start: async () => {
      // 获取工具名称列表
      const toolNames = await getToolNames();
      // 获取工具定义
      const tools = await getToolDefinitions(toolNames);

      // 构建 messages：包含 user messages 和 tool messages
      const messages: Message[] = [];

      // 添加用户消息
      for (const userMsg of stateUserAgent.userMessages) {
        messages.push({
          id: userMsg.id,
          role: "user",
          content: userMsg.content,
          timestamp: userMsg.timestamp,
        });
      }

      // 将工具执行结果整合为 tool messages（格式：tool message）
      for (const toolResult of stateToolkitAgent.toolResults) {
        if (toolResult.isSuccess) {
          messages.push({
            id: `tool-${toolResult.toolCallId}`,
            role: "assistant", // tool message 使用 assistant role
            content: `Tool ${toolResult.toolName} result: ${toolResult.result}`,
            timestamp: toolResult.timestamp,
          });
        } else {
          messages.push({
            id: `tool-error-${toolResult.toolCallId}`,
            role: "assistant",
            content: `Tool ${toolResult.toolName} error: ${toolResult.error}`,
            timestamp: toolResult.timestamp,
          });
        }
      }

      // 调用 LLM API
      const response = await callLLM(prompt, tools, messages);

      // 根据响应 dispatch 相应的 Output
      if (response.type === "toolCall") {
        dispatch({
          type: "callTool",
          toolCallId: response.toolCallId,
          toolName: response.toolName,
          parameters: response.parameters,
        });
      } else {
        // 流式输出消息
        const messageId = response.messageId;
        for await (const chunk of response.chunks) {
          dispatch({
            type: "sendChunk",
            messageId,
            chunk,
          });
        }
        dispatch({
          type: "completeMessage",
          messageId,
        });
      }
    },
    cancel: () => {
      // 取消 LLM 调用（如果需要）
    },
  };
}

