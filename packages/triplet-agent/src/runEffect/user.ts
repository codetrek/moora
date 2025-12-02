// ============================================================================
// User 节点的 makeRunEffectForUser 函数
// ============================================================================

import type { Dispatch, EffectController } from "@moora/moorex";
import type {
  EffectOfUser,
  MakeRunEffectForUserOptions,
  StateForUser,
} from "../types/effects";
import type { OutputFromUser } from "../types/signal";

/**
 * User 节点的 makeRunEffectForUser 函数
 * 
 * 柯里化函数，接收 options，返回符合 MoorexDefinition 要求的 runEffect 函数。
 * 
 * @param options - 包含所有需要注入的依赖
 * @returns 符合 MoorexDefinition 要求的 runEffect 函数
 */
export function makeRunEffectForUser(
  options: MakeRunEffectForUserOptions
): (
  effect: EffectOfUser,
  state: StateForUser,
  key: string
) => EffectController<OutputFromUser> {
  return (
    effect: EffectOfUser,
    state: StateForUser,
    key: string
  ): EffectController<OutputFromUser> => {
    return {
      start: async (dispatch: Dispatch<OutputFromUser>) => {
        // 调用 UI render callback，传递 state 和 dispatch
        options.updateUI(state.agentUser, dispatch);
      },
      cancel: () => {
        // 清理 UI 资源（如果需要）
      },
    };
  };
}

