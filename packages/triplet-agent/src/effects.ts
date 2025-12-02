// ============================================================================
// 步骤 5：节点状态推着走 - 定义每个节点的 Effect、effectsAt 和 runEffect
// ============================================================================

import type { Dispatch, EffectController } from "@moora/moorex";
import type {
  OutputFromUser,
  OutputFromAgent,
  OutputFromToolkit,
  Message,
  ToolDefinition,
} from "./io";
import type {
  StateUserAgent,
  StateAgentToolkit,
  StateToolkitAgent,
  StateAgentUser,
  StateUserUser,
  StateAgentAgent,
  StateToolkitToolkit,
} from "./state";

// ============================================================================
// 依赖注入类型定义
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
// User 节点的 Effect 类型
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

// ============================================================================
// Agent 节点的 Effect 类型
// ============================================================================

/**
 * Agent 节点的 Effect 类型
 * 
 * Effect 极简化：只包含无法从状态中获取的信息。
 * messages、toolResults、prompt、tools 都可以从 state 中获取。
 */
export type EffectOfAgent = {
  kind: "callLLM";
};

// ============================================================================
// Toolkit 节点的 Effect 类型
// ============================================================================

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
// User 节点的 effectsAt 和 runEffect
// ============================================================================

/**
 * User 节点的 effectsAt 函数
 * 
 * 根据节点的"综合观察"（所有入边 Channel 的 State）推导出要触发的 Effect。
 * User 的入边：
 * - Channel_AGENT_USER: StateAgentUser
 * - Channel_USER_USER (loopback): StateUserUser
 * 
 * 无条件返回 updateUI effect，确保 UI 始终与状态同步。
 */
export const effectsAtForUser = (
  stateAgentUser: StateAgentUser,
  stateUserUser: StateUserUser
): Record<string, EffectOfUser> => {
  // 无条件返回 updateUI effect
  return { user: { kind: "updateUI" } };
};

/**
 * User 节点的 runEffect 函数
 * 
 * 执行副作用，调用 UI render callback，传递 State 和 dispatch 方法。
 * 
 * @param effect - Effect 实例（极简，只包含必要信息）
 * @param stateAgentUser - Channel AGENT -> USER 的 State（包含完整的 UI 状态）
 * @param dispatch - Dispatch 函数，用于发送 OutputFromUser
 * @param updateUI - 注入的更新 UI 回调函数
 */
export const runEffectForUser = (
  effect: EffectOfUser,
  stateAgentUser: StateAgentUser,
  dispatch: Dispatch<OutputFromUser>,
  updateUI: UpdateUIFn
): EffectController<OutputFromUser> => {
  return {
    start: async () => {
      // 调用 UI render callback，传递 state 和 dispatch
      updateUI(stateAgentUser, dispatch);
    },
    cancel: () => {
      // 清理 UI 资源（如果需要）
    },
  };
};

// ============================================================================
// Agent 节点的 effectsAt 和 runEffect
// ============================================================================

/**
 * Agent 节点的 effectsAt 函数
 * 
 * 根据节点的"综合观察"（所有入边 Channel 的 State）推导出要触发的 Effect。
 * Agent 的入边：
 * - Channel_USER_AGENT: StateUserAgent
 * - Channel_TOOLKIT_AGENT: StateToolkitAgent
 * - Channel_AGENT_AGENT (loopback): StateAgentAgent
 * 
 * 当有新的用户消息或工具执行结果时，需要调用 LLM。
 */
export const effectsAtForAgent = (
  stateUserAgent: StateUserAgent,
  stateToolkitAgent: StateToolkitAgent,
  stateAgentAgent: StateAgentAgent
): Record<string, EffectOfAgent> => {
  // 如果有新的用户消息，需要调用 LLM
  if (stateUserAgent.userMessages.length > 0) {
    return { agent: { kind: "callLLM" } };
  }
  // 如果有工具执行结果，需要继续调用 LLM 处理
  if (stateToolkitAgent.toolResults.length > 0) {
    return { agent: { kind: "callLLM" } };
  }
  return {};
};

/**
 * Agent 节点的 runEffect 函数
 * 
 * 执行副作用，调用 LLM API，传递完整的 context 和 dispatch 方法。
 * 
 * @param effect - Effect 实例（极简）
 * @param stateUserAgent - Channel USER -> AGENT 的 State
 * @param stateToolkitAgent - Channel TOOLKIT -> AGENT 的 State
 * @param dispatch - Dispatch 函数，用于发送 OutputFromAgent
 * @param callLLM - 注入的 LLM 调用函数
 * @param prompt - 系统提示词
 * @param getToolNames - 注入的获取工具名称列表的函数
 * @param getToolDefinitions - 注入的获取工具定义的函数
 */
