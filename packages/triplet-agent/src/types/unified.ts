// ============================================================================
// 步骤 6：最后统合去冗余 - 统合全局类型定义
// ============================================================================

import type {
  UserMessage,
  ToolCall,
  ToolResult,
  AgentProcessingHistoryItem,
  ToolkitExecutionHistoryItem,
  AssistantMessage,
  StateUserAgent,
  StateAgentToolkit,
  StateToolkitAgent,
  StateAgentUser,
  StateAgentAgent,
  StateToolkitToolkit,
} from "./state";
import type {
  OutputFromUser,
  OutputFromAgent,
  OutputFromToolkit,
} from "./signal";
import type {
  EffectOfUser,
  EffectOfAgent,
  EffectOfToolkit,
} from "./effects";
import type {
  Channel,
  ChannelUserAgent,
  ChannelAgentToolkit,
  ChannelToolkitAgent,
  ChannelAgentUser,
  ChannelAgentAgent,
  ChannelToolkitToolkit,
} from "./topology";

// ============================================================================
// 全局 State 类型（所有 Channel State 字段去重后的合并）
// ============================================================================

/**
 * 全局 State 类型
 * 
 * 合并所有 Channel 的 State 类型，形成统一的全局状态。
 * 关键洞察：All Observation == All State（有向图的所有入边等于所有出边）
 * 
 * 注意：这不是简单地把各个 Channel State 打包，而是：
 * 1. 找出所有 Channel State 中的所有字段
 * 2. 识别重复的字段（相同名称和类型的字段）
 * 3. 去重后构建一个新的统一 State 类型
 * 4. **重要**：使用公共类型定义，而不是内联定义，保持类型一致性
 * 
 * 字段分析：
 * - StateUserAgent: { userMessages: UserMessage[], canceledStreamingMessageIds: string[] }
 * - StateAgentToolkit: { pendingToolCalls: ToolCall[] }
 * - StateToolkitAgent: { toolResults: ToolResult[] }
 * - StateAgentUser: { messages: AssistantMessage[], streamingChunks: Record<string, string[]> }
 * - StateAgentAgent: { processingHistory: AgentProcessingHistoryItem[] }
 * - StateToolkitToolkit: { executionHistory: ToolkitExecutionHistoryItem[] }
 * 
 * 所有字段都是唯一的，没有重复。所以去重后的 State 应该包含所有这些字段。
 */
export type State = {
  // 来自 StateUserAgent
  userMessages: UserMessage[];
  canceledStreamingMessageIds: string[];
  
  // 来自 StateAgentToolkit
  pendingToolCalls: ToolCall[];
  
  // 来自 StateToolkitAgent
  toolResults: ToolResult[];
  
  // 来自 StateAgentUser
  messages: AssistantMessage[];
  streamingChunks: Record<string, string[]>;
  
  // 来自 StateAgentAgent
  processingHistory: AgentProcessingHistoryItem[];
  
  // 来自 StateToolkitToolkit
  executionHistory: ToolkitExecutionHistoryItem[];
};

// ============================================================================
// Signal 类型（各个 Participant Output 的 union）
// ============================================================================

/**
 * Signal 类型
 * 
 * Signal 是各个 Participant Output 的 union。
 * 注意：改名为 Signal，不再是 Input。
 */
export type Signal = OutputFromUser | OutputFromAgent | OutputFromToolkit;

// ============================================================================
// Effect 类型（各个 Participant Effect 的 union）
// ============================================================================

/**
 * Effect 类型
 * 
 * Effect 是各个 Participant Effect 的 union。
 */
export type Effect = EffectOfUser | EffectOfAgent | EffectOfToolkit;

// ============================================================================
// 从 Channel 类型推导对应的 State 类型
// ============================================================================

/**
 * 从 Channel 类型推导对应的 State 类型
 */
export type StateForChannel<C extends Channel> =
  C extends ChannelUserAgent
    ? StateUserAgent
    : C extends ChannelAgentToolkit
      ? StateAgentToolkit
      : C extends ChannelToolkitAgent
        ? StateToolkitAgent
        : C extends ChannelAgentUser
          ? StateAgentUser
          : C extends ChannelAgentAgent
              ? StateAgentAgent
              : C extends ChannelToolkitToolkit
                ? StateToolkitToolkit
                : never;

// ============================================================================
// makeRunEffect 的 options 类型
// ============================================================================

import type {
  MakeRunEffectForUserOptions,
  MakeRunEffectForAgentOptions,
  MakeRunEffectForToolkitOptions,
} from "./effects";

/**
 * makeRunEffect 函数选项
 * 
 * 包含所有 Participant 需要的依赖注入选项。
 */
export type MakeRunEffectOptions = MakeRunEffectForUserOptions &
  MakeRunEffectForAgentOptions &
  MakeRunEffectForToolkitOptions;

