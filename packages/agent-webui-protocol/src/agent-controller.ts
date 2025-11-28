// ============================================================================
// Agent Controller 类型定义
// ============================================================================

import type { AgentAppState } from "./agent-app-state";
import type { AgentAppEvent } from "./agent-app-event";
import type { Unsubscribe } from "@moora/moorex";

/**
 * Agent 控制器接口
 * 
 * 前端通过这个接口与 Agent 进行交互。
 * 前端应用不预设 AgentController 的实现，需要在创建实例时注入。
 * 
 * @example
 * ```typescript
 * const controller: AgentController = {
 *   subscribe: (handler) => {
 *     // 订阅状态变化
 *     return () => { /* 取消订阅 *\/ };
 *   },
 *   notify: (event) => {
 *     // 发送事件到 Agent
 *   },
 * };
 * ```
 */
export type AgentController = {
  /**
   * 订阅状态变化
   * 
   * 当 Agent 状态发生变化时，会调用传入的处理函数。
   * 订阅时会立即调用一次处理函数，传入当前状态。
   * 
   * @param handler - 状态变化处理函数，接收最新的 AgentAppState
   * @returns 取消订阅的函数，调用后不再接收状态更新
   * 
   * @example
   * ```typescript
   * const unsubscribe = controller.subscribe((state) => {
   *   console.log('State updated:', state);
   * });
   * 
   * // 稍后取消订阅
   * unsubscribe();
   * ```
   */
  subscribe(handler: (state: AgentAppState) => void): Unsubscribe;

  /**
   * 通知 Agent 事件
   * 
   * 向 Agent 发送用户触发的事件，如用户消息、取消 task、更新 task summary 等。
   * 
   * @param event - 要发送的事件
   * 
   * @example
   * ```typescript
   * // 发送用户消息（带 task hints）
   * controller.notify({
   *   type: 'user-message',
   *   content: '继续处理这个任务',
   *   taskHints: ['task-1'],
   * });
   * 
   * // 取消 task
   * controller.notify({
   *   type: 'cancel-task',
   *   taskId: 'task-1',
   * });
   * 
   * // 更新 task summary
   * controller.notify({
   *   type: 'update-task-summary',
   *   taskId: 'task-1',
   *   summary: '新的任务简介',
   * });
   * ```
   */
  notify(event: AgentAppEvent): void;
};

