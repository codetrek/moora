// ============================================================================
// API - 与 Agent 服务端通信的 API
// ============================================================================

import type { AgentState, AgentInput } from "@moora/agent-core-state-machine";

/**
 * SSE 连接管理器
 * @internal
 */
export type SSEConnection = {
  connect: () => void;
  close: () => void;
};

/**
 * 创建 SSE 连接管理器
 *
 * 使用标准的 EventSource API 实现 SSE 连接。
 *
 * @param endpoint - SSE endpoint URL
 * @param onStateUpdate - 状态更新回调函数
 * @returns SSE 连接管理器
 *
 * @internal
 */
export function createSSEConnection(
  endpoint: string,
  onStateUpdate: (state: AgentState) => void
): SSEConnection {
  let eventSource: EventSource | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (eventSource) {
      eventSource.close();
    }

    // EventSource 构造函数接受 URL 参数
    eventSource = new EventSource(endpoint);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 处理 state-updated 事件
        if (data.type === "state-updated" && data.state) {
          const agentState: AgentState = data.state;
          onStateUpdate(agentState);
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
      }
    };

    eventSource.onerror = () => {
      // 尝试重连
      // EventSource.readyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
      if (eventSource?.readyState === 2) {
        reconnectTimeout = setTimeout(() => {
          connect();
        }, 1000);
      }
    };
  };

  const close = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };

  return {
    connect,
    close,
  };
}

/**
 * 发送输入到服务端
 *
 * @param endpoint - API endpoint URL
 * @param inputs - Agent 输入信号数组
 * @param onError - 错误处理回调函数
 *
 * @internal
 */
export async function sendInputToServer(
  endpoint: string,
  inputs: AgentInput[],
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inputs),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending input:", error);
    onError(errorMessage);
  }
}

