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
 * 状态在多次调用之间保持，类似于 React 的 useState + useEffect。
 *
 * ## 核心行为（类似 React）
 *
 * **Effect 会在以下情况重新执行：**
 * 1. **Context 变化** - 外部调用 effect 时传入新的 context
 * 2. **State 变化** - 调用 `setState` 更新状态后，会自动触发 effect 重新执行
 *
 * 这与 React 的模式类似：
 * - Context 相当于 React 组件的 props
 * - State 相当于 React 的 useState
 * - Effect 函数相当于 React 的 render + useEffect
 *
 * **重要：setState 会触发 effect 重新执行！**
 * 当你调用 `setState` 时，如果状态确实发生了变化（通过 `!==` 比较），
 * 会通过 `queueMicrotask` 异步触发 effect 函数再次执行。
 * 这意味着你需要在 effect 函数中正确处理条件判断，避免无限循环。
 *
 * ## 状态更新
 *
 * `setState` 只支持 updater 函数形式：`setState((prevState) => newState)`
 * 这种方式确保状态更新总是基于最新的状态值，即使是在异步副作用中调用也能正确工作。
 *
 * @template Context - 上下文类型
 * @template State - 状态类型
 * @param initial - 初始状态
 * @param fn - Eff 函数，接收包含 context、state 和 setState 的对象
 * @returns 带状态的 Eff
 *
 * @example
 * ```typescript
 * // ⚠️ 注意：必须有条件判断，否则会无限循环！
 * const handler = stateful(
 *   { lastValue: null },
 *   ({ context, state, setState }) => {
 *     // ✅ 正确：只在值改变时更新状态
 *     if (context.value !== state.lastValue) {
 *       console.log(`值从 ${state.lastValue} 变为 ${context.value}`);
 *       setState(() => ({ lastValue: context.value }));
 *       // setState 后，effect 会再次执行，但由于条件不满足，不会再次更新
 *     }
 *   }
 * );
 *
 * // ❌ 错误：无条件调用 setState 会导致无限循环
 * const badHandler = stateful(
 *   { count: 0 },
 *   ({ state, setState }) => {
 *     // 每次 effect 执行都会调用 setState
 *     // setState 又会触发 effect 执行 -> 无限循环！
 *     setState((prev) => ({ count: prev.count + 1 }));
 *   }
 * );
 *
 * // ✅ 正确：在异步回调中使用 setState
 * const asyncHandler = stateful(
 *   { loading: false, data: null },
 *   ({ context, state, setState }) => {
 *     // 只在未加载时开始加载
 *     if (!state.loading && !state.data) {
 *       setState((prev) => ({ ...prev, loading: true }));
 *       // setState 触发 effect 重新执行，但 loading 已为 true，不会再次进入
 *       
 *       queueMicrotask(async () => {
 *         const data = await fetchData(context.url);
 *         setState((prev) => ({ loading: false, data }));
 *       });
 *     }
 *   }
 * );
 * ```
 */
export function stateful<Context, State>(
  initial: State,
  fn: (params: { context: Context; state: State; setState: (updater: (prevState: State) => State) => void }) => void
): Eff<Context> {
  let state = initial;
  let contextRef: Context;

  return (context: Context) => {
    // 每次调用时更新 contextRef，确保 setState 回调使用最新的 context
    contextRef = context;
    
    const setState = (updater: (prevState: State) => State) => {
      const prevState = state;
      state = updater(state);
      if (state !== prevState) {
        queueMicrotask(() => {
          // 使用 contextRef 而不是闭包捕获的 context
          fn({ context: contextRef, state, setState });
        });
      }
    };
    fn({ context, state, setState });
  };
}
