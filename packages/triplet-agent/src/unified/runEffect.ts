// ============================================================================
// makeRunEffect 函数（统合所有 runEffect）
// ============================================================================

import type { EffectController } from "@moora/moorex";
import type { Effect, Signal, State } from "../types/unified";
import type {
  EffectOfUser,
  EffectOfAgent,
  EffectOfToolkit,
  StateForUser,
  StateForAgent,
  StateForToolkit,
} from "../types/effects";
import type { MakeRunEffectOptions } from "../types/unified";
import {
  makeRunEffectForUser,
  makeRunEffectForAgent,
  makeRunEffectForToolkit,
} from "../runEffect";
import {
  stateForAgentUser,
  stateForUserAgent,
  stateForToolkitAgent,
  stateForAgentAgent,
  stateForAgentToolkit,
  stateForToolkitToolkit,
} from "./state-for-channel";

/**
 * makeRunEffect 函数
 * 
 * 柯里化函数，接收 options，返回符合 MoorexDefinition 要求的 runEffect 函数。
 * 根据 Effect 的类型，调用对应的 makeRunEffectForXxx 函数。
 * 统合所有节点的 runEffect 函数。
 * 
 * @param options - 包含所有需要注入的依赖
 * @returns 符合 MoorexDefinition 要求的 runEffect 函数
 */
export function makeRunEffect(
  options: MakeRunEffectOptions
): (effect: Effect, state: State, key: string) => EffectController<Signal> {
  // 为每个 Participant 创建对应的 makeRunEffectForXxx 函数实例
  const runEffectForUser = makeRunEffectForUser({
    updateUI: options.updateUI,
  });

  const runEffectForAgent = makeRunEffectForAgent({
    callLLM: options.callLLM,
    prompt: options.prompt,
    getToolNames: options.getToolNames,
    getToolDefinitions: options.getToolDefinitions,
  });

  const runEffectForToolkit = makeRunEffectForToolkit({
    getToolNames: options.getToolNames,
    getToolDefinitions: options.getToolDefinitions,
  });

  return (effect: Effect, state: State, key: string): EffectController<Signal> => {
    if (effect.kind === "updateUI") {
      // 使用 stateForXxxYyy 函数从统合 State 提取 StateForUser
      const stateForUser: StateForUser = {
        agentUser: stateForAgentUser(state),
      };
      // 调用 makeRunEffectForUser 返回的函数
      return runEffectForUser(effect as EffectOfUser, stateForUser, key);
    }

    if (effect.kind === "callLLM") {
      // 使用 stateForXxxYyy 函数从统合 State 提取 StateForAgent
      const stateForAgent: StateForAgent = {
        userAgent: stateForUserAgent(state),
        toolkitAgent: stateForToolkitAgent(state),
        agentAgent: stateForAgentAgent(state),
        agentToolkit: stateForAgentToolkit(state),
      };
      // 调用 makeRunEffectForAgent 返回的函数
      return runEffectForAgent(effect as EffectOfAgent, stateForAgent, key);
    }

    if (effect.kind === "executeTool") {
      // 使用 stateForXxxYyy 函数从统合 State 提取 StateForToolkit
      const stateForToolkit: StateForToolkit = {
        agentToolkit: stateForAgentToolkit(state),
        toolkitToolkit: stateForToolkitToolkit(state),
      };
      // 调用 makeRunEffectForToolkit 返回的函数
      return runEffectForToolkit(effect as EffectOfToolkit, stateForToolkit, key);
    }

    throw new Error(`Unknown effect kind: ${(effect as Effect).kind}`);
  };
}

