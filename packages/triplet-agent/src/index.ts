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
  ChannelUserUser,
  ChannelAgentAgent,
  ChannelToolkitToolkit,
  ChannelSource,
  ChannelTarget,
} from "./types/topology";
export type {
  ToolResultSuccess,
  ToolResultFailure,
  ToolResult,
  StateUserAgent,
  StateAgentToolkit,
  StateToolkitAgent,
  StateAgentUser,
  StateUserUser,
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
  Channel_USER_USER,
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
  toolResultSuccessSchema,
  toolResultFailureSchema,
  toolResultSchema,
  stateUserAgentSchema,
  stateAgentToolkitSchema,
  stateToolkitAgentSchema,
  stateAgentUserSchema,
  stateUserUserSchema,
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
  transitionUserUser,
  transitionAgentAgent,
  transitionToolkitToolkit,
} from "./transition";
export {
  effectsAtForUser,
  effectsAtForAgent,
  effectsAtForToolkit,
} from "./effectsAt";
export {
  runEffectForUser,
  runEffectForAgent,
  runEffectForToolkit,
} from "./runEffect";
export { initial } from "./unified/initial";
export { transition } from "./unified/transition";
export { effectsAt } from "./unified/effectsAt";
export { makeRunEffect } from "./unified/runEffect";
export { getStateForChannel } from "./unified/state-for-channel";
export { createTripletAgentMoorex } from "./create-triplet-agent-moorex";
export type { CreateTripletAgentMoorexOptions } from "./create-triplet-agent-moorex";
