/**
 * Toolkit Actor 的 Transition 函数实现
 */

import type { ActionFromToolkit, ReceiveToolResult } from "@/decl/actions";
import type { AppearanceOfToolkit } from "@/decl/appearances";

/**
 * Toolkit Actor 的状态转换函数
 *
 * 根据 Action 更新 Toolkit 的状态。
 * 这是一个纯函数，不产生副作用。
 *
 * @param action - Toolkit 的输入动作
 * @returns 状态转换函数
 */
export function transitionToolkit(
  action: ActionFromToolkit
): (appearance: AppearanceOfToolkit) => AppearanceOfToolkit {
  return (appearance: AppearanceOfToolkit) => {
    if (action.type === "receive-tool-result") {
      return transitionToolkitReceiveResult(action)(appearance);
    }
    return appearance;
  };
}

/**
 * 处理工具执行结果的转换
 */
function transitionToolkitReceiveResult(
  action: ReceiveToolResult
): (appearance: AppearanceOfToolkit) => AppearanceOfToolkit {
  return (appearance: AppearanceOfToolkit) => {
    return {
      ...appearance,
      toolResults: [
        ...appearance.toolResults,
        {
          toolCallId: action.toolCallId,
          result: action.result,
          timestamp: action.timestamp,
        },
      ],
    };
  };
}
