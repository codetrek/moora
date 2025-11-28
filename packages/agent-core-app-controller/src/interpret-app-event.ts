// ============================================================================
// Interpret App Event - 事件解释函数
// ============================================================================

import type { AgentAppEvent } from "@moora/agent-webui-protocol";
import type { AgentInput } from "@moora/agent-core-state-machine";

/**
 * 将 AgentAppEvent 解释为 AgentInput 数组
 *
 * @param event - 应用事件
 * @returns Agent 输入信号数组
 *
 * @example
 * ```typescript
 * const event: AgentAppEvent = {
 *   type: "user-message",
 *   content: "Hello",
 *   taskHints: [],
 * };
 *
 * const inputs = interpretAppEvent(event);
 * // [{ type: "user-message", messageId: "...", content: "Hello", timestamp: ... }]
 * ```
 */
export function interpretAppEvent(event: AgentAppEvent): AgentInput[] {
  switch (event.type) {
    case "user-message": {
      // 生成唯一的 messageId
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      return [
        {
          type: "user-message",
          messageId,
          content: event.content,
          timestamp: Date.now(),
        },
      ];
    }

    case "cancel-task": {
      // TODO: task 相关的功能 agent-core-state-machine 暂时没支持
      // 注意：新版的 AgentInput 中没有 cancel-task 类型
      // 可能需要通过其他方式处理，比如发送一个特殊的消息
      // 或者这个功能需要在服务端处理
      return [];
    }

    case "update-task-summary": {
      // TODO: task 相关的功能 agent-core-state-machine 暂时没支持
      // 注意：新版的 AgentInput 中没有 update-task-summary 类型
      // 可能需要通过其他方式处理
      return [];
    }

    default: {
      return [];
    }
  }
}

