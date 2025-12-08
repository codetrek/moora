/**
 * @moora/agent
 *
 * 完整的 Agent 实现，基于 Automata 和迭代式建模方法论
 */

import type { Worldscape, Actuation } from "./decl/agent";

// ============================================================================
// 导出类型
// ============================================================================
export type {
  Worldscape,
  Actuation,
  ReactionFns,
  PartialReactionFns,
  Actors,
  AppearanceOfUser,
  AppearanceOfLlm,
  AppearanceOfToolkit,
  PerspectiveOfUser,
  PerspectiveOfLlm,
  PerspectiveOfToolkit,
  ActionFromUser,
  ActionFromLlm,
  ActionFromToolkit,
  SendUserMessage,
  StartAssiMessageStream,
  EndAssiMessageStream,
  RequestToolCall,
  ReceiveToolResult,
  ToolCallRequest,
  ToolResult,
  ToolCallRequests,
  ToolResults,
  UserMessage,
  AssiMessage,
  BaseMessage,
} from "./decl";

// 导出 Agent 更新相关类型
export type { AgentUpdatePack } from "./impl/agent/create";

// ============================================================================
// 导出函数
// ============================================================================
export { createAgent } from "./impl/agent";
