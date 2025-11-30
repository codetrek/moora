// ============================================================================
// 创建 Reflexor Fastify Node
// ============================================================================

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createMoorexNode } from "@moora/moorex-fastify";
import type { HandlePost } from "@moora/moorex-fastify";
import type { Moorex, MoorexEvent } from "@moora/moorex";
import { createMoorex } from "@moora/moorex";
import {
  reflexorInputSchema,
  initializeReflexorState,
  createReflexorInitial,
  createReflexorTransition,
  findAssistantMessageIndex,
} from "@moora/reflexor-state-machine";
import type {
  ReflexorInput,
  ReflexorState,
  AssistantMessage,
} from "@moora/reflexor-state-machine";
import type { ReflexorEffect, ReflexorNodeConfig } from "./types";
import { reflexorEffectsAt } from "./effects-at";
import { createRunEffect } from "./run-effect";
import { createBrainHandler } from "./create-brain-handler";
import { createToolkitHandler } from "./create-toolkit-handler";

/**
 * Reflexor Node 类型
 */
export type ReflexorNode = {
  /**
   * 底层的 Moorex 实例
   */
  moorex: Moorex<ReflexorInput, ReflexorEffect, ReflexorState>;

  /**
   * 注册 Fastify 路由（作为 Fastify 插件）
   */
  register(
    fastify: FastifyInstance,
    options?: { prefix?: string }
  ): Promise<void>;
};

/**
 * 创建时间戳生成器
 *
 * 如果在同一毫秒内有多个 Input，自动 +1 避免冲突
 */
const createTimestampGenerator = (): (() => number) => {
  let lastTimestamp = 0;

  return (): number => {
    const now = Date.now();
    if (now <= lastTimestamp) {
      lastTimestamp += 1;
    } else {
      lastTimestamp = now;
    }
    return lastTimestamp;
  };
};

/**
 * 创建 Reflexor Node 实例
 *
 * @param config - 配置选项
 * @returns ReflexorNode 实例
 *
 * @example
 * ```typescript
 * const reflexorNode = createReflexorNode({
 *   prompt: "You are a helpful assistant.",
 *   tools: {
 *     search: {
 *       name: "search",
 *       description: "Search the web",
 *       parameters: { query: { type: "string", description: "Search query" } },
 *       required: ["query"],
 *       execute: async (params) => "Search results...",
 *     },
 *   },
 *   llm: myLlmFunction,
 * });
 *
 * // 注册到 Fastify 应用
 * await fastify.register(reflexorNode.register, { prefix: '/api/reflexor' });
 * ```
 */
