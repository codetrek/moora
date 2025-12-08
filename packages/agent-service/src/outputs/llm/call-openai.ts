/**
 * OpenAI API 调用适配器
 *
 * 将 @moora/agent 的 CallLlm 接口适配到 OpenAI API
 */

import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import type { CallLlmContext, CallLlmCallbacks, CallLlmMessage } from "@moora/agent";
import type { Toolkit, ToolInfo } from "@moora/toolkit";
import type { CreateServiceOptions, StreamManager } from "@/types";
import { getLogger } from "@/logger";

const logger = getLogger().llm;

// ============================================================================
// 类型定义
// ============================================================================

export type CallOpenAIOptions = {
  openai: CreateServiceOptions["openai"];
  prompt: string;
  toolkit?: Toolkit;
  streamManager: StreamManager;
  context: CallLlmContext;
  callbacks: CallLlmCallbacks;
};

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 将 ToolInfo 转换为 OpenAI Tool 格式
 */
function convertToolInfoToOpenAITool(toolInfo: ToolInfo): ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: toolInfo.name,
      description: toolInfo.description,
      parameters: toolInfo.parameterSchema,
    },
  };
}

/**
 * 将 Toolkit 转换为 OpenAI Tools 参数
 */
function convertToolkitToOpenAITools(
  toolkit: Toolkit | undefined
): ChatCompletionTool[] | undefined {
  if (!toolkit) return undefined;

  const toolInfos = toolkit.getAllToolInfos();
  if (toolInfos.length === 0) return undefined;

  return toolInfos.map(convertToolInfoToOpenAITool);
}

/**
 * 生成格式化指导
 */
function generateFormattingPrompt(): string {
  return `

## Output Formatting Guidelines

When generating responses, please follow these formatting rules carefully:

1. **Proper line breaks**: Always add blank lines before and after:
   - Headings (##, ###, etc.)
   - Code blocks (\`\`\`)
   - Lists (both ordered and unordered)
   - Block quotes (>)
   - Tables

2. **Code blocks**: Use proper fenced code blocks with language identifiers:
   \`\`\`language
   code here
   \`\`\`

3. **Lists**: Ensure each list item is on its own line with proper indentation for nested lists.

4. **Paragraphs**: Separate paragraphs with blank lines. Do not concatenate multiple paragraphs into a single line.

5. **Inline formatting**: Use \`inline code\`, **bold**, and *italic* appropriately, but ensure surrounding text has proper spacing.`;
}

/**
 * 根据 Toolkit 生成工具使用说明
 */
function generateToolsPrompt(toolkit: Toolkit | undefined): string {
  const formattingPrompt = generateFormattingPrompt();

  if (!toolkit) return formattingPrompt;

  const toolInfos = toolkit.getAllToolInfos();
  if (toolInfos.length === 0) return formattingPrompt;

  const toolsList = toolInfos
    .map((tool) => `- **${tool.name}**: ${tool.description}`)
    .join("\n");

  return `${formattingPrompt}

## Available Tools

You have access to the following tools. Use them when appropriate to help answer user questions:

${toolsList}

When you need to search for information on the web or extract content from URLs, use the appropriate tool.`;
}

/**
 * 将 CallLlmContext 转换为 OpenAI 消息格式
 */
function convertContextToOpenAIMessages(
  prompt: string,
  context: CallLlmContext,
  toolkit: Toolkit | undefined
): ChatCompletionMessageParam[] {
  const { messages, toolCalls } = context;

  // 生成包含工具说明的完整系统提示词
  const toolsPrompt = generateToolsPrompt(toolkit);
  const fullPrompt = prompt + toolsPrompt;

  // 转换消息（按时间戳排序）
  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  const openAIMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: fullPrompt },
  ];

  // 跟踪已处理的 toolCalls 以便在正确位置插入
  const toolCallsByTime = new Map<number, typeof toolCalls>();
  for (const tc of toolCalls) {
    const existing = toolCallsByTime.get(tc.requestedAt);
    if (existing) {
      existing.push(tc);
    } else {
      toolCallsByTime.set(tc.requestedAt, [tc]);
    }
  }

  // 处理消息和 tool calls
  let lastProcessedToolCallTime = 0;

  for (const msg of sortedMessages) {
    // 在消息之前插入所有时间戳更早的 tool calls
    for (const [timestamp, tcs] of toolCallsByTime.entries()) {
      if (timestamp > lastProcessedToolCallTime && timestamp < msg.timestamp) {
        // 插入 assistant message with tool_calls
        openAIMessages.push({
          role: "assistant",
          content: null,
          tool_calls: tcs.map((tc) => ({
            id: tc.name + "-" + tc.requestedAt, // 使用名称和时间戳生成唯一 ID
            type: "function" as const,
            function: {
              name: tc.name,
              arguments: tc.parameter,
            },
          })),
        });

        // 插入对应的 tool messages
        for (const tc of tcs) {
          openAIMessages.push({
            role: "tool",
            tool_call_id: tc.name + "-" + tc.requestedAt,
            content: tc.result,
          });
        }

        lastProcessedToolCallTime = timestamp;
      }
    }

    // 插入消息
    if (msg.role === "user") {
      openAIMessages.push({
        role: "user",
        content: msg.content,
      });
    } else if (msg.role === "assistant" && "streaming" in msg && !msg.streaming) {
      openAIMessages.push({
        role: "assistant",
        content: msg.content,
      });
    }
  }

  // 处理剩余的 tool calls（在所有消息之后）
  for (const [timestamp, tcs] of toolCallsByTime.entries()) {
    if (timestamp > lastProcessedToolCallTime) {
      openAIMessages.push({
        role: "assistant",
        content: null,
        tool_calls: tcs.map((tc) => ({
          id: tc.name + "-" + tc.requestedAt,
          type: "function" as const,
          function: {
            name: tc.name,
            arguments: tc.parameter,
          },
        })),
      });

      for (const tc of tcs) {
        openAIMessages.push({
          role: "tool",
          tool_call_id: tc.name + "-" + tc.requestedAt,
          content: tc.result,
        });
      }
    }
  }

  return openAIMessages;
}

