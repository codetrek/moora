import { type Immutable } from 'mutative';
import { type MoorexDefinition } from '@moora/moorex';
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
): MoorexDefinition<TaskRunnerState, TaskRunnerSignal, TaskRunnerEffect> => {
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
    initiate: (): Immutable<TaskRunnerState> => {
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
      signal: Immutable<TaskRunnerSignal>,
    ): ((state: Immutable<TaskRunnerState>) => Immutable<TaskRunnerState>) => {
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
      state: Immutable<TaskRunnerState>,
    ): Record<string, Immutable<TaskRunnerEffect>> => {
      // TODO: 实现 effect 选择逻辑
      // 当前只返回空对象作为占位符
      return {};
    },
  };
};


