// ============================================================================
// Agent Core 类型定义
// ============================================================================

// ============================================================================
// Agent State 相关类型
// ============================================================================

/**
 * Agent 内部状态
 * 
 * 这是 Agent 的完整状态表示，包含所有内部实现细节。
 * 前后端共用这个状态定义来保持同步。
 */
export type AgentState = {
  /**
   * 当前状态阶段
   */
  phase: "idle" | "processing" | "error";

  /**
   * 消息列表（内部格式）
   */
  messages: InternalMessage[];

  /**
   * 当前正在处理的请求 ID（如果有）
   */
  currentRequestId?: string;

  /**
   * 错误信息（如果有）
   */
  error?: string;

  /**
   * LLM 调用历史
   */
  llmHistory: LLMCall[];

  /**
   * Tool 调用历史
   */
  toolHistory: ToolCall[];
};

/**
 * 内部消息格式
 */
export type InternalMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  /**
   * 是否正在流式输出中
   */
  streaming?: boolean;
};

/**
 * LLM 调用记录
 */
export type LLMCall = {
  id: string;
  requestId: string;
  timestamp: number;
  prompt: string;
  response?: string;
  error?: string;
};

/**
 * Tool 调用记录
 */
export type ToolCall = {
  id: string;
  requestId: string;
  timestamp: number;
  toolName: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  error?: string;
};

// ============================================================================
// Agent Input 相关类型
// ============================================================================

/**
 * 用户消息输入
 */
export type UserMessageInput = {
  type: "user-message";
  requestId: string;
  content: string;
};

/**
 * LLM 调用开始输入
 */
export type LLMCallStartedInput = {
  type: "llm-call-started";
  requestId: string;
  callId: string;
  prompt: string;
};

/**
 * LLM 响应输入
 */
export type LLMResponseInput = {
  type: "llm-response";
  requestId: string;
  callId: string;
  response: string;
};

/**
 * LLM 错误输入
 */
export type LLMErrorInput = {
  type: "llm-error";
  requestId: string;
  callId: string;
  error: string;
};

/**
 * Tool 结果输入
 */
export type ToolResultInput = {
  type: "tool-result";
  requestId: string;
  callId: string;
  result: unknown;
};

/**
 * Tool 错误输入
 */
export type ToolErrorInput = {
  type: "tool-error";
  requestId: string;
  callId: string;
  error: string;
};

/**
 * 取消输入
 */
export type CancelInput = {
  type: "cancel";
  requestId: string;
};

/**
 * 清空输入
 */
export type ClearInput = {
  type: "clear";
};

/**
 * 错误输入
 */
export type ErrorInput = {
  type: "error";
  error: string;
};

/**
 * Agent 输入信号
 * 
 * 这些是 Agent 状态机可以接收的输入信号。
 */
export type AgentInput =
  | UserMessageInput
  | LLMCallStartedInput
  | LLMResponseInput
  | LLMErrorInput
  | ToolResultInput
  | ToolErrorInput
  | CancelInput
  | ClearInput
  | ErrorInput;

// ============================================================================
// Agent Effect 相关类型
// ============================================================================

/**
 * LLM 调用 Effect
 */
export type CallLLMEffect = {
  type: "call-llm";
  /**
   * Effect ID（用于 reconciliation）
   */
  id: string;
  /**
   * 请求 ID
   */
  requestId: string;
  /**
   * LLM 调用 ID
   */
  callId: string;
  /**
   * 提示词
   */
  prompt: string;
  /**
   * 系统提示词（可选）
   */
  systemPrompt?: string;
  /**
   * 消息历史（用于上下文）
   */
  messageHistory?: Array<{ role: "user" | "assistant"; content: string }>;
};

/**
 * Tool 调用 Effect
 */
export type CallToolEffect = {
  type: "call-tool";
  /**
   * Effect ID（用于 reconciliation）
   */
  id: string;
  /**
   * 请求 ID
   */
  requestId: string;
  /**
   * Tool 调用 ID
   */
  callId: string;
  /**
   * Tool 名称
   */
  toolName: string;
  /**
   * Tool 参数
   */
  arguments: Record<string, unknown>;
};

/**
 * Agent Effect 类型
 * 
 * 描述 Agent 可能触发的副作用行为。
 * 注意：这里的 Effects 不包含向用户发送消息，因为前端是通过同步 AgentState 来获取消息的。
 */
export type AgentEffect = CallLLMEffect | CallToolEffect;

/**
 * LLM 调用函数类型
 */
export type LLMCallFn = (options: {
  prompt: string;
  systemPrompt?: string;
  messageHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}) => Promise<string>;

/**
 * Tool 定义
 */
export type Tool = {
  /**
   * Tool 名称
   */
  name: string;
  /**
   * Tool 描述
   */
  description: string;
  /**
   * Tool 参数 schema（JSON Schema 格式）
   */
  parameters?: Record<string, unknown>;
  /**
   * Tool 执行函数
   */
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};

/**
 * Agent Moorex 选项
 */
export type AgentMoorexOptions = {
  /**
   * LLM 调用函数
   */
  callLLM: LLMCallFn;
  /**
   * 可用的 Tools
   */
  tools?: Record<string, Tool>;
};

// ============================================================================
// Frontend Controller 相关类型
// ============================================================================

/**
 * 创建 Agent Controller 的选项
 */
export type CreateAgentControllerOptions = {
  /**
   * Agent 服务的 endpoint URL
   */
  endpoint: string;

  /**
   * 可选的请求 ID 生成器
   */
  generateRequestId?: () => string;
};

