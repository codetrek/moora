/**
 * Llm Actor 的 Output 函数实现
 *
 * Output 采用两阶段副作用定义：
 * - 第一阶段（同步）：可以调整 Actor 的内部状态，但不能 Dispatch 新的 Input
 * - 第二阶段（异步）：可以异步 dispatch 新的 Input，迭代自动机状态
 */

import type { ContextOfLlm } from "../../decl/contexts";
import type { InputFromLlm } from "../../decl/inputs";
import type { Output } from "../../decl/agent";

/**
 * Llm Actor 的 Output 函数
 *
 * 根据 Llm 的 Context 决定要触发的副作用。
 * 当前为 Mock 实现，实际使用时需要根据需求补充逻辑。
 *
 * @param context - Llm 的当前上下文
 * @returns 两阶段副作用函数
 */
export function outputLlm(context: ContextOfLlm): Output<InputFromLlm> {
  // TODO: 在这里补充实际的输出逻辑
  // 例如：
  // - 根据 context.userMessages 判断是否有新的用户消息需要处理
  // - 如果有新消息，调用 LLM API 生成回复
  // - 生成回复后，dispatch SendAssiMessage Input
  // - 等等

  return () => {
    // 第一阶段：同步执行
    // 可以在这里进行同步操作，如日志记录、状态调整等
    console.log("[Llm Output] Context:", context);

    // 检查是否有新的用户消息需要处理
    const hasNewUserMessages = context.userMessages.length > 0;

    // 返回第二阶段：异步副作用函数（Procedure）
    return (dispatch) => {
      // 第二阶段：异步执行
      // TODO: 在这里补充实际的异步副作用逻辑
      // 例如：
      // - 调用 LLM API 生成回复
      // - 处理流式响应
      // - dispatch SendAssiMessage Input 来更新状态
      // - 等等

      if (hasNewUserMessages) {
        console.log("[Llm Output] Mock: Would call LLM API here");
        // Mock: 模拟生成回复
        // 实际实现应该是：
        // const response = await callLLMAPI(context.userMessages);
        // dispatch({
        //   type: 'send-assi-message',
        //   content: response.content,
        //   timestamp: Date.now(),
        // });
      } else {
        console.log("[Llm Output] Mock async effect executed (no new messages)");
      }
    };
  };
}