export const createReflexorNode = (config: ReflexorNodeConfig): ReflexorNode => {
  const { prompt, tools, llm, initialState } = config;
  const generateTimestamp = createTimestampGenerator();

  // 创建 handlers
  const brain = createBrainHandler({ prompt, tools, llm });
  const toolkit = createToolkitHandler({ tools });

  // 创建 moorex 实例
  const state = initialState ?? initializeReflexorState();
  const initial = createReflexorInitial(state);
  const transition = createReflexorTransition();
  const runEffect = createRunEffect({ brain, toolkit });

  const moorex = createMoorex({
    initial,
    transition,
    effectsAt: reflexorEffectsAt,
    runEffect,
  });

  // 创建 moorex node（用于 moorex/ 路由）
  const handlePost: HandlePost<ReflexorInput> = async (input, dispatch) => {
    try {
      const parsed = JSON.parse(input) as unknown;

      // 验证输入格式
      const result = reflexorInputSchema.safeParse(parsed);
      if (!result.success) {
        return {
          code: 400,
          content: JSON.stringify({
            error: "Invalid input",
            details: result.error.issues,
          }),
        };
      }

      // 覆盖时间戳，使用服务端时间戳
      const serverTimestamp = generateTimestamp();
      const inputWithServerTimestamp: ReflexorInput = {
        ...result.data,
        timestamp: serverTimestamp,
      };

      // 分发输入
      dispatch([inputWithServerTimestamp]);

      return {
        code: 200,
        content: JSON.stringify({
          success: true,
          timestamp: serverTimestamp,
        }),
      };
    } catch (error) {
      return {
        code: 400,
        content: JSON.stringify({
          error: "Invalid JSON",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
      };
    }
  };

  const moorexNode = createMoorexNode({
    moorex,
    handlePost,
  });

  // 消息 streaming 订阅管理
  type MessageSubscription = {
    messageId: string;
    reply: FastifyReply;
    unsubscribe: () => void;
  };
  const messageSubscriptions = new Map<string, MessageSubscription[]>();

  // 注册路由
  const register = async (
    fastify: FastifyInstance,
    pluginOptions: { prefix?: string } = {}
  ): Promise<void> => {
    // 注册 moorex 子路由
    await fastify.register(moorexNode.register, { prefix: "/moorex" });

    // 注册 messages/:messageId 路由
    fastify.get<{ Params: { messageId: string } }>(
      "/messages/:messageId",
      async (request, reply) => {
        const { messageId } = request.params;
        const currentState = moorex.current();

        // 查找消息
        const messageIndex = findAssistantMessageIndex(currentState, messageId);

        if (messageIndex === -1) {
          // 消息不存在
          reply.code(404).send(
            JSON.stringify({
              error: "Message not found",
              messageId,
            })
          );
          return;
        }

        const message = currentState.assistantMessages[messageIndex];
        if (!message) {
          reply.code(404).send(
            JSON.stringify({
              error: "Message not found",
              messageId,
            })
          );
          return;
        }

        // 判断是否正在 streaming（content 为空字符串表示正在 streaming）
        const isStreaming = message.content === "";

        if (!isStreaming) {
          // 直接返回完整内容
          reply.code(200).send(
            JSON.stringify({
              messageId,
              content: message.content,
              isComplete: true,
            })
          );
          return;
        }

        // 设置 SSE 响应头
        reply.raw.setHeader("Content-Type", "text/event-stream");
        reply.raw.setHeader("Cache-Control", "no-cache");
        reply.raw.setHeader("Connection", "keep-alive");
        reply.raw.setHeader("X-Accel-Buffering", "no");

        let isConnected = true;
        let lastContent = "";

        // 订阅状态变化
        const unsubscribe = moorex.subscribe((event) => {
          if (!isConnected) return;

          if (event.type === "state-updated") {
            const newState = event.state;
            const newIndex = findAssistantMessageIndex(newState, messageId);
            if (newIndex === -1) return;

            const newMessage = newState.assistantMessages[newIndex];
            if (!newMessage) return;

            // 发送内容更新
            if (newMessage.content !== lastContent) {
              const delta = newMessage.content.slice(lastContent.length);
              if (delta !== "") {
                try {
                  reply.raw.write(
                    `data: ${JSON.stringify({ delta, content: newMessage.content })}\n\n`
                  );
                  lastContent = newMessage.content;
                } catch (error) {
                  isConnected = false;
                  unsubscribe();
                }
              }

              // 如果内容不再为空（streaming 完成）
              if (newMessage.content !== "") {
                try {
                  reply.raw.write(
                    `data: ${JSON.stringify({ isComplete: true, content: newMessage.content })}\n\n`
                  );
                  reply.raw.end();
                } catch (error) {
                  // ignore
                }
                isConnected = false;
                unsubscribe();
              }
            }
          }
        });

        // 监听客户端断开连接
        const cleanup = () => {
          if (isConnected) {
            isConnected = false;
            unsubscribe();
            if (!reply.raw.destroyed && !reply.raw.closed) {
              reply.raw.end();
            }
          }
        };

        request.raw.on("close", cleanup);
        request.raw.on("error", cleanup);
      }
    );
  };

  return {
    moorex,
    register,
  };
};
