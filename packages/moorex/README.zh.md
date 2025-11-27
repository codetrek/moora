# Moorex: 用于 Agent 的持久化 Moore 自动机

[![npm version](https://img.shields.io/npm/v/@moora/moorex.svg)](https://www.npmjs.com/package/@moora/moorex)
[![npm downloads](https://img.shields.io/npm/dm/@moora/moorex.svg)](https://www.npmjs.com/package/@moora/moorex)
[![test coverage](https://img.shields.io/codecov/c/github/shazhou-ww/moora?flag=moorex)](https://codecov.io/gh/shazhou-ww/moora)
[![license](https://img.shields.io/npm/l/@moora/moorex.svg)](https://github.com/shazhou-ww/moora/blob/main/packages/moorex/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

<div align="center">
  <img src="./moorex.svg" alt="Moorex Logo" width="200">
</div>

Moorex 是一个通用的异步 Moore 自动机。它跟踪状态，严格基于当前状态驱动副作用，并在状态改变时协调这些副作用。该设计源于构建**持久化 AI 智能体**的需求，这些智能体必须在崩溃、重启或迁移中存活，同时能够恢复未完成的工作。

## 快速开始

安装 Moorex 及其对等依赖：

```bash
npm install @moora/moorex mutative
# 或
bun add @moora/moorex mutative
# 或
yarn add @moora/moorex mutative
```

导入并创建你的第一个 Moorex 自动机：

```typescript
import { createMoorex, type MoorexDefinition } from '@moora/moorex';
import { create } from 'mutative';

// 定义你的类型并创建定义
type State = { count: number };
type Input = { type: 'increment' } | { type: 'decrement' };
type Effect = { kind: 'log'; message: string };

const definition: MoorexDefinition<Input, Effect, State> = {
  initial: () => ({ count: 0 }),
  transition: (input) => (state) => {
    if (input.type === 'increment') {
      return create(state, (draft) => { draft.count++; });
    }
    return create(state, (draft) => { draft.count--; });
  },
  effectsAt: (state) => ({
    log: { kind: 'log', message: `Count is ${state.count}` },
  }),
  runEffect: (effect, state, key) => ({
    start: async (dispatch) => {
      console.log(effect.message);
    },
    cancel: () => {},
  }),
};

// 创建自动机
const machine = createMoorex(definition);

// 订阅事件
machine.subscribe((event) => {
  console.log(event);
  // event.type 可以是: 'input-received', 'state-updated', 'effect-started',
  // 'effect-completed', 'effect-canceled', 'effect-failed'
});

// 派发输入以触发状态转换
machine.dispatch({ type: 'increment' });

// 获取当前状态
const currentState = machine.current();
```

## 定义 Moorex 自动机

要创建一个 Moorex 自动机，你需要定义**三个类型**和**四个函数**：

### 三个类型

1. **`Input`**: 触发状态转换的输入事件。例如：用户消息、工具响应、定时器触发。

2. **`Effect`**: 由状态驱动的副作用。例如：LLM API 调用、工具执行、超时。注意：Effect 类型不再需要 `key` 属性；`effectsAt` 返回的 Record 键用作标识符。

3. **`State`**: 你的自动机内部状态的形状。表示你的智能体或应用的当前配置。

所有三个类型都必须是**不可变的**（只读）。有关详细信息，请参见下面的[不可变性](#不可变性)部分。

### 四个函数

1. **`initial(): State`**: 返回初始状态。可以从持久化存储中恢复状态以用于恢复。

2. **`transition(input: Input): (state: State) => State`**:
   一个纯 reducer 函数。接收一个输入并返回一个函数，该函数将当前状态转换为下一个状态。不能修改输入状态。

3. **`effectsAt(state: State): Record<string, Effect>`**:
   基于当前状态返回应该运行的副作用的 Record（键值映射）。Record 的键用作稳定的副作用标识符以进行协调。

4. **`runEffect(effect: Effect, state: State, key: string): EffectController<Input>`**:
   创建一个控制器，包含 `start` 和 `cancel` 方法来执行和取消每个副作用。接收副作用、生成它的状态以及副作用的 key。

这四个函数组成一个 `MoorexDefinition<Input, Effect, State>`，你将其传递给 `createMoorex()` 以实例化自动机。

## 为什么为持久化 Agent 使用 Moorex？

AI 智能体经常在调用大语言模型（LLM）的同时与用户和工具交互。智能体可能在任务中途崩溃、被暂停或跨节点迁移。为了准确地恢复，我们必须恢复：

- 智能体的内部状态（消息、待处理的工具调用等）
- 每个进行中的副作用（未完成的 LLM 调用、工具执行）

这种智能体非常适合 Moore 自动机模型：**状态决定应该运行哪些副作用**。

- **Input（输入）**: 用户消息、工具消息、助手消息
- **State（状态）**: 完整的对话历史、待发送的消息、待处理的工具调用
- **Effect（副作用）**: 由状态驱动的动作，例如调用 LLM、执行工具，或在没有剩余任务时保持空闲

使用 Moorex，在重新注入状态后，我们运行副作用协调，智能体会从上次中断的地方继续。没有对应状态的副作用无法存在，移除状态会自动取消冗余的副作用。

## 不可变性

Moorex 中的所有数据类型（State、Input、Effect）都应该是**只读/不可变的**。虽然 Moorex 不在类型级别强制不可变性，但它要求 `transition` 和 `effectsAt` 必须是**纯函数**——它们不能修改输入。`runEffect` 函数也应该是纯函数（除了返回的 `start` 和 `cancel` 方法可以执行副作用）。不可变性防止意外突变，这些突变会违反此约束并导致 bug。

我们强烈建议使用 [mutative](https://github.com/unadlib/mutative) 的 `create()` 函数进行不可变更新：

```typescript
import { create } from 'mutative';

// 在你的转换函数中
transition: (input) => (state) => {
  return create(state, (draft) => {
    draft.messages.push(input);
    // 根据需要修改 draft——在这里修改是安全的
  });
}

// 对于简单的更新，你也可以使用展开运算符
transition: (input) => (state) => {
  return {
    ...state,
    messages: [...state.messages, input],
  };
}
```

## 示例：持久化 Agent 驱动

下面的示例展示了一个根据其状态决定操作的弹性智能体。

```typescript
import { createMoorex, type MoorexDefinition } from '@moora/moorex';
import { create } from 'mutative';

// 定义你的输入类型——这些触发状态转换
type Input =
  | { type: 'user'; message: string }
  | { type: 'tool'; name: string; result: string }
  | { type: 'assistant'; message: string };

// 定义你的副作用类型——这些表示要运行的副作用。
// 注意：Effect 类型不再需要 `key` 属性；Record 键用作标识符。
type Effect =
  | { kind: 'call-llm'; prompt: string }
  | { kind: 'call-tool'; id: string; name: string; input: string };

// 定义你的状态形状
type AgentState = {
  messages: Input[];
  pendingMessages: Input[];
  pendingToolCalls: { id: string; name: string; input: string }[];
};

const definition: MoorexDefinition<Input, Effect, AgentState> = {
  // 返回初始状态的初始化函数
  initial: () => ({
    messages: [],
    pendingMessages: [],
    pendingToolCalls: [],
  }),

  // 纯状态转换函数: (input) => (state) => newState。
  // 这定义了输入如何转换你的状态。
  transition: (input) => (state) => {
    return create(state, (draft) => {
      draft.messages.push(input);
      // 根据输入类型更新 pendingMessages 和 pendingToolCalls
    });
  },

  // 副作用选择器: (state) => Record<string, Effect>
  // 返回一个 Record，其中键是副作用标识符，值是副作用。
  // Moorex 使用这些键来协调副作用（取消过时的，启动新的）
  effectsAt: (state) => {
    const effects: Record<string, Effect> = {};
    
    // 如果存在 pendingMessages，添加 LLM 调用副作用
    if (state.pendingMessages.length > 0) {
      const prompt = state.pendingMessages.map(m => m.message).join('\n');
      effects[`llm:${prompt.length}`] = { kind: 'call-llm', prompt };
    }
    
    // 如果存在 pendingToolCalls，添加工具执行副作用
    for (const toolCall of state.pendingToolCalls) {
      effects[`tool:${toolCall.id}`] = {
        kind: 'call-tool',
        id: toolCall.id,
        name: toolCall.name,
        input: toolCall.input,
      };
    }
    
    return effects;
  },

  // 副作用运行器：为每个副作用创建控制器
  runEffect: (effect, state, key) => {
    if (effect.kind === 'call-llm') {
      return {
        // 运行副作用并在完成时派发输入的异步函数
        start: async (dispatch) => {
          // 使用 effect.prompt 调用 LLM
          // 完成后，派发助手消息输入
          // dispatch({ type: 'assistant', message: completion });
        },
        // 如果不再需要副作用，取消副作用的函数
        cancel: () => {
          // 取消 LLM 调用（例如，中止 fetch，关闭连接）
        },
      };
    }
    if (effect.kind === 'call-tool') {
      return {
        start: async (dispatch) => {
          // 使用 effect.name 和 effect.input 执行工具。
          // 完成后，派发工具结果输入：
          // dispatch({ type: 'tool', name: effect.name, result: '...' });
        },
        cancel: () => {
          // 如果可能，取消工具执行
        },
      };
    }
    // TypeScript 穷尽性检查
    throw new Error(`Unknown effect kind ${(effect satisfies never).kind}`);
  },
};

// 创建 Moorex 自动机实例
const agent = createMoorex(definition);

// 订阅事件（状态更新、副作用生命周期等）
agent.subscribe((event) => {
  console.log('[agent-event]', event);
  // event.type 可以是: 'input-received', 'state-updated', 'effect-started',
  // 'effect-completed', 'effect-canceled', 'effect-failed'
});

// 派发输入以触发状态转换
agent.dispatch({
  type: 'user',
  message: 'Summarize the latest log entries.',
});

// 获取当前状态
const currentState = agent.current();
```

即使智能体重启，重新注入 `AgentState` 并让副作用协调运行，也会按照要求恢复或取消副作用。`effectsAt` 返回的 Record 键作为跨重启的稳定副作用标识符——具有匹配键的副作用被视为同一个副作用。

## 副作用协调

每次状态改变时，Moorex：

1. 调用 `effectsAt(state)` 计算所需的副作用集作为 Record（键值映射）。
2. 取消其键从 Record 中消失的运行中的副作用。
3. 启动 Record 中引入的新副作用的键。
4. 保持其键仍然存在的副作用不变。

Record 的键用作协调的副作用标识符，因此 Effect 类型不再需要具有 `key` 属性。

每个副作用的生命周期由 `runEffect` 函数管理：

- `runEffect(effect, state, key)` 接收副作用、自动机的**当前状态**（通过 `moorex.current()` 获取）以及副作用的 key，返回一个带有 `start` 和 `cancel` 方法的控制器。
- `start(dispatch)` 启动副作用并在完成时解析。使用 `dispatch` 将输入发送回自动机。`dispatch` 函数是受保护的：如果副作用被取消，后续对 `dispatch` 的调用将被忽略。
- `cancel()` 中止副作用；当不再需要副作用键时，Moorex 会调用此方法。

Moorex 在内存中跟踪运行的副作用。如果副作用完成或拒绝，自动机会自动删除它并发出相应的事件。

## 事件时间线

Moorex 暴露单个 `subscribe(handler)` 订阅。对于每个派发，事件按以下顺序到达：

1. **`input-received`**: 在处理输入时（副作用协调之前）每个输入发出一次。
2. **`state-updated`**: 在状态转换完成后发出一次。
3. **`effect-started`**: 在协调期间为每个开始的新副作用发出。
4. **`effect-completed`** / **`effect-failed`** / **`effect-canceled`**: 在副作用完成、抛出或被取消时异步发出。

## API 参考

### `createMoorex<Input, Effect, State>(definition: MoorexDefinition<Input, Effect, State>): Moorex<Input, Effect, State>`

创建一个新的 Moorex 自动机实例。

### `Moorex<Input, Effect, State>`

- `dispatch(input: Input): void` - 派发输入以触发状态转换
- `current(): State` - 获取当前状态
- `subscribe(handler: (event: MoorexEvent<Input, Effect, State>) => void): CancelFn` - 订阅自动机事件

### `MoorexEvent<Input, Effect, State>`

- `{ type: 'input-received'; input: Input }`
- `{ type: 'state-updated'; state: State }`
- `{ type: 'effect-started'; effect: Effect }`
- `{ type: 'effect-completed'; effect: Effect }`
- `{ type: 'effect-canceled'; effect: Effect }`
- `{ type: 'effect-failed'; effect: Effect; error: unknown }`

## 许可证

MIT