export const runEffectForAgent = (
  effect: EffectOfAgent,
  stateUserAgent: StateUserAgent,
  stateToolkitAgent: StateToolkitAgent,
  dispatch: Dispatch<OutputFromAgent>,
  callLLM: CallLLMFn,
  prompt: string,
  getToolNames: GetToolNamesFn,
  getToolDefinitions: GetToolDefinitionsFn
): EffectController<OutputFromAgent> => {
  return {
    start: async () => {
      // 获取工具名称列表
      const toolNames = await getToolNames();
      // 获取工具定义
      const tools = await getToolDefinitions(toolNames);
      
      // 构建 messages：包含 user messages 和 tool messages
      const messages: Message[] = [];
      
      // 添加用户消息
      for (const userMsg of stateUserAgent.userMessages) {
        messages.push({
          id: userMsg.id,
          role: "user",
          content: userMsg.content,
          timestamp: userMsg.timestamp,
        });
      }
      
      // 将工具执行结果整合为 tool messages（格式：tool message）
      for (const toolResult of stateToolkitAgent.toolResults) {
        if (toolResult.isSuccess) {
          messages.push({
            id: `tool-${toolResult.toolCallId}`,
            role: "assistant", // tool message 使用 assistant role
            content: `Tool ${toolResult.toolName} result: ${toolResult.result}`,
            timestamp: toolResult.timestamp,
          });
        } else {
          messages.push({
            id: `tool-error-${toolResult.toolCallId}`,
            role: "assistant",
            content: `Tool ${toolResult.toolName} error: ${toolResult.error}`,
            timestamp: toolResult.timestamp,
          });
        }
      }
      
      // 调用 LLM API
      const response = await callLLM(prompt, tools, messages);
      
      // 根据响应 dispatch 相应的 Output
      if (response.type === "toolCall") {
        dispatch({
          type: "callTool",
          toolCallId: response.toolCallId,
          toolName: response.toolName,
          parameters: response.parameters,
        });
      } else {
        // 流式输出消息
        const messageId = response.messageId;
        for await (const chunk of response.chunks) {
          dispatch({
            type: "sendChunk",
            messageId,
            chunk,
          });
        }
        dispatch({
          type: "completeMessage",
          messageId,
        });
      }
    },
    cancel: () => {
      // 取消 LLM 调用（如果需要）
    },
  };
};

// ============================================================================
// Toolkit 节点的 effectsAt 和 runEffect
// ============================================================================

/**
 * Toolkit 节点的 effectsAt 函数
 * 
 * 根据节点的"综合观察"（所有入边 Channel 的 State）推导出要触发的 Effect。
 * Toolkit 的入边：
 * - Channel_AGENT_TOOLKIT: StateAgentToolkit
 * - Channel_TOOLKIT_TOOLKIT (loopback): StateToolkitToolkit
 * 
 * 当有待执行的工具调用时，需要执行工具。
 */
export const effectsAtForToolkit = (
  stateAgentToolkit: StateAgentToolkit,
  stateToolkitToolkit: StateToolkitToolkit
): Record<string, EffectOfToolkit> => {
  const effects: Record<string, EffectOfToolkit> = {};
  
  // 为每个待执行的工具调用创建 Effect
  for (const toolCall of stateAgentToolkit.pendingToolCalls) {
    effects[`tool:${toolCall.toolCallId}`] = {
      kind: "executeTool",
      toolCallId: toolCall.toolCallId,
    };
  }
  
  return effects;
};

/**
 * Toolkit 节点的 runEffect 函数
 * 
 * 执行副作用，调用工具执行器，传递工具调用信息和 dispatch 方法。
 * 
 * @param effect - Effect 实例（包含 toolCallId）
 * @param stateAgentToolkit - Channel AGENT -> TOOLKIT 的 State
 * @param dispatch - Dispatch 函数，用于发送 OutputFromToolkit
 * @param getToolNames - 注入的获取工具名称列表的函数
 * @param getToolDefinitions - 注入的获取工具定义的函数
 */
export const runEffectForToolkit = (
  effect: EffectOfToolkit,
  stateAgentToolkit: StateAgentToolkit,
  dispatch: Dispatch<OutputFromToolkit>,
  getToolNames: GetToolNamesFn,
  getToolDefinitions: GetToolDefinitionsFn
): EffectController<OutputFromToolkit> => {
  return {
    start: async () => {
      // 从 state 中查找对应的工具调用
      const toolCall = stateAgentToolkit.pendingToolCalls.find(
        (tc) => tc.toolCallId === effect.toolCallId
      );
      
      if (!toolCall) {
        // 工具调用不存在，发送错误
        dispatch({
          type: "toolError",
          toolCallId: effect.toolCallId,
          toolName: "unknown",
          error: "Tool call not found",
        });
        return;
      }
      
      try {
        // 获取工具定义
        const toolNames = await getToolNames();
        const tools = await getToolDefinitions(toolNames);
        
        // 查找对应的工具定义
        const toolDef = tools.find((t) => t.name === toolCall.toolName);
        
        if (!toolDef) {
          dispatch({
            type: "toolError",
            toolCallId: toolCall.toolCallId,
            toolName: toolCall.toolName,
            error: `Tool ${toolCall.toolName} not found`,
          });
          return;
        }
        
        // 执行工具（使用工具定义的 run 方法）
        const result = await toolDef.run(toolCall.parameters);
        
        dispatch({
          type: "toolResult",
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          result,
        });
      } catch (error) {
        dispatch({
          type: "toolError",
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    cancel: () => {
      // 取消工具执行（如果需要）
    },
  };
};

