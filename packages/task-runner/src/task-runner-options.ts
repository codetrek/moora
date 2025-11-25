import type { MemoryState } from './task-runner-state';

/**
 * LLM 调用函数类型
 * 
 * 注意：函数类型不适合用 Zod 验证，使用 TypeScript 原生类型
 */
export type LLMCallFn = (prompt: string) => Promise<string>;

/**
 * 工具定义
 * 
 * 工具可以是内置的（如记忆访问）或外部提供的
 * 
 * 注意：execute 函数不适合用 Zod 验证，使用 TypeScript 原生类型
 */
export type Tool = {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 工具参数模式（JSON Schema 格式） */
  parameters?: unknown;
  /** 工具执行函数 */
  execute: (input: unknown) => Promise<unknown> | unknown;
};

/**
 * 创建 TaskRunner 的配置选项
 *
 * 注意：包含函数类型的部分使用 TypeScript 原生类型
 */
export type TaskRunnerOptions = {
  /** LLM 调用函数 */
  callLLM: LLMCallFn;
  /** 工具列表（内置 + 外部提供） */
  tools?: Tool[];
  /** 初始记忆状态（可选） */
  initialMemory?: Partial<MemoryState>;
};

