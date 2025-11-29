// ============================================================================
// Transition Utils - 辅助函数
// ============================================================================

import type { AgentInput } from "../input";
import type { AgentState } from "../state";
import type { AgentMessage } from "@moora/agent-webui-protocol";

/**
 * 检查消息 ID 是否存在
 *
 * 检查指定 ID 的消息是否已存在于状态中。
 *
 * @param state - Agent 状态
 * @param messageId - 消息 ID
 * @returns 如果消息存在返回 true，否则返回 false
 *
 * @internal
 */
export const messageIdExists = (
  state: AgentState,
  messageId: string
): boolean => {
  return state.messages.some((msg) => msg.id === messageId);
};

/**
 * 查找消息索引
 *
 * 在消息列表中查找指定 ID 的消息，返回其索引。
 * 如果未找到，返回 -1。
 *
 * @param messages - 消息列表
 * @param messageId - 消息 ID
 * @returns 消息索引，如果未找到则返回 -1
 *
 * @internal
 */
export const findMessageById = (
  messages: readonly AgentMessage[],
  messageId: string
): [number, AgentMessage] | null => {
  const index = messages.findIndex((msg) => msg.id === messageId);
  if (index < 0) {
    return null;
  }
  return [index, messages[index]!];
};

/**
 * 检查时间不可逆原则
 *
 * 如果输入的时间戳小于等于 state 的时间戳，视为无效输入。
 *
 * @internal
 */
export const checkTimeIrreversibility = (
  input: AgentInput,
  state: AgentState
): boolean => {
  if (input.timestamp <= state.updatedAt) {
    console.warn(
      `[AgentStateMachine] Ignoring input with invalid timestamp: type=${input.type}, inputTimestamp=${input.timestamp}, stateUpdatedAt=${state.updatedAt}`
    );
    return false;
  }
  return true;
};


