/**
 * LLM Output 函数实现
 *
 * 调用 OpenAI API，将结果转化为 InputFromLlm
 */

import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import type { ContextOfLlm, InputFromLlm, AgentInput, Output } from "@moora/agent";
import type { Dispatch } from "@moora/automata";

/**
 * 创建 LLM Output 函数的选项
 */
export type CreateLlmOutputOptions = {
  /**
   * OpenAI 客户端配置
   */
  openai: {
    /**
     * API endpoint URL
     */
    endpoint: {
      url: string;
      key: string;
    };
    /**
     * 模型名称
     */
    model: string;
  };

  /**
   * System prompt
   */
  prompt: string;
};

/**
 * 创建 LLM Output 函数
 *
 * 当 ContextOfLlm 发生变化时，调用 OpenAI API 生成回复
 *
 * @param options - 创建选项
 * @returns LLM Output 函数
 */
export function createLlmOutput(
  options: CreateLlmOutputOptions
): (context: ContextOfLlm) => Output<AgentInput> {
  const { openai: openaiConfig, prompt } = options;

  // 创建 OpenAI 客户端
  const openai = new OpenAI({
    apiKey: openaiConfig.endpoint.key,
    baseURL: openaiConfig.endpoint.url,
  });

  return (context: ContextOfLlm) => {
    return () => async (dispatch: Dispatch<AgentInput>) => {
      // 检查是否有新的用户消息需要回复
      const { userMessages, assiMessages } = context;

      // 如果用户消息数量大于助手消息数量，说明有新消息需要回复
      if (userMessages.length > assiMessages.length) {
        try {
          // 构建消息列表
          const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
            { role: "system", content: prompt },
          ];

          // 添加历史消息（交替添加用户和助手消息）
          const maxLength = Math.max(userMessages.length, assiMessages.length);
          for (let i = 0; i < maxLength; i++) {
            if (i < userMessages.length) {
              messages.push({
                role: "user",
                content: userMessages[i]?.content ?? "",
              });
            }
            if (i < assiMessages.length) {
              messages.push({
                role: "assistant",
                content: assiMessages[i]?.content ?? "",
              });
            }
          }

          // 调用 OpenAI API
          const completion = await openai.chat.completions.create({
            model: openaiConfig.model,
            messages,
          });

          const content = completion.choices[0]?.message?.content;

          if (content) {
            // 将结果转化为 InputFromLlm
            const input: InputFromLlm = {
              type: "send-assi-message",
              id: uuidv4(),
              content,
              timestamp: Date.now(),
            };

            // Dispatch 到 agent
            dispatch(input);
          }
        } catch (error) {
          // 错误处理：可以记录日志或发送错误消息
          console.error("OpenAI API error:", error);
        }
      }
    };
  };
}

