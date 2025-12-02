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
  transitionAgentAgent,
  transitionToolkitToolkit,
} from "../transition";
import {
  stateForUserAgent,
  stateForAgentToolkit,
  stateForToolkitAgent,
  stateForAgentUser,
  stateForAgentAgent,
  stateForToolkitToolkit,
} from "./state-for-channel";

/**
 * 统合的 transition 函数
 * 
 * 实现逻辑：
 * - 根据 signal 的类型和来源，确定需要更新的 Channel
 * - 使用对应的 stateForXxxYyy 函数从统合 State 提取 Channel State
 * - 调用对应的 Channel transition 函数
 * - 使用 mutative 的 create() 进行不可变更新，更新统合 State 中对应的字段
 * - 返回更新后的统合 State
 * 
 * 注意：Moorex 的 Transition 类型是 (input) => (state) => State
 */
export function transition(signal: Signal): (state: State) => State {
  return (state: State): State => {
    // 来自 User 的 Output
    if (signal.type === "sendMessage" || signal.type === "cancelStreaming") {
      const userOutput = signal as OutputFromUser;
      const userAgentState = stateForUserAgent(state);
      
      const newUserAgentState = transitionUserAgent(userOutput, userAgentState);
      
      return create(state, (draft) => {
        draft.userMessages = newUserAgentState.userMessages;
        draft.canceledStreamingMessageIds = newUserAgentState.canceledStreamingMessageIds;
      });
    }

    // 来自 Agent 的 Output
    if (
      signal.type === "callTool" ||
      signal.type === "sendChunk" ||
      signal.type === "completeMessage"
    ) {
      const agentOutput = signal as OutputFromAgent;
      const agentAgentState = stateForAgentAgent(state);
      const newAgentAgentState = transitionAgentAgent(agentOutput, agentAgentState);
      
      return create(state, (draft) => {
        if (agentOutput.type === "callTool") {
          const agentToolkitState = stateForAgentToolkit(state);
          const newAgentToolkitState = transitionAgentToolkit(
            agentOutput,
            agentToolkitState
          );
          draft.pendingToolCalls = newAgentToolkitState.pendingToolCalls;
        } else {
          const agentUserState = stateForAgentUser(state);
          const newAgentUserState = transitionAgentUser(agentOutput, agentUserState);
          draft.messages = newAgentUserState.messages;
          draft.streamingChunks = newAgentUserState.streamingChunks;
        }
        draft.processingHistory = newAgentAgentState.processingHistory;
      });
    }

    // 来自 Toolkit 的 Output
    if (signal.type === "toolResult" || signal.type === "toolError") {
      const toolkitOutput = signal as OutputFromToolkit;
      const toolkitAgentState = stateForToolkitAgent(state);
      const toolkitToolkitState = stateForToolkitToolkit(state);
      
      const newToolkitAgentState = transitionToolkitAgent(
        toolkitOutput,
        toolkitAgentState
      );
      const newToolkitToolkitState = transitionToolkitToolkit(
        toolkitOutput,
        toolkitToolkitState
      );
      
      return create(state, (draft) => {
        draft.toolResults = newToolkitAgentState.toolResults;
        draft.executionHistory = newToolkitToolkitState.executionHistory;
      });
    }

    return state;
  };
}

