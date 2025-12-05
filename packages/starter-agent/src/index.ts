/**
 * @moora/starter-agent
 *
 * 最小 Agent 实现，基于 Automata 和迭代式建模方法论
 */

import { moore } from "@moora/automata";
import type { StatefulTransferer } from "@moora/automata";
import { initialAgent, transitionAgent, outputAgent } from "./impl/agent";
import type { AgentState, AgentInput } from "./decl/agent";

// ============================================================================
// 导出类型
// ============================================================================
export type {
  AgentState,
  AgentInput,
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
export { initialAgent, transitionAgent, outputAgent } from "./impl/agent";

/**
 * 创建 Starter Agent 实例
 *
 * 返回一个基于 Automata 的 Moore 自动机实例。
 *
 * @returns Starter Agent 自动机实例
 *
 * @example
 * ```typescript
 * import { createStarterAgent } from '@moora/starter-agent';
 *
 * const agent = createStarterAgent();
 *
 * // 订阅状态变化
 * agent.subscribe((event) => {
 *   console.log('Event:', event);
 * });
 *
 * // Dispatch 用户消息
 * agent.dispatch({
 *   type: 'send-user-message',
 *   content: 'Hello',
 *   timestamp: Date.now(),
 * });
 *
 * // 获取当前状态
 * const state = agent.current();
 *
 * // 执行 output 函数返回的副作用
 * const outputFn = agent.output(agent.current());
 * const asyncSideEffect = outputFn();
 * asyncSideEffect(agent.dispatch);
 * ```
 */
export function createStarterAgent(): StatefulTransferer<
  AgentInput,
  ReturnType<typeof outputAgent>,
  AgentState
> {
  return moore({
    initial: initialAgent,
    transition: transitionAgent,
    output: outputAgent,
  });
}
