// ============================================================================
// Agent Core 导出
// ============================================================================

/**
 * Agent Core
 * 
 * 提供 Agent 的核心逻辑，包括：
 * - Agent State Machine: 前后端共用的状态机
 * - Frontend Controller: 前端控制器实现
 * - Agent Moorex: 服务端 Effects 处理
 */

// ============================================================================
// 导出所有类型
// ============================================================================
export type {
  // Agent State 相关
  AgentState,
  InternalMessage,
  LLMCall,
  ToolCall,
  // Agent Input 相关
  AgentInput,
  UserMessageInput,
  LLMCallStartedInput,
  LLMResponseInput,
  LLMErrorInput,
  ToolResultInput,
  ToolErrorInput,
  CancelInput,
  ClearInput,
  ErrorInput,
  // Agent Effect 相关
  AgentEffect,
  CallLLMEffect,
  CallToolEffect,
  LLMCallFn,
  Tool,
  AgentMoorexOptions,
  // Frontend Controller 相关
  CreateAgentControllerOptions,
} from "./types";

// ============================================================================
// 导出 State Machine
// ============================================================================
export {
  initialAgentState,
  agentTransition,
  agentStateMachine,
} from "./state-machine";

// ============================================================================
// 导出 Frontend Controller
// ============================================================================
export {
  mapAppState,
  interpretAppEvent,
  createAgentController,
} from "./frontend-controller";

// ============================================================================
// 导出 Agent Moorex
// ============================================================================
export {
  agentEffectsAt,
  createAgentRunEffect,
  createAgentMoorexDefinition,
} from "./agent-moorex";
