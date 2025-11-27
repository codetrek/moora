// ============================================================================
// Agent App State 类型定义
// ============================================================================

/**
 * Agent 应用状态 - 用户可见的 Agent 状态
 * 
 * 这个类型定义了前端 UI 可以显示的所有 Agent 状态信息。
 * 它应该是一个只读的、用户友好的状态表示，不包含内部实现细节。
 * 
 * @example
 * ```typescript
 * const state: AgentAppState = {
 *   status: 'thinking',
 *   messages: [
 *     { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
 *   ],
 *   isProcessing: true,
 * };
 * ```
 */
export type AgentAppState = {
  /**
   * Agent 当前状态
   * - `idle`: 空闲状态，等待用户输入
   * - `thinking`: 正在思考/处理中（LLM 调用中）
   * - `responding`: 正在响应（生成消息中）
   * - `error`: 错误状态
   */
  status: "idle" | "thinking" | "responding" | "error";

  /**
   * 消息列表
   * 包含用户和 Agent 之间的对话消息，按时间顺序排列
   */
  messages: AgentMessage[];

  /**
   * 错误信息（如果有）
   * 当状态为 `error` 时，此字段包含错误详情
   */
  error?: string;

  /**
   * 是否正在处理中
   * 表示 Agent 是否正在处理某个请求
   */
  isProcessing: boolean;
};

/**
 * Agent 消息
 * 
 * 表示对话中的一条消息，可以是用户消息或助手消息。
 * 
 * @example
 * ```typescript
 * const message: AgentMessage = {
 *   id: 'msg-123',
 *   role: 'user',
 *   content: 'Hello, Agent!',
 *   timestamp: Date.now(),
 * };
 * ```
 */
export type AgentMessage = {
  /**
   * 消息唯一标识符
   */
  id: string;

  /**
   * 消息角色
   * - `user`: 用户发送的消息
   * - `assistant`: Agent 发送的消息
   */
  role: "user" | "assistant";

  /**
   * 消息文本内容
   */
  content: string;

  /**
   * 消息时间戳（Unix 时间戳，毫秒）
   */
  timestamp: number;

  /**
   * 是否正在流式输出中
   * 当 Agent 正在流式生成响应时，此字段为 `true`
   */
  streaming?: boolean;
};

