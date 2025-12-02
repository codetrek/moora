// ============================================================================
// User 节点的 runEffect 函数
// ============================================================================

import type { Dispatch, EffectController } from "@moora/moorex";
import type { EffectOfUser } from "../types/effects";
import type { StateAgentUser } from "../types/state";
import type { OutputFromUser } from "../types/signal";
import type { UpdateUIFn } from "../types/effects";

/**
 * User 节点的 runEffect 函数
 * 
 * 执行副作用，调用 UI render callback，传递 State 和 dispatch 方法。
 * 
 * @param effect - Effect 实例（极简，只包含必要信息）
 * @param stateAgentUser - Channel AGENT -> USER 的 State（包含完整的 UI 状态）
 * @param dispatch - Dispatch 函数，用于发送 OutputFromUser
 * @param updateUI - 注入的更新 UI 回调函数
 */
export function runEffectForUser(
  effect: EffectOfUser,
  stateAgentUser: StateAgentUser,
  dispatch: Dispatch<OutputFromUser>,
  updateUI: UpdateUIFn
): EffectController<OutputFromUser> {
  return {
    start: async () => {
      // 调用 UI render callback，传递 state 和 dispatch
      updateUI(stateAgentUser, dispatch);
    },
    cancel: () => {
      // 清理 UI 资源（如果需要）
    },
  };
}

