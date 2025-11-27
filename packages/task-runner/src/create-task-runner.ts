import { type Immutable } from 'mutative';
import { type MoorexDefinition, type Dispatch } from '@moora/moorex';
import type {
  TaskRunnerState,
  TaskRunnerSignal,
  TaskRunnerEffect,
  TaskRunnerOptions,
} from './types';

/**
 * 创建 TaskRunner 定义
 *
 * TaskRunner 是一个 moorex 自动机，代表 AI Agent 为达成特定任务目标而进行的一系列心理活动。
 *
 * @param options - TaskRunner 配置选项
 * @returns Moorex 定义
 *
 * @example
 * ```typescript
 * const definition = createTaskRunner({
 *   callLLM: async (prompt) => {
 *     // 调用 LLM API
 *     return await llmAPI.generate(prompt);
 *   },
 *   tools: [
 *     {
 *       name: 'search',
 *       description: 'Search the web',
 *       execute: async (input) => {
 *         // 执行搜索
 *         return results;
 *       },
 *     },
 *   ],
 * });
 *
 * const taskRunner = createMoorex(definition);
 * ```
 */
export const createTaskRunner = (
  options: TaskRunnerOptions,
): MoorexDefinition<TaskRunnerSignal, TaskRunnerEffect, TaskRunnerState> => {
  const { callLLM, tools = [], initialMemory } = options;

  return {
    /**
     * 初始化状态
     *
     * 创建初始的 TaskRunner 状态，包含：
     * - 上游 channel (id: 0)
     * - 空的 ReAct 循环
     * - 初始记忆
     */
    initial: (): TaskRunnerState => {
      return {
        channels: {
          0: {
            id: 0,
            connected: false,
            pendingMessages: [],
            waitingForReply: false,
          },
        },
        reactLoops: {},
        memory: {
          longTerm: {},
          shortTerm: [],
          ...initialMemory,
        },
        nextChannelId: 1,
      };
    },

    /**
     * 状态转换函数
     * 
     * 处理各种信号，更新状态。
     * 
     * TODO: 实现具体的状态转换逻辑
     */
    transition: (
      signal: TaskRunnerSignal,
    ): ((state: TaskRunnerState) => TaskRunnerState) => {
      return (state) => {
        // TODO: 实现状态转换逻辑
        // 当前只返回原状态作为占位符
        return state;
      };
    },

    /**
     * Effect 选择器
     * 
     * 根据当前状态决定需要运行的 effects。
     * 
     * TODO: 实现具体的 effect 选择逻辑
     */
    effectsAt: (
      state: TaskRunnerState,
    ): Record<string, TaskRunnerEffect> => {
      // TODO: 实现 effect 选择逻辑
      // 当前只返回空对象作为占位符
      return {};
    },

    /**
     * 运行 Effect
     *
     * 根据 effect 的类型执行相应的操作：
     * - send-message: 发送消息到 channel
     * - react-loop: 启动 ReAct 循环
     * - call-tool: 调用工具
     * - call-llm: 调用 LLM
     */
    runEffect: (
      effect: TaskRunnerEffect,
      state: TaskRunnerState,
      key: string,
    ) => {
      if (effect.kind === 'send-message') {
        return {
          start: async (dispatch: Dispatch<TaskRunnerSignal>) => {
            // 发送消息到 channel
            // 这里应该实际发送消息，但当前只是占位实现
            // TODO: 实现实际的消息发送逻辑
          },
          cancel: () => {
            // 取消消息发送
          },
        };
      }

      if (effect.kind === 'react-loop') {
        return {
          start: async (dispatch: Dispatch<TaskRunnerSignal>) => {
            // 启动 ReAct 循环
            // TODO: 实现 ReAct 循环逻辑
          },
          cancel: () => {
            // 取消 ReAct 循环
          },
        };
      }

      if (effect.kind === 'call-tool') {
        return {
          start: async (dispatch: Dispatch<TaskRunnerSignal>) => {
            // 查找工具
            const tool = tools.find((t) => t.name === effect.toolName);
            if (!tool) {
              throw new Error(`Tool ${effect.toolName} not found`);
            }

            // 执行工具
            const result = await tool.execute(effect.input);

            // 发送工具结果信号
            // TODO: 需要从 state 中获取正确的 channelId 和 messageIndex
            // 当前只是占位实现
            dispatch({
              type: 'tool-result',
              channelId: '0', // 占位符
              messageIndex: 0, // 占位符
              toolCallIndex: 0, // 占位符
              result: String(result),
            });
          },
          cancel: () => {
            // 取消工具调用（如果可能）
          },
        };
      }

      if (effect.kind === 'call-llm') {
        return {
          start: async (dispatch: Dispatch<TaskRunnerSignal>) => {
            // 调用 LLM
            const response = await callLLM(effect.prompt);

            // 发送 LLM 响应信号
            // TODO: 需要从 state 中获取正确的 channelId 和 messageIndex
            // 当前只是占位实现
            dispatch({
              type: 'llm-response',
              channelId: '0', // 占位符
              messageIndex: 0, // 占位符
              content: response,
            });
          },
          cancel: () => {
            // 取消 LLM 调用（如果可能）
          },
        };
      }

      // TypeScript exhaustiveness check
      const _exhaustive: never = effect;
      throw new Error(`Unknown effect kind: ${(_exhaustive as TaskRunnerEffect).kind}`);
    },
  };
};


