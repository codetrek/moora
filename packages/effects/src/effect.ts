/**
 * Effect 相关函数
 *
 * - runEffect: 执行 Eff（如果需要异步操作，内部自行使用 queueMicrotask）
 * - noopEffect: 空 Eff，什么都不做
 * - synchronous: 同步执行的 Eff
 * - asynchronous: 异步执行的 Eff（内部使用 queueMicrotask）
 * - stateful: 带状态的 Eff
 * - parallel: 并行执行多个 Eff
 * - sequential: 串行执行多个 Eff
 */

import type { Eff } from "./types";

/**
 * 带状态的 Eff
 *
 * 创建一个带有内部状态的 Eff 函数。
 * 状态在多次调用之间保持，类似于 React 的 useState。
 *
 * 状态更新在 eff 执行时同步进行，fn 接收包含 context 和 state 的对象，
 * 返回包含新 state 和 result 的对象。
 *
 * @template Context - 上下文类型
 * @template Result - 结果类型
 * @template State - 状态类型
 * @param initial - 初始状态
 * @param fn - Eff 函数，接收包含 context 和 state 的对象，返回包含新 state 和 result 的对象
 * @returns 带状态的 Eff
 *
 * @example
 * ```typescript
 * // 统计调用次数
 * const handler = (dispatch) => stateful(
 *   0,
 *   ({ context, state }) => ({
 *     state: state + 1,
 *     result: void console.log(`第 ${state + 1} 次调用`),
 *   })
 * );
 *
 * // 累积数据并批量处理
 * const batchHandler = (dispatch) => stateful(
 *   [],
 *   ({ context, state }) => {
 *     const newBuffer = [...state, context];
 *     if (newBuffer.length >= 10) {
 *       queueMicrotask(() => flush(newBuffer));
 *       return { state: [], result: undefined };
 *     }
 *     return { state: newBuffer, result: undefined };
 *   }
 * );
 * ```
 */
export function stateful<Context, Result, State>(
  initial: State,
  fn: Eff<{ context: Context; state: State }, { state: State; result: Result }>
): Eff<Context, Result> {
  let state = initial;

  return (context: Context) => {
    const { state: newState, result } = fn({ context, state });
    state = newState;
    return result;
  };
}
