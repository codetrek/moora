// ============================================================================
// Agent App Event 类型定义
// ============================================================================

/**
 * 用户消息事件
 * 
 * 当用户在 Web UI 中输入消息并发送时触发。
 */
export type UserMessageEvent = {
  /**
   * 事件类型标识
   */
  type: "user-message";
  /**
   * 用户消息内容
   */
  content: string;
};

/**
 * 取消事件
 * 
 * 取消当前正在处理的任务。
 */
export type CancelEvent = {
  /**
   * 事件类型标识
   */
  type: "cancel";
};

/**
 * 重试事件
 * 
 * 重试上次失败的操作。
 */
export type RetryEvent = {
  /**
   * 事件类型标识
   */
  type: "retry";
};

/**
 * 清空事件
 * 
 * 清空对话历史。
 */
export type ClearEvent = {
  /**
   * 事件类型标识
   */
  type: "clear";
};

/**
 * Agent 应用事件 - 用户可以通过 Web UI 触发的事件类型
 * 
 * 这个类型定义了前端 UI 可以发送给 Agent 的所有事件。
 * 使用 Discriminated Union 类型，通过 `type` 字段区分不同的事件类型。
 */
export type AgentAppEvent =
  | UserMessageEvent
  | CancelEvent
  | RetryEvent
  | ClearEvent;

