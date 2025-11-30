// ============================================================================
// 创建 Brain Handler
// ============================================================================

import type { EffectController, Dispatch } from "@moora/moorex";
import type {
  ReflexorInput,
  ReflexorState,
  ToolCallRecord,
  ToolCallRequest,
} from "@moora/reflexor-state-machine";
import {
  getMessagesAfterCut,
  getToolCallsWithDetails,
} from "@moora/reflexor-state-machine";
import type {
  BrainHandler,
  LlmFunction,
  LlmMessage,
  ToolDefinition,
  ToolDefinitionExt,
} from "./types";

/**
 * 创建 Brain Handler 的选项
 */
export type CreateBrainHandlerOptions = {
  prompt: string;
  tools: Record<string, ToolDefinitionExt>;
  llm: LlmFunction;
};

/**
 * 生成唯一 ID
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

/**
 * 从 state 构建 LLM 消息数组
 */
const buildLlmMessages = (state: ReflexorState): LlmMessage[] => {
  const messages: LlmMessage[] = [];
  const afterCutMessages = getMessagesAfterCut(state);
  const toolCallsWithDetails = getToolCallsWithDetails(state);

  // 创建 tool call 到 result 的映射
  const toolCallMap = new Map<string, ToolCallRecord>();
  for (const tc of toolCallsWithDetails) {
    toolCallMap.set(tc.id, tc);
  }

  // 合并所有事件按时间排序
  type TimeEvent =
    | { kind: "user"; time: number; content: string }
    | { kind: "assistant"; time: number; content: string }
    | { kind: "tool-call"; time: number; toolCalls: ToolCallRecord[] }
    | { kind: "tool-result"; time: number; toolCallId: string; content: string };

  const events: TimeEvent[] = [];

  // 添加用户消息
  for (const msg of afterCutMessages) {
    if (msg.kind === "user") {
      events.push({ kind: "user", time: msg.receivedAt, content: msg.content });
    } else if (msg.kind === "assistant" && msg.content !== "") {
      events.push({
        kind: "assistant",
        time: msg.receivedAt,
        content: msg.content,
      });
    }
  }

  // 添加 tool calls 和 tool results
  for (const tc of toolCallsWithDetails) {
    events.push({ kind: "tool-call", time: tc.calledAt, toolCalls: [tc] });
    if (tc.result !== null) {
      const resultContent = tc.result.isSuccess
        ? tc.result.content
        : `Error: ${tc.result.error}`;
      events.push({
        kind: "tool-result",
        time: tc.result.receivedAt,
        toolCallId: tc.id,
        content: resultContent,
      });
    }
  }

  // 按时间排序
  events.sort((a, b) => a.time - b.time);

  // 转换为 LLM 消息
  for (const event of events) {
    switch (event.kind) {
      case "user":
        messages.push({ role: "user", content: event.content });
        break;
      case "assistant":
        messages.push({ role: "assistant", content: event.content });
        break;
      case "tool-call":
        messages.push({
          role: "assistant",
          toolCalls: event.toolCalls.map((tc) => ({
            id: tc.id,
            name: tc.name,
            parameters: tc.parameters,
          })),
        });
        break;
      case "tool-result":
        messages.push({
          role: "tool",
          toolCallId: event.toolCallId,
          content: event.content,
        });
        break;
    }
  }

  // 如果有 context summary，添加到开头
  if (state.contextSummary !== "") {
    messages.unshift({
      role: "user",
      content: `[Previous conversation summary]\n${state.contextSummary}`,
    });
  }

  return messages;
};

/**
 * 从 ToolDefinitionExt 中提取 ToolDefinition（不含 execute）
 */
const extractToolDefinitions = (
  tools: Record<string, ToolDefinitionExt>
): Record<string, ToolDefinition> => {
  const result: Record<string, ToolDefinition> = {};
  for (const [name, tool] of Object.entries(tools)) {
    result[name] = {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      required: tool.required,
    };
  }
  return result;
};

/**
 * 创建 Brain Handler
 *
 * @param options - 配置选项
 * @returns BrainHandler 实例
 */
export const createBrainHandler = (
  options: CreateBrainHandlerOptions
): BrainHandler => {
  const { prompt, tools, llm } = options;
  const toolDefinitions = extractToolDefinitions(tools);

  return {
    ask: (
      state: ReflexorState,
      signalsCutAt: number
    ): EffectController<ReflexorInput> => {
      let isCancelled = false;
      let messageId = "";

      return {
        start: async (dispatch: Dispatch<ReflexorInput>) => {
          if (isCancelled) return;

          const messages = buildLlmMessages(state);
          messageId = generateId();
          const calledBrainAt = signalsCutAt;

          // 发送 brain-send-message-start
          dispatch({
            type: "brain-send-message-start",
            messageId,
            timestamp: Date.now(),
            calledBrainAt,
          });

          try {
            // 收集 streaming chunks
            let fullContent = "";
            const onMessageChunk = (chunk: string) => {
              if (isCancelled) return;
              fullContent += chunk;
              // 注意：这里不更新 state，只在完成时一次性更新
            };

            // 调用 LLM
            const response = await llm(
              {
                prompt,
                tools: toolDefinitions,
                messages,
                requiredTool: false,
              },
              onMessageChunk
            );

            if (isCancelled) return;

            // 发送 brain-send-message-complete
            if (response.message !== "" || response.toolCalls.length === 0) {
              dispatch({
                type: "brain-send-message-complete",
                messageId,
                content: response.message,
                timestamp: Date.now(),
                calledBrainAt,
              });
            }

            // 如果有 tool calls，发送 brain-call-tools
            if (response.toolCalls.length > 0) {
              const toolCalls: Record<string, ToolCallRequest> = {};
              const now = Date.now();
              for (const tc of response.toolCalls) {
                toolCalls[tc.id] = {
                  name: tc.name,
                  parameters: tc.parameters,
                  calledAt: now,
                };
              }

              dispatch({
                type: "brain-call-tools",
                toolCalls,
                timestamp: now,
                calledBrainAt,
              });
            }
          } catch (error) {
            if (isCancelled) return;

            // 发送错误消息
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            dispatch({
              type: "brain-send-message-complete",
              messageId,
              content: `[Error] ${errorMessage}`,
              timestamp: Date.now(),
              calledBrainAt,
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

