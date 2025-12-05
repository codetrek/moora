/**
 * User Actor 的 Output 函数实现
 *
 * Output 采用两阶段副作用定义：
 * - 第一阶段（同步）：可以调整 Actor 的内部状态，但不能 Dispatch 新的 Input
 * - 第二阶段（异步）：可以异步 dispatch 新的 Input，迭代自动机状态
 *
 * **重要：output 函数本身是纯函数，只返回副作用函数，不执行任何副作用。**
 * 所有副作用（如日志记录、API 调用、dispatch 等）都应该在返回的函数中执行。
 */

import type { ContextOfUser } from "../../decl/contexts";
import type { InputFromUser } from "../../decl/inputs";
import type { Output } from "../../decl/agent";

/**
 * User Actor 的 Output 函数
 *
 * **纯函数**：根据 User 的 Context 决定要触发的副作用，返回副作用函数。
 * 函数本身不执行任何副作用，所有副作用都在返回的函数中执行。
 *
 * 当前为 Mock 实现，实际使用时需要根据需求补充逻辑。
 *
 * @param context - User 的当前上下文
 * @returns 两阶段副作用函数
 */
export function outputUser(
  context: ContextOfUser
): Output<InputFromUser> {
  // 纯函数：只根据 context 计算并返回副作用函数，不执行任何副作用
  // TODO: 在这里补充实际的输出逻辑
  // 例如：
  // - 根据 context 判断是否需要更新 UI
  // - 根据 context 判断是否需要触发其他副作用
  // - 等等

  return () => {
    // 第一阶段：同步执行
    // 可以在这里进行同步操作，如日志记录、状态调整等
    console.log("[User Output] Context:", context);

    // 返回第二阶段：异步副作用函数（Procedure）
    return (dispatch) => {
      // 第二阶段：异步执行
      // 可以在这里 dispatch 新的 Input，驱动自动机状态变化
      // TODO: 在这里补充实际的异步副作用逻辑
      // 例如：
      // - 调用外部 API
      // - 更新 UI
      // - 触发其他 Actor 的 Input
      // - 等等

      console.log("[User Output] Mock async effect executed");
      // Mock: 不实际 dispatch 任何 Input
    };
  };
}
