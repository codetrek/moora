// ============================================================================
// 步骤 5：节点状态推着走 - Effect 类型定义
// ============================================================================

import type { Dispatch } from "@moora/moorex";
import type { OutputFromUser } from "./signal";
import type {
  StateAgentUser,
  StateUserUser,
  StateUserAgent,
  StateToolkitAgent,
  StateAgentAgent,
  StateAgentToolkit,
  StateToolkitToolkit,
} from "./state";
import type { Message, ToolDefinition } from "./signal";

// ============================================================================
// Effect 类型定义
// ============================================================================

/**
 * User 节点的 Effect 类型
 * 
 * Effect 极简化：只包含无法从状态中获取的信息。
 * messages 和 streamingChunks 都可以从 state 中获取，所以不需要包含在 Effect 中。
 */
export type EffectOfUser = {
  kind: "updateUI";
};

/**
 * Agent 节点的 Effect 类型
 * 
 * Effect 极简化：只包含无法从状态中获取的信息。
 * messages、toolResults、prompt、tools 都可以从 state 中获取。
 */
export type EffectOfAgent = {
  kind: "callLLM";
};

/**
 * Toolkit 节点的 Effect 类型
 * 
 * Effect 极简化：只包含无法从状态中获取的信息。
 * pendingToolCalls 可以从 state 中获取。
 */
export type EffectOfToolkit = {
  kind: "executeTool";
  toolCallId: string; // 需要知道执行哪个工具调用
};

// ============================================================================
// Effect 相关的 IO 类型（依赖注入类型）
// ============================================================================

/**
 * LLM 调用函数类型
 * 
 * @param prompt - 系统提示词
 * @param tools - 可用工具定义列表
 * @param messages - 消息列表（包含 user 和 assistant messages）
 * @returns Promise<LLMResponse>
 */
export type CallLLMFn = (
  prompt: string,
  tools: ToolDefinition[],
  messages: Message[]
) => Promise<LLMResponse>;

/**
 * LLM 响应类型
 */
export type LLMResponse =
  | {
      type: "message";
      messageId: string;
      chunks: AsyncIterable<string>; // 流式输出 chunks
    }
  | {
      type: "toolCall";
      toolCallId: string;
      toolName: string;
      parameters: string; // JSON string
    };

/**
 * 获取工具名称列表的函数类型
 */
export type GetToolNamesFn = () => Promise<string[]>;

/**
 * 获取工具定义的函数类型
 * 
 * @param names - 工具名称列表
 * @returns Promise<ToolDefinition[]>
 */
export type GetToolDefinitionsFn = (
  names: string[]
) => Promise<ToolDefinition[]>;

/**
 * 更新 UI 的回调函数类型
 * 
 * @param stateAgentUser - Channel AGENT -> USER 的 State（包含完整的 UI 状态）
 * @param dispatch - Dispatch 函数，用于发送 OutputFromUser
 */
export type UpdateUIFn = (
  stateAgentUser: StateAgentUser,
  dispatch: Dispatch<OutputFromUser>
) => void;

// ============================================================================
// StateForXxx 和 MakeRunEffectForXxxOptions 类型定义
// ============================================================================

/**
 * User 节点的 StateForUser 类型（打包 User 需要的所有 Channel State）
 * 
 * User 的入边：Channel_AGENT_USER, Channel_USER_USER (loopback)
 */
export type StateForUser = {
  agentUser: StateAgentUser;
  userUser: StateUserUser;
};

/**
 * User 节点的 MakeRunEffectForUserOptions 类型
 */
export type MakeRunEffectForUserOptions = {
  updateUI: UpdateUIFn;
};

/**
 * Agent 节点的 StateForAgent 类型（打包 Agent 需要的所有 Channel State）
 * 
 * Agent 的入边：Channel_USER_AGENT, Channel_TOOLKIT_AGENT, Channel_AGENT_AGENT (loopback)
 * 注意：也可能需要 Channel_AGENT_TOOLKIT 的 State（用于查找 tool call 请求信息）
 */
export type StateForAgent = {
  userAgent: StateUserAgent;
  toolkitAgent: StateToolkitAgent;
  agentAgent: StateAgentAgent;
  agentToolkit: StateAgentToolkit; // 用于查找 tool call 请求信息
};

/**
 * Agent 节点的 MakeRunEffectForAgentOptions 类型
 */
export type MakeRunEffectForAgentOptions = {
  callLLM: CallLLMFn;
  prompt: string;
  getToolNames: GetToolNamesFn;
  getToolDefinitions: GetToolDefinitionsFn;
};

/**
 * Toolkit 节点的 StateForToolkit 类型（打包 Toolkit 需要的所有 Channel State）
 * 
 * Toolkit 的入边：Channel_AGENT_TOOLKIT, Channel_TOOLKIT_TOOLKIT (loopback)
 */
export type StateForToolkit = {
  agentToolkit: StateAgentToolkit;
  toolkitToolkit: StateToolkitToolkit;
};

/**
 * Toolkit 节点的 MakeRunEffectForToolkitOptions 类型
 */
export type MakeRunEffectForToolkitOptions = {
  getToolNames: GetToolNamesFn;
  getToolDefinitions: GetToolDefinitionsFn;
};

