// ============================================================================
// Frontend Controller - 前端控制器实现
// ============================================================================

import type {
  AgentController,
  AgentAppState,
  AgentAppEvent,
} from "@moora/agent-webui-protocol";
import type { AgentState, AgentInput, CreateAgentControllerOptions } from "../types";
import { createPubSub } from "@moora/moorex";
import { createSSEConnection, sendInputToServer } from "./helpers";
import { mapAppState, interpretAppEvent } from "./mappers";

/**
 * 创建 Agent Controller
 * 
 * @param options - 创建选项
 * @returns Agent Controller 实例
 * 
 * @example
 * ```typescript
 * const controller = createAgentController({
 *   endpoint: 'http://localhost:3000/api/agent',
 * });
 * 
 * controller.subscribe((state) => {
 *   console.log('State updated:', state);
 * });
 * 
 * controller.notify({
 *   type: 'user-message',
 *   content: 'Hello, Agent!',
 * });
 * ```
 */
export const createAgentController = (
  options: CreateAgentControllerOptions
): AgentController => {
  const {
    endpoint,
    generateRequestId = () => `req-${Date.now()}-${Math.random()}`,
  } = options;

  // 当前状态
  let currentState: AgentAppState = {
    status: "idle",
    messages: [],
    isProcessing: false,
  };

  // 当前请求 ID（用于 cancel 操作）
  let currentRequestId: string | undefined;

  // 状态发布订阅系统
  const statePubSub = createPubSub<AgentAppState>();

  // 处理状态更新
  const handleStateUpdate = (agentState: AgentState) => {
    currentState = mapAppState(agentState);
    // 更新当前请求 ID
    if (agentState.currentRequestId) {
      currentRequestId = agentState.currentRequestId;
    }
    statePubSub.pub(currentState);
  };

  // 创建 SSE 连接
  const sseConnection = createSSEConnection(endpoint, handleStateUpdate);

  // 初始连接
  sseConnection.connect();

  // 处理错误
  const handleError = (error: string) => {
    currentState = {
      ...currentState,
      status: "error",
      error,
    };
    statePubSub.pub(currentState);
  };

  return {
    subscribe: (handler) => {
      // 立即发送当前状态
      handler(currentState);

      // 订阅后续更新
      return statePubSub.sub(handler);
    },

    notify: (event) => {
      const inputs = interpretAppEvent(event);

      // 处理 cancel 事件，需要填充 requestId
      if (event.type === "cancel") {
        if (currentRequestId) {
          inputs[0] = {
            type: "cancel",
            requestId: currentRequestId,
          };
        } else {
          // 没有正在进行的请求，忽略
          return;
        }
      }

      // 处理 user-message，记录 requestId
      if (event.type === "user-message") {
        const requestId = generateRequestId();
        currentRequestId = requestId;
        inputs[0] = {
          type: "user-message",
          requestId,
          content: event.content,
        };
      }

      // 发送输入
      sendInputToServer(endpoint, inputs, handleError);
    },
  };
};

