// ============================================================================
// 处理 BrainRefineContext 输入
// ============================================================================

import type { BrainRefineContext } from "../input";
import type { ReflexorState } from "../state";
import { findToolCallIndex } from "../state";

/**
 * 处理 Brain 优化上下文
 *
 * @param input - BrainRefineContext 输入
 * @param state - 当前状态
 * @returns 新状态
 */
export function handleBrainRefineContext(
  input: BrainRefineContext,
  state: ReflexorState
): ReflexorState {
  const { refinement } = input;

  switch (refinement.kind) {
    case "compress-history":
      return handleCompressHistory(input, state);
    case "load-tool-call":
      return handleLoadToolCall(input, state);
    default:
      return state;
  }
}

/**
 * 处理压缩历史
 *
 * 将截止时间之前的历史压缩为摘要。
 *
 * @param input - BrainRefineContext 输入
 * @param state - 当前状态
 * @returns 新状态
 */
function handleCompressHistory(
  input: BrainRefineContext,
  state: ReflexorState
): ReflexorState {
  if (input.refinement.kind !== "compress-history") {
    return state;
  }

  const { summary, cutAt } = input.refinement;

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
  };
}

/**
 * 处理加载历史 Tool Call
 *
 * 将指定的 tool call 标记为已加载。
 *
 * @param input - BrainRefineContext 输入
 * @param state - 当前状态
 * @returns 新状态
 */
function handleLoadToolCall(
  input: BrainRefineContext,
  state: ReflexorState
): ReflexorState {
  if (input.refinement.kind !== "load-tool-call") {
    return state;
  }

  const { toolCallId } = input.refinement;

  // 查找 tool call
  const index = findToolCallIndex(state, toolCallId);
  if (index === -1) {
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
  };
}
