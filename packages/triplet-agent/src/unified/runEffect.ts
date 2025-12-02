// ============================================================================
// makeRunEffect 函数（统合所有 runEffect）
// ============================================================================

import type { Dispatch, EffectController } from "@moora/moorex";
import type { Effect, Signal, State } from "../types/unified";
import type {
  EffectOfUser,
  EffectOfAgent,
  EffectOfToolkit,
} from "../types/effects";
import type { MakeRunEffectOptions } from "../types/unified";
import {
  runEffectForUser,
  runEffectForAgent,
  runEffectForToolkit,
} from "../runEffect";

/**
 * makeRunEffect 函数
 * 
 * 柯里化函数，接收 options，返回符合 MoorexDefinition 要求的 runEffect 函数。
 * 根据 Effect 的类型，调用对应的 runEffect。
 * 统合所有节点的 runEffect 函数。
 * 
 * @param options - 包含所有需要注入的依赖
 * @returns 符合 MoorexDefinition 要求的 runEffect 函数
 */
export function makeRunEffect(
  options: MakeRunEffectOptions
): (effect: Effect, state: State, key: string) => EffectController<Signal> {
  return (
    effect: Effect,
    state: State,
    key: string
  ): EffectController<Signal> => {
    if (effect.kind === "updateUI") {
      // 返回包装的 EffectController，start 方法接收 dispatch
      const userController = runEffectForUser(
        effect as EffectOfUser,
        state.agentUser,
        (signal) => {
          // 这个 dispatch 会在 start 中提供
          throw new Error("Dispatch should be provided in start method");
        },
        options.updateUI
      );

      return {
        start: async (dispatch: Dispatch<Signal>) => {
          // 重新创建 controller，传入实际的 dispatch
          const controller = runEffectForUser(
            effect as EffectOfUser,
            state.agentUser,
            dispatch,
            options.updateUI
          );
          await controller.start(dispatch);
        },
        cancel: userController.cancel,
      };
    }

    if (effect.kind === "callLLM") {
      const agentController = runEffectForAgent(
        effect as EffectOfAgent,
        state.userAgent,
        state.toolkitAgent,
        (signal) => {
          throw new Error("Dispatch should be provided in start method");
        },
        options.callLLM,
        options.prompt,
        options.getToolNames,
        options.getToolDefinitions
      );

      return {
        start: async (dispatch: Dispatch<Signal>) => {
          const controller = runEffectForAgent(
            effect as EffectOfAgent,
            state.userAgent,
            state.toolkitAgent,
            dispatch,
            options.callLLM,
            options.prompt,
            options.getToolNames,
            options.getToolDefinitions
          );
          await controller.start(dispatch);
        },
        cancel: agentController.cancel,
      };
    }

    if (effect.kind === "executeTool") {
      const toolkitController = runEffectForToolkit(
        effect as EffectOfToolkit,
        state.agentToolkit,
        (signal) => {
          throw new Error("Dispatch should be provided in start method");
        },
        options.getToolNames,
        options.getToolDefinitions
      );

      return {
        start: async (dispatch: Dispatch<Signal>) => {
          const controller = runEffectForToolkit(
            effect as EffectOfToolkit,
            state.agentToolkit,
            dispatch,
            options.getToolNames,
            options.getToolDefinitions
          );
          await controller.start(dispatch);
        },
        cancel: toolkitController.cancel,
      };
    }

    throw new Error(`Unknown effect kind: ${(effect as Effect).kind}`);
  };
}