// ============================================================================
// 主函数
// ============================================================================

/**
 * 调用 OpenAI API
 *
 * 将 CallLlmContext 和 CallLlmCallbacks 适配到 OpenAI Streaming API
 */
export async function callOpenAI(options: CallOpenAIOptions): Promise<void> {
  const { openai: openaiConfig, prompt, toolkit, streamManager, context, callbacks } = options;
  const { onStart, onChunk, onComplete, onToolCall } = callbacks;

  // 创建 OpenAI 客户端
  const openai = new OpenAI({
    apiKey: openaiConfig.endpoint.key,
    baseURL: openaiConfig.endpoint.url,
  });

  // 转换消息
  const messages = convertContextToOpenAIMessages(prompt, context, toolkit);

  // 转换工具
  const tools = convertToolkitToOpenAITools(toolkit);

  logger.debug("OpenAI API call", {
    messagesCount: messages.length,
    toolsCount: tools?.length ?? 0,
  });

  // messageId 由 onStart 返回，在收到第一个 chunk 时获取
  let messageId: string | null = null;

  try {
    // 调用 OpenAI Streaming API
    const stream = await openai.chat.completions.create({
      model: openaiConfig.model,
      messages,
      tools,
      stream: true,
    });

    let fullContent = "";

    // 累积 tool_calls
    const toolCallsAccumulator: Map<
      number,
      { id: string; name: string; arguments: string }
    > = new Map();

    // 标记是否已调用 onStart
    let hasCalledOnStart = false;

    // 处理流式响应
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      const toolCalls = chunk.choices[0]?.delta?.tool_calls;

      // 处理 tool_calls（累积）
      if (toolCalls && toolCalls.length > 0) {
        for (const tc of toolCalls) {
          const existing = toolCallsAccumulator.get(tc.index);
          if (existing) {
            if (tc.function?.arguments) {
              existing.arguments += tc.function.arguments;
            }
          } else {
            toolCallsAccumulator.set(tc.index, {
              id: tc.id || "",
              name: tc.function?.name || "",
              arguments: tc.function?.arguments || "",
            });
          }
        }
      }

      if (content) {
        // 收到第一个 content chunk 时调用 onStart，获取 messageId 并启动 stream
        if (!hasCalledOnStart) {
          hasCalledOnStart = true;
          messageId = onStart();
          streamManager.startStream(messageId);
        }
        fullContent += content;
        streamManager.appendChunk(messageId!, content);
        onChunk(content);
      }
    }

    // 处理累积的 tool_calls
    const toolCallResults = Array.from(toolCallsAccumulator.values()).filter(
      (tc) => tc.id && tc.name
    );

    if (toolCallResults.length > 0) {
      logger.debug("Tool calls received", {
        count: toolCallResults.length,
        names: toolCallResults.map((tc) => tc.name),
      });

      for (const tc of toolCallResults) {
        onToolCall({ name: tc.name, arguments: tc.arguments });
      }
    }

    // 完成
    if (messageId) {
      streamManager.endStream(messageId, fullContent);
    }
    onComplete(fullContent);

    logger.debug("OpenAI call completed", {
      contentLength: fullContent.length,
      toolCallsCount: toolCallResults.length,
    });
  } catch (error) {
    logger.error("OpenAI API error", {
      error: error instanceof Error ? error.message : String(error),
    });
    if (messageId) {
      streamManager.endStream(messageId, "");
    }
    onComplete("");
    throw error;
  }
}
