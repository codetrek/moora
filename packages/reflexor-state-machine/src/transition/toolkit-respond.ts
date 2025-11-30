// ============================================================================
// 处理 ToolkitRespond 和 ToolkitError 输入
// ============================================================================

import type { ToolkitRespond, ToolkitError } from "../input";
import type { ReflexorState, ToolCallResult } from "../state";
import { findToolCallIndex } from "../state-helper";

/**
 * 处理 Toolkit 返回结果
 *
 * @param input - ToolkitRespond 输入
 * @param state - 当前状态
 * @returns 新状态
 */
export function handleToolkitRespond(
  input: ToolkitRespond,
  state: ReflexorState
): ReflexorState {
  const toolCallIndex = findToolCallIndex(state, input.toolCallId);
  if (toolCallIndex === -1) {
    // Tool call 不存在，忽略
    return state;
  }

  const result: ToolCallResult = {
    isSuccess: true,
    content: input.result,
    receivedAt: input.timestamp,
  };

  return updateToolCallResult(toolCallIndex, result, input.timestamp, state);
}

/**
 * 处理 Toolkit 返回错误
 *
 * @param input - ToolkitError 输入
 * @param state - 当前状态
 * @returns 新状态
 */
export function handleToolkitError(
  input: ToolkitError,
  state: ReflexorState
): ReflexorState {
  const toolCallIndex = findToolCallIndex(state, input.toolCallId);
  if (toolCallIndex === -1) {
    // Tool call 不存在，忽略
    return state;
  }

  const result: ToolCallResult = {
    isSuccess: false,
    error: input.error,
    receivedAt: input.timestamp,
  };

  return updateToolCallResult(toolCallIndex, result, input.timestamp, state);
}

/**
 * 更新 Tool Call 结果
 *
 * @param recordIndex - Tool Call 在数组中的索引
 * @param result - 结果
 * @param timestamp - 时间戳
 * @param state - 当前状态
 * @returns 新状态
 */
function updateToolCallResult(
  recordIndex: number,
  result: ToolCallResult,
  timestamp: number,
  state: ReflexorState
): ReflexorState {
  return {
    ...state,
    updatedAt: timestamp,
    toolCallRecords: state.toolCallRecords.map((record, index) => {
      if (index === recordIndex) {
        return {
          ...record,
          result,
        };
      }
      return record;
    }),
  };
}
