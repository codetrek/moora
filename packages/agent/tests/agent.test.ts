/**
 * Agent 测试
 */

import { describe, test, expect } from "vitest";
import { createAgent, createReaction } from "../src/index";
import type { ReactionFns } from "../src/index";

// 创建一个简单的 mock reactionFns
const mockReactionFns: ReactionFns = {
  user: () => { },
  llm: () => { },
  toolkit: () => { },
};

// 使用 createReaction 创建 AgentReaction
const mockReaction = createReaction(mockReactionFns);

describe("Agent", () => {
  test("should create agent instance", () => {
    const agent = createAgent(mockReaction);
    expect(agent).toBeDefined();
    expect(agent.dispatch).toBeDefined();
    expect(agent.subscribe).toBeDefined();
    expect(agent.current).toBeDefined();
  });

  test("should have initial state", () => {
    const agent = createAgent(mockReaction);
    const state = agent.current();

    expect(state.userMessages).toEqual([]);
    expect(state.assiMessages).toEqual([]);
    expect(state.cutOff).toBe(0);
  });

  test("should dispatch user message and update state", async () => {
    const agent = createAgent(mockReaction);
    const timestamp = Date.now();

    agent.dispatch({
      type: "send-user-message",
      id: "test-id-1",
      content: "Hello",
      timestamp,
    });

    // dispatch 是异步的，需要等�?
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    const state = agent.current();
    expect(state.userMessages).toHaveLength(1);
    expect(state.userMessages[0]?.content).toBe("Hello");
    expect(state.userMessages[0]?.role).toBe("user");
  });

  test("should dispatch start stream and update state", async () => {
    const agent = createAgent(mockReaction);
    const timestamp = Date.now();
    const cutOff = timestamp - 100;

    agent.dispatch({
      type: "start-assi-message-stream",
      id: "test-id-2",
      timestamp,
      cutOff,
    });

    // dispatch 是异步的，需要等待
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    const state = agent.current();
    expect(state.assiMessages).toHaveLength(1);
    expect(state.assiMessages[0]?.id).toBe("test-id-2");
    expect(state.assiMessages[0]?.role).toBe("assistant");
    expect(state.assiMessages[0]?.streaming).toBe(true);
    expect(state.cutOff).toBe(cutOff);
  });

  test("should dispatch end stream and update state", async () => {
    const agent = createAgent(mockReaction);
    const timestamp = Date.now();
    const messageId = "test-id-3";
    const cutOff = timestamp - 100;

    // 先开始流式生�?
    agent.dispatch({
      type: "start-assi-message-stream",
      id: messageId,
      timestamp,
      cutOff,
    });

    // dispatch 是异步的，需要等�?
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    // 然后结束流式生成（timestamp 不会被使用，会保�?start stream 的时间戳�?
    agent.dispatch({
      type: "end-assi-message-stream",
      id: messageId,
      content: "Hi there!",
      timestamp: timestamp + 100, // 这个值不会被使用
    });

    // dispatch 是异步的，需要等�?
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    const state = agent.current();
    expect(state.assiMessages).toHaveLength(1);
    expect(state.assiMessages[0]?.id).toBe(messageId);
    expect(state.assiMessages[0]?.role).toBe("assistant");
    expect(state.assiMessages[0]?.streaming).toBe(false);
    if (state.assiMessages[0]?.streaming === false) {
      expect(state.assiMessages[0].content).toBe("Hi there!");
      // 验证时间戳是 start stream 的时间戳，而不�?end stream 的时间戳
      expect(state.assiMessages[0].timestamp).toBe(timestamp);
    }
    expect(state.cutOff).toBe(cutOff);
  });

  test("should subscribe to state changes", async () => {
    const agent = createAgent(mockReaction);
    let updateReceived = false;

    agent.subscribe((update) => {
      updateReceived = true;
      // Mock effect
    });

    // subscribe 时同步执行，应该立即收到初始状态输出
    expect(updateReceived).toBe(true);
  });
});
