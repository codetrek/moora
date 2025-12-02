// ============================================================================
// 导出所有类型
// ============================================================================
export type { Participants } from "./types/topology";
export type {
  Message,
  InputForUser,
  OutputFromUser,
  ToolDefinition,
  InputForAgent,
  OutputFromAgent,
  InputForToolkit,
  OutputFromToolkit,
  InputFor,
  OutputFrom,
  RunEffectFn,
} from "./types/signal";
export type {
  Channel,
  ChannelUserAgent,
  ChannelAgentToolkit,
  ChannelToolkitAgent,
  ChannelAgentUser,
  ChannelAgentAgent,
  ChannelToolkitToolkit,
  ChannelSource,
  ChannelTarget,
} from "./types/topology";
export type {
  // 公共类型定义
  UserMessage,
  ToolCall,
  ToolResultSuccess,
  ToolResultFailure,
  ToolResult,
  AgentProcessingHistoryItem,
  ToolkitExecutionHistoryItem,
  AssistantMessage,
  // Channel State 类型
  StateUserAgent,
  StateAgentToolkit,
  StateToolkitAgent,
  StateAgentUser,
  StateAgentAgent,
  StateToolkitToolkit,
} from "./types/state";
export type {
  EffectOfUser,
  EffectOfAgent,
  EffectOfToolkit,
  CallLLMFn,
  LLMResponse,
  GetToolNamesFn,
  GetToolDefinitionsFn,
  UpdateUIFn,
  StateForUser,
  StateForAgent,
  StateForToolkit,
  MakeRunEffectForUserOptions,
  MakeRunEffectForAgentOptions,
  MakeRunEffectForToolkitOptions,
} from "./types/effects";
export type {
  State,
  Signal,
  Effect,
  StateForChannel,
  MakeRunEffectOptions,
} from "./types/unified";

// ============================================================================
// 导出常量
// ============================================================================
export { USER, AGENT, TOOLKIT } from "./types/topology";
export {
  Channel_USER_AGENT,
  Channel_AGENT_TOOLKIT,
  Channel_TOOLKIT_AGENT,
  Channel_AGENT_USER,
  Channel_AGENT_AGENT,
  Channel_TOOLKIT_TOOLKIT,
} from "./types/topology";

// ============================================================================
// 导出 Schema（用于运行时验证）
// ============================================================================
export {
  messageSchema,
  inputForUserSchema,
  outputFromUserSchema,
  toolDefinitionSchema,
  inputForAgentSchema,
  outputFromAgentSchema,
  inputForToolkitSchema,
  outputFromToolkitSchema,
} from "./types/signal";
export {
  // 公共 Schema
  userMessageSchema,
  toolCallSchema,
  toolResultSuccessSchema,
  toolResultFailureSchema,
  toolResultSchema,
  agentProcessingHistoryItemSchema,
  toolkitExecutionHistoryItemSchema,
  assistantMessageSchema,
  // Channel State Schema
  stateUserAgentSchema,
  stateAgentToolkitSchema,
  stateToolkitAgentSchema,
  stateAgentUserSchema,
  stateAgentAgentSchema,
  stateToolkitToolkitSchema,
} from "./types/state";

// ============================================================================
// 导出工具函数
// ============================================================================
export { isValidChannel } from "./types/topology";
export {
  transitionUserAgent,
  transitionAgentToolkit,
  transitionToolkitAgent,
  transitionAgentUser,
  transitionAgentAgent,
  transitionToolkitToolkit,
} from "./transition";
export {
  effectsAtForUser,
  effectsAtForAgent,
  effectsAtForToolkit,
} from "./effectsAt";
export {
  makeRunEffectForUser,
  makeRunEffectForAgent,
  makeRunEffectForToolkit,
} from "./runEffect";
export { initial } from "./unified/initial";
export { transition } from "./unified/transition";
export { effectsAt } from "./unified/effectsAt";
export { makeRunEffect } from "./unified/runEffect";
export {
  stateForUserAgent,
  stateForAgentToolkit,
  stateForToolkitAgent,
  stateForAgentUser,
  stateForAgentAgent,
  stateForToolkitToolkit,
} from "./unified/state-for-channel";
export { createTripletAgentMoorex } from "./create-triplet-agent-moorex";
export type { CreateTripletAgentMoorexOptions } from "./create-triplet-agent-moorex";
