// ============================================================================
// 处理 Brain 上下文优化输入
// ============================================================================

import type { BrainCompressHistory, BrainLoadToolCall } from "../input";
import type { ReflexorState } from "../state";
import { findToolCallIndex } from "../state-helper";

/**
 * 处理 Brain 压缩历史
 *
 * 将截止时间之前的历史压缩为摘要，并将 cutAt 之前的 tool calls 的 isLoaded 重置为 false。
 *
 * @param input - BrainCompressHistory 输入
 * @param state - 当前状态
 * @returns 新状态
 */
export function handleBrainCompressHistory(
  input: BrainCompressHistory,
  state: ReflexorState
): ReflexorState {
  const { summary, cutAt } = input;

  // 压缩后，将 cutAt 之前的 tool calls 的 isLoaded 重置为 false
  const updatedToolCallRecords = state.toolCallRecords.map((tc) => {
    if (tc.calledAt <= cutAt && tc.isLoaded) {
      return { ...tc, isLoaded: false };
    }
    return tc;
  });

  return {
    ...state,
    updatedAt: input.timestamp,
    contextSummary: summary,
    summaryCutAt: cutAt,
    toolCallRecords: updatedToolCallRecords,
    calledBrainAt: input.calledBrainAt,
  };
}

/**
 * 处理 Brain 加载历史 Tool Call
 *
 * 将指定的 tool call 标记为已加载。
 *
 * @param input - BrainLoadToolCall 输入
 * @param state - 当前状态
 * @returns 新状态
 */
export function handleBrainLoadToolCall(
  input: BrainLoadToolCall,
  state: ReflexorState
): ReflexorState {
  const { toolCallId } = input;

  // 查找 tool call
  const index = findToolCallIndex(state, toolCallId);
  if (index === -1) {
    console.warn(
      `[brain-load-tool-call] Tool call not found: ${toolCallId}, ignoring.`
    );
    return state;
  }

  // 检查是否已经加载
  const toolCall = state.toolCallRecords[index];
  if (toolCall && toolCall.isLoaded) {
    return state;
  }

  // 标记为已加载
  return {
    ...state,
    updatedAt: input.timestamp,
    toolCallRecords: state.toolCallRecords.map((tc, i) => {
      if (i === index) {
        return { ...tc, isLoaded: true };
      }
      return tc;
    }),
    calledBrainAt: input.calledBrainAt,
  };
}
