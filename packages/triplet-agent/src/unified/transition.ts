// ============================================================================
// transition 函数（统合所有 transition）
// ============================================================================

import { create } from "mutative";
import type { Signal, State } from "../types/unified";
import type { OutputFromUser, OutputFromAgent, OutputFromToolkit } from "../types/signal";
import {
  transitionUserAgent,
  transitionAgentToolkit,
  transitionToolkitAgent,
  transitionAgentUser,
  transitionUserUser,
  transitionAgentAgent,
  transitionToolkitToolkit,
} from "../transition";

/**
 * transition 函数
 * 
 * 根据 Signal 的来源，更新对应的 Channel State。
 * 统合所有 Channel 的 transition 函数。
 * 
 * 注意：Moorex 的 Transition 类型是 (input) => (state) => State
 */
export function transition(signal: Signal): (state: State) => State {
  return (state: State): State => {
    // 来自 User 的 Output
    if (signal.type === "sendMessage" || signal.type === "cancelStreaming") {
      const userOutput = signal as OutputFromUser;
      return create(state, (draft) => {
        // 更新 USER -> AGENT Channel State
        draft.userAgent = transitionUserAgent(userOutput, state.userAgent);
        // 更新 USER -> USER (Loopback) Channel State
        draft.userUser = transitionUserUser(userOutput, state.userUser);
      });
    }

    // 来自 Agent 的 Output
    if (
      signal.type === "callTool" ||
      signal.type === "sendChunk" ||
      signal.type === "completeMessage"
    ) {
      const agentOutput = signal as OutputFromAgent;
      return create(state, (draft) => {
        if (agentOutput.type === "callTool") {
          // 更新 AGENT -> TOOLKIT Channel State
          draft.agentToolkit = transitionAgentToolkit(
            agentOutput,
            state.agentToolkit
          );
        } else {
          // 更新 AGENT -> USER Channel State
          draft.agentUser = transitionAgentUser(agentOutput, state.agentUser);
        }
        // 更新 AGENT -> AGENT (Loopback) Channel State
        draft.agentAgent = transitionAgentAgent(agentOutput, state.agentAgent);
      });
    }

    // 来自 Toolkit 的 Output
    if (signal.type === "toolResult" || signal.type === "toolError") {
      const toolkitOutput = signal as OutputFromToolkit;
      return create(state, (draft) => {
        // 更新 TOOLKIT -> AGENT Channel State
        draft.toolkitAgent = transitionToolkitAgent(
          toolkitOutput,
          state.toolkitAgent
        );
        // 更新 TOOLKIT -> TOOLKIT (Loopback) Channel State
        draft.toolkitToolkit = transitionToolkitToolkit(
          toolkitOutput,
          state.toolkitToolkit
        );
      });
    }

    return state;
  };
}

