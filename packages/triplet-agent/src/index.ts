// ============================================================================
// 导出所有类型
// ============================================================================
export type { Participants } from "./participants";
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
} from "./io";
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
} from "./channels";
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
} from "./state";

// ============================================================================
// 导出常量
// ============================================================================
export { USER, AGENT, TOOLKIT } from "./participants";
export {
  Channel_USER_AGENT,
  Channel_AGENT_TOOLKIT,
  Channel_TOOLKIT_AGENT,
  Channel_AGENT_USER,
  Channel_USER_USER,
  Channel_AGENT_AGENT,
  Channel_TOOLKIT_TOOLKIT,
} from "./channels";

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
} from "./io";
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
} from "./state";

// ============================================================================
// 导出工具函数
// ============================================================================
export { isValidChannel } from "./channels";
export {
  transitionUserAgent,
  transitionAgentToolkit,
  transitionToolkitAgent,
  transitionAgentUser,
  transitionUserUser,
  transitionAgentAgent,
  transitionToolkitToolkit,
} from "./transition";

