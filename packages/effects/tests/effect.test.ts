import { describe, expect, test } from "vitest";
import { stateful } from "../src/effect";

const nextTick = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe("stateful", () => {
  test("创建带状态的 Eff，初始状态正确", () => {
    const calls: Array<{ context: number; state: number }> = [];

    const handler = stateful<number, number>(0, ({ context, state }) => {
      calls.push({ context, state });
    });

    handler(10);

    expect(calls).toHaveLength(1);
    expect(calls[0]!).toEqual({ context: 10, state: 0 });
  });

  test("Context 变化时 effect 重新执行", () => {
    const calls: Array<{ context: number; state: number }> = [];

    const handler = stateful<number, number>(0, ({ context, state }) => {
      calls.push({ context, state });
    });

    handler(10);
    handler(20);
    handler(30);

    expect(calls).toHaveLength(3);
    expect(calls[0]!).toEqual({ context: 10, state: 0 });
    expect(calls[1]!).toEqual({ context: 20, state: 0 });
    expect(calls[2]!).toEqual({ context: 30, state: 0 });
  });

  test("setState 更新状态后，effect 异步重新执行", async () => {
    const calls: Array<{ context: number; state: number }> = [];

    const handler = stateful<number, number>(0, ({ context, state, setState }) => {
      calls.push({ context, state });
      // 只在 state === 0 时更新一次，避免无限循环
      if (state === 0) {
        setState(() => 1);
      }
    });

    handler(10);

    // 第一次同步执行
    expect(calls).toHaveLength(1);
    expect(calls[0]!).toEqual({ context: 10, state: 0 });

    // 等待 setState 触发的异步重新执行
    await nextTick();
    expect(calls).toHaveLength(2);
    expect(calls[1]!).toEqual({ context: 10, state: 1 });

    // 由于 state !== 0，不会再次调用 setState
    await nextTick();
    expect(calls).toHaveLength(2); // 仍然是 2 次
  });

  test("setState 只在状态真正变化时触发重新执行", async () => {
    const calls: Array<{ context: number; state: number }> = [];

    const handler = stateful<number, number>(0, ({ context, state, setState }) => {
      calls.push({ context, state });
      // 只在 state === 0 时更新状态
      if (state === 0) {
        setState(() => 1);
      } else {
        // state !== 0 时，尝试设置相同的值，不应该触发重新执行
        setState(() => state);
      }
    });

    handler(10);

    // 第一次同步执行
    expect(calls).toHaveLength(1);
    expect(calls[0]!).toEqual({ context: 10, state: 0 });

    // 等待 setState(1) 触发的异步重新执行
    await nextTick();
    expect(calls).toHaveLength(2);
    expect(calls[1]!).toEqual({ context: 10, state: 1 });

    // setState(() => state) 不会触发重新执行，因为没有状态变化
    await nextTick();
    expect(calls).toHaveLength(2); // 仍然是 2 次
  });

  test("setState updater 函数正确接收 prevState", async () => {
    const calls: Array<{ context: number; state: number }> = [];
    const updaterCalls: number[] = [];

    const handler = stateful<number, number>(0, ({ context, state, setState }) => {
      calls.push({ context, state });
      if (state < 3) {
        setState((prevState) => {
          updaterCalls.push(prevState);
          return prevState + 1;
        });
      }
    });

    handler(10);

    await nextTick();
    await nextTick();
    await nextTick();

    // 验证 updater 函数接收到的 prevState
    expect(updaterCalls).toEqual([0, 1, 2]);
    // 验证最终状态
    expect(calls[calls.length - 1]!).toEqual({ context: 10, state: 3 });
  });

  test("setState 回调中使用最新的 context", async () => {
    const calls: Array<{ context: number; state: number }> = [];

    const handler = stateful<number, number>(0, ({ context, state, setState }) => {
      calls.push({ context, state });
      if (state === 0) {
        // 在第一次调用时更新状态
        setState(() => 1);
      }
    });

    handler(10);

    // 等待 setState 的微任务执行，但在此之前更新 context
    // 注意：由于 setState 使用 queueMicrotask，handler(20) 会在微任务之前执行
    handler(20);

    // 等待 setState 触发的异步重新执行
    await nextTick();

    // 验证 setState 回调中使用的是最新的 context (20)，而不是旧的 context (10)
    // handler(10) 同步执行，state = 0，调用 setState(() => 1)，state 立即变为 1，然后安排微任务
    // handler(20) 同步执行，此时 state 已经是 1 了（因为 setState 是同步更新 state）
    // handler(10) 的 setState 微任务执行，此时 contextRef = 20，所以使用 context = 20
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[0]!).toEqual({ context: 10, state: 0 });
    expect(calls[1]!).toEqual({ context: 20, state: 1 });
    // setState 回调中使用最新的 context
    const lastCall = calls[calls.length - 1];
    expect(lastCall).toBeDefined();
    if (lastCall) {
      expect(lastCall.context).toBe(20);
      expect(lastCall.state).toBe(1);
    }
  });

  test("条件判断避免无限循环", async () => {
    const calls: Array<{ context: number; state: number }> = [];

    const handler = stateful<number, number>(0, ({ context, state, setState }) => {
      calls.push({ context, state });
      // ✅ 正确：只在值改变时更新状态
      if (context !== state) {
        setState(() => context);
      }
    });

    handler(10);

    // 第一次同步执行
    expect(calls).toHaveLength(1);
    expect(calls[0]!).toEqual({ context: 10, state: 0 });

    // 等待 setState 触发的异步重新执行
    await nextTick();
    expect(calls).toHaveLength(2);
    expect(calls[1]!).toEqual({ context: 10, state: 10 });

    // 由于 state === context，不会再次调用 setState，不会无限循环
    await nextTick();
    expect(calls).toHaveLength(2); // 仍然是 2 次，没有无限循环
  });

  test("处理复杂状态对象", async () => {
    type State = {
      count: number;
      lastValue: number | null;
    };

    const calls: Array<{ context: number; state: State }> = [];

    const handler = stateful<number, State>(
      { count: 0, lastValue: null },
      ({ context, state, setState }) => {
        calls.push({ context, state });
        if (context !== state.lastValue) {
          setState((prev) => ({
            count: prev.count + 1,
            lastValue: context,
          }));
        }
      }
    );

    handler(10);

    // 第一次同步执行
    expect(calls).toHaveLength(1);
    expect(calls[0]!).toEqual({ context: 10, state: { count: 0, lastValue: null } });

    // 等待 setState 触发的异步重新执行
    await nextTick();
    expect(calls).toHaveLength(2);
    expect(calls[1]!).toEqual({ context: 10, state: { count: 1, lastValue: 10 } });

    // 更新 context
    handler(20);
    await nextTick();
    expect(calls).toHaveLength(4); // context 变化 + setState 触发
    expect(calls[3]!).toEqual({ context: 20, state: { count: 2, lastValue: 20 } });
  });

  test("在异步回调中使用 setState", async () => {
    const calls: Array<{ context: number; state: { loading: boolean; data: string | null } }> = [];

    const handler = stateful<number, { loading: boolean; data: string | null }>(
      { loading: false, data: null },
      ({ context, state, setState }) => {
        calls.push({ context, state });
        // 只在未加载时开始加载
        if (!state.loading && !state.data) {
          setState((prev) => ({ ...prev, loading: true }));
          // 在异步回调中使用 setState
          queueMicrotask(() => {
            setState((prev) => ({ loading: false, data: `data-${context}` }));
          });
        }
      }
    );

    handler(10);

    // 第一次同步执行
    expect(calls).toHaveLength(1);
    expect(calls[0]!).toEqual({ context: 10, state: { loading: false, data: null } });

    // 等待 setState 触发的异步重新执行
    await nextTick();
    // 注意：此时可能已经有多个调用（setState 的微任务 + queueMicrotask 中的 setState）
    expect(calls.length).toBeGreaterThanOrEqual(2);
    // 找到 loading: true 的调用
    const loadingCall = calls.find((c) => c.state.loading === true);
    expect(loadingCall).toBeDefined();
    expect(loadingCall?.state).toEqual({ loading: true, data: null });

    // 等待异步回调中的 setState
    await nextTick();
    // 找到最终的调用
    const finalCall = calls[calls.length - 1];
    expect(finalCall).toBeDefined();
    expect(finalCall?.state).toEqual({ loading: false, data: "data-10" });
  });

  test("状态对象引用相等时不触发重新执行", async () => {
    const calls: Array<{ context: number; state: { value: number } }> = [];
    const fixedState = { value: 1 };

    const handler = stateful<number, { value: number }>(
      { value: 0 },
      ({ context, state, setState }) => {
        calls.push({ context, state });
        if (state.value === 0) {
          // 第一次：设置固定引用
          setState(() => fixedState);
        } else if (state === fixedState) {
          // 如果 state 已经是 fixedState，返回相同引用不会触发重新执行
          setState(() => fixedState);
        }
      }
    );

    handler(10);

    // 第一次同步执行
    expect(calls).toHaveLength(1);
    expect(calls[0]!).toEqual({ context: 10, state: { value: 0 } });

    // 等待 setState 触发的异步重新执行
    await nextTick();
    expect(calls).toHaveLength(2);
    expect(calls[1]!).toEqual({ context: 10, state: fixedState });

    // 此时 state === fixedState，返回相同引用不会触发重新执行
    await nextTick();
    expect(calls).toHaveLength(2); // 仍然是 2 次
  });

  test("处理字符串状态", async () => {
    const calls: Array<{ context: string; state: string }> = [];

    const handler = stateful<string, string>("", ({ context, state, setState }) => {
      calls.push({ context, state });
      if (state !== context) {
        setState(() => context);
      }
    });

    handler("hello");

    // 第一次同步执行
    expect(calls).toHaveLength(1);
    expect(calls[0]!).toEqual({ context: "hello", state: "" });

    // 等待 setState 触发的异步重新执行
    await nextTick();
    expect(calls).toHaveLength(2);
    expect(calls[1]!).toEqual({ context: "hello", state: "hello" });
  });

  test("处理数组状态", async () => {
    const calls: Array<{ context: number; state: number[] }> = [];

    const handler = stateful<number, number[]>([], ({ context, state, setState }) => {
      calls.push({ context, state });
      if (!state.includes(context)) {
        setState((prev) => [...prev, context]);
      }
    });

    handler(1);

    // 第一次同步执行
    expect(calls).toHaveLength(1);
    expect(calls[0]!).toEqual({ context: 1, state: [] });

    // 等待 setState 触发的异步重新执行
    await nextTick();
    expect(calls).toHaveLength(2);
    expect(calls[1]!).toEqual({ context: 1, state: [1] });

    handler(2);
    await nextTick();
    expect(calls).toHaveLength(4); // context 变化 + setState 触发
    expect(calls[3]!).toEqual({ context: 2, state: [1, 2] });
  });
});
