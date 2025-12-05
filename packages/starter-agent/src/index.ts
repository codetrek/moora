/**
 * @moora/starter-agent
 *
 * 最小 Agent 实现，基于 Automata 和迭代式建模方法论
 */

import type { AgentState, AgentInput } from "./decl/agent";

// ============================================================================
// 导出类型
// ============================================================================
export type {
  AgentState,
  AgentInput,
  OutputFns,
  Actors,
  StateOfUser,
  StateOfLlm,
  ContextOfUser,
  ContextOfLlm,
  InputFromUser,
  InputFromLlm,
  SendUserMessage,
  SendAssiMessage,
  UserMessage,
  AssiMessage,
  BaseMessage,
} from "./decl";

// ============================================================================
// 导出函数
// ============================================================================
export {
  initialAgent,
  transitionAgent,
  createOutputAgent,
  createAgent,
} from "./impl/agent";

// Re-export output functions for convenience (users can also define their own)
export { outputUser, outputLlm } from "./impl/output";
