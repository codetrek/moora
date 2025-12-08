/**
 * LLM Actor Reaction 工厂函数
 *
 * 简化实现：如果最后一条消息是 user message，就发送 llm call
 */

import { v4 as uuidv4 } from "uuid";
import type { ReactionFnOf } from "@/decl/helpers";
import type {
  LlmReactionOptions,
  CallLlmContext,
  CallLlmCallbacks,
  CallLlmMessage,
} from "@/decl/reactions";
import type { PerspectiveOfLlm } from "@/decl/perspectives";
import { LLM } from "@/decl/actors";

// ============================================================================
// 类型定义
// ============================================================================

type LlmReactionFn = ReactionFnOf<typeof LLM>;

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 检查最后一条消息是否是 user message
 */
function isLastMessageUser(perspective: PerspectiveOfLlm): boolean {
  const { userMessages, assiMessages } = perspective;
  if (userMessages.length === 0) {
    return false;
  }
  if (assiMessages.length === 0) {
    return true;
  }
  const lastUserMessage = userMessages[userMessages.length - 1];
  const lastAssiMessage = assiMessages[assiMessages.length - 1];
  if (!lastUserMessage || !lastAssiMessage) {
    return false;
  }
  return lastUserMessage.timestamp > lastAssiMessage.timestamp;
}

/**
 * 从 perspective 构建 CallLlmContext
 *
 * starter-agent 不支持 tools，所以 tools 和 toolCalls 总是为空数组
 */
function buildCallLlmContext(perspective: PerspectiveOfLlm): CallLlmContext {
  const { userMessages, assiMessages } = perspective;

  // 合并 user 和 assistant 消息，按时间戳排序
  const messages: CallLlmMessage[] = [
    ...userMessages,
    ...assiMessages,
  ].sort((a, b) => a.timestamp - b.timestamp);

  return {
    messages,
    scenario: "re-act-loop",
    tools: [], // starter-agent 不支持 tools
    toolCalls: [], // starter-agent 不支持 tool calls
  };
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建 LLM Actor 的 Reaction 函数
 *
 * 简化实现：如果最后一条消息是 user message，就发送 llm call。
 *
 * @param options - LLM reaction 配置选项
 * @returns LLM Actor 的 reaction 函数
 *
 * @example
 * ```typescript
 * const llmReaction = createLlmReaction({
 *   callLlm: async (context, callbacks) => {
 *     // 调用 OpenAI API
 *     const stream = await openai.chat.completions.create({...});
 *     for await (const chunk of stream) {
 *       callbacks.onChunk(chunk.choices[0]?.delta?.content ?? "");
 *     }
 *     callbacks.onComplete(fullContent);
 *   },
 * });
 * ```
 */
export const createLlmReaction = (options: LlmReactionOptions): LlmReactionFn => {
  const { callLlm, onStart: onStartOption, onChunk: onChunkOption, onComplete: onCompleteOption } = options;

  return ({ perspective, dispatch }) => {
    // 检查最后一条消息是否是 user message
    if (!isLastMessageUser(perspective)) {
      return;
    }

    // 生成消息 ID
    const messageId = uuidv4();

    // 构建 context（starter-agent 不支持 tools）
    const context = buildCallLlmContext(perspective);

    let hasStarted = false;

    // 构建 callbacks
    const callbacks: CallLlmCallbacks = {
      onStart: () => {
        if (!hasStarted) {
          hasStarted = true;
          // 如果提供了 onStart 回调，调用它
          if (onStartOption) {
            onStartOption(messageId);
          }
        }
        return messageId;
      },
      onChunk: (chunk: string) => {
        // 如果提供了 onChunk 回调，调用它
        if (onChunkOption) {
          onChunkOption(messageId, chunk);
        }
      },
      onComplete: (content: string) => {
        // 只有在 onStart 被调用后才 dispatch message
        if (hasStarted) {
          dispatch({
            type: "send-assi-message",
            id: messageId,
            content,
            timestamp: Date.now(),
          });
          // 如果提供了 onComplete 回调，调用它
          if (onCompleteOption) {
            onCompleteOption(messageId, content);
          }
        }
      },
      onToolCall: () => {
        // starter-agent 不支持 tool calls
      },
    };

    // 使用 queueMicrotask 执行异步 LLM 调用
    queueMicrotask(() => {
      Promise.resolve(callLlm(context, callbacks)).catch((error) => {
        console.error("[createLlmReaction] LLM call failed:", error);
      });
    });
  };
};
