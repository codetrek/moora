// ============================================================================
// Reflexor Service 导出
// ============================================================================

/**
 * Reflexor Service
 *
 * 提供基于 reflexor-state-machine 的后端服务，包括：
 * - Effect 类型和计算
 * - LLM 和 Tool 类型定义
 * - Moorex 实例创建
 * - Fastify 集成
 */

// ============================================================================
// 导出所有类型
// ============================================================================

// Effect 类型
export type {
  AskBrainEffect,
  RequestToolkitEffect,
  ReflexorEffect,
} from "./types";

export {
  askBrainEffectSchema,
  requestToolkitEffectSchema,
  reflexorEffectSchema,
} from "./types";

// Tool 和 LLM 类型
export type {
  ToolParameter,
  ToolDefinition,
  ToolExecutor,
  ToolDefinitionExt,
  LlmUserMessage,
  LlmAssistantMessage,
  LlmToolCall,
  LlmAssistantToolCallMessage,
  LlmToolMessage,
  LlmMessage,
  LlmRequest,
  LlmToolCallRequest,
  LlmResponse,
  OnMessageChunk,
  LlmFunction,
} from "./types";

// Handler 类型
export type { BrainHandler, ToolkitHandler, ReflexorNodeConfig } from "./types";

// 创建函数的选项类型
export type { CreateRunEffectOptions } from "./run-effect";
export type { CreateReflexorMoorexOptions } from "./create-reflexor-moorex";
export type { CreateBrainHandlerOptions } from "./create-brain-handler";
export type { CreateToolkitHandlerOptions } from "./create-toolkit-handler";
export type { ReflexorNode } from "./create-reflexor-node";

// ============================================================================
// 导出函数
// ============================================================================

export { reflexorEffectsAt } from "./effects-at";
export { createRunEffect } from "./run-effect";
export { createReflexorMoorex } from "./create-reflexor-moorex";
export { createBrainHandler } from "./create-brain-handler";
export { createToolkitHandler } from "./create-toolkit-handler";
export { createReflexorNode } from "./create-reflexor-node";
