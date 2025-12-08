# Agent 建模方法论 V2

## 概述

本文档描述了一种**迭代式**的 Agent 建模方法论，用于将复杂的 AI Agent 建模为基于 Automata 的 Moore 状态机。与传统的瀑布式建模方法不同，本方法从最小实现开始，通过追加需求的方式逐步扩展模型。

## 核心概念

### Actor（行为体）

**Actor** 是 Agent 心智需要认知的行为体。例如 `User` Actor 并不是真正的用户，而是用户在 Agent 认知中的投射。每个 Actor 都是一个独立的 Moore 自动机，拥有自己的状态和输出。

### Observation（观察）

**Observation** 是 Actor 相互之间的观察，它是被观察 Actor 状态的切片。例如 `UserObLlm` 表示 User Actor 对 Llm Actor 的观察。

- 一个 Actor 的 **Appearance**（表现）就是所有指向它的 Observation 的并集（所有入边的 Observation）
- 一个 Actor 的 **Perspective**（感知）就是所有它发出的 Observation 的并集（所有出边的 Observation）

在有向图上，所有节点的入边 Observation 的并集 = 所有节点的出边 Observation 的并集 = 所有 Observation。

## 整体架构概览

我们建模的目标是从需求出发，设计出 Moore 自动机的核心要素：

- `type Appearance` - 表现类型
- `type Action` - 动作类型
- `function initial` - 初始化函数
- `function transition` - 状态转换函数

**注意**：`output` 函数不属于 Agent 建模的一部分，它应该在使用时通过依赖注入的方式传入。这是因为：
- Output 函数包含副作用（如 API 调用、日志记录等），而 Agent 的核心建模应该是纯粹的
- 不同的使用场景可能需要不同的 output 实现（如测试环境、生产环境）
- 将副作用与状态逻辑分离，提高了代码的可测试性和可维护性

在设计阶段，我们应优先关注两个类型 `Appearance`, `Action`；实现阶段，再关注两个函数 `initial`, `transition`。

**纯函数要求**：
- `InitialFn`、`TransitionFn` 这两个函数**必须是纯函数**，不能有副作用
- `ReactionFn` 虽然不属于建模的一部分，但其本身也应该是纯函数，只有其**返回值**是一个副作用函数
- 这种设计确保了状态转换的可预测性和可测试性，副作用被隔离在 output 函数的返回值中

把整个 Actor 网络看作一个 Moore 自动机（使用 `@moora/automata` 的 `moore` 函数），那么：

- **总 Worldscape** 就是各个 Actor Appearance 的并集（也是各个 Actor Perspective 的并集，因为有向图上，所有节点出边的并集 = 所有节点入边的并集 = 所有边）
- **总 Actuation** 就是各个 Actor Action 的并集，每个 Actor 的 Output 可以 Dispatch 特定的 Action，以驱动对应 Appearance 的变化
- **总 Output** 就是各个 Actor 的 Output 的总和。这个 Output 是被 Worldscape 决定的，符合 Moore 机的定义

### Output 的定义

Output 是一个同步副作用函数，type 为：

```typescript
type Output<Action> = Eff<Dispatch<Action>, void>
// 即 (dispatch: Dispatch<Action>) => void
```

**设计说明**：

- Output 是一个同步函数，接收 `dispatch` 作为上下文参数
- 如果需要异步操作（如 API 调用），应该在函数内部自行使用 `queueMicrotask` 来处理
- 这种设计允许同步部分立即处理输出（如日志记录、UI 更新），同时异步副作用在微任务队列中执行
- 异步副作用可以通过 `dispatch` 产生新的 Action，形成反馈循环

**与 Automata 的关系**：

`@moora/automata` 的 `moore` 函数的 `Reaction` 参数接收一个函数 `(worldscape: Worldscape) => Output`，这个函数根据当前状态返回一个同步副作用函数。这个副作用函数在执行时会通过 `dispatch` 回调来驱动自动机的状态变化。


### 代码层面的类型定义

我们的一套自动机建模应该包括以下类型（注意，这里所有的类型都应该用 Zod 4 来定义 schema，再用 `z.infer` 推导出来具体的类型）：

- **各个 Actor 的枚举类型**，例如
  - `type Actors = 'user' | 'llm'`
  
- **各个 Actor 之间的 Observation**，进而定义各个 Actor 的 Appearance & Perspective，乃至 Worldscape，例如
  - Observations（观察类型）
    - `type UserObLlm = { assiMessages: AssiMessages }` - User 对 Llm 的观察
    - `type UserObUser = { userMessages: UserMessages }` - User 对自身的观察（自环）
    - `type LlmObLlm = { assiMessages: AssiMessages }` - Llm 对自身的观察（自环）
    - `type LlmObUser = { userMessages: UserMessages }` - Llm 对 User 的观察
  - Appearances（表现类型）
    - `type AppearanceOfUser = UserObUser & LlmObUser` - User 的表现 = 所有指向 User 的 Observation 的并集
    - `type AppearanceOfLlm = UserObLlm & LlmObLlm` - Llm 的表现 = 所有指向 Llm 的 Observation 的并集
  - Perspectives（感知类型）
    - `type PerspectiveOfUser = UserObUser & UserObLlm` - User 的感知 = 所有 User 发出的 Observation 的并集
    - `type PerspectiveOfLlm = LlmObUser & LlmObLlm` - Llm 的感知 = 所有 Llm 发出的 Observation 的并集
  
  - 注意，每个 Appearance 和 Perspective 都是 Object，由于它们的 properties 是复用的，所以要给 properties 定义公用的数据类型，例如
    - `type UserMessages = UserMessage[]`
    - `type AssiMessages = AssiMessage[]`
    - `type UserMessage = BaseMessage & { role: 'user' }`
    - `type AssiMessage = BaseMessage & { role: 'assistant' }`
    - `type BaseMessage = { id: string, content: string, timestamp: number }`

- **定义各个 Actor 可以 Dispatch 的 Actions**，例如
  - `type ActionFromUser = SendUserMessage` // 未来可能 union 更多类型
  - `type ActionFromLlm = SendAssiMessage`
  - `type SendUserMessage = { type: 'send-user-message', id: string, content: string, timestamp: number }`
  - `type SendAssiMessage = { type: 'send-assi-message', id: string, content: string, timestamp: number }`

- **Helper Generic 类型**，用于类型推导
  - `type AppearanceOf<Actor extends Actors> = Actor extends 'user' ? AppearanceOfUser : AppearanceOfLlm`
  - `type PerspectiveOf<Actor extends Actors> = Actor extends 'user' ? PerspectiveOfUser : PerspectiveOfLlm`
  - `type ActionFrom<Actor extends Actors> = Actor extends 'user' ? ActionFromUser : ActionFromLlm`

- **关键函数的类型定义**
  - `type InitialFnOf<Actor extends Actors> = () => AppearanceOf<Actor>`
  - `type TransitionFnOf<Actor extends Actors> = (action: ActionFrom<Actor>) => (appearance: AppearanceOf<Actor>) => AppearanceOf<Actor>`
  - `type ReactionFnOf<Actor extends Actors> = Eff<{ perspective: PerspectiveOf<Actor>; dispatch: Dispatch<Actuation> }>`
  
  注意：`ReactionFnOf` 返回 `Eff<{ perspective, dispatch }>`，直接接收包含 `perspective` 和 `dispatch` 的对象。这是因为：
  - **Perspective** 是 Actor 发出的 Observation 的并集，表示该 Actor 对世界的感知
  - **Reaction** 函数根据 Actor 的 Perspective（它对世界的感知）来决定要执行什么副作用
  - 这符合 Moore 机的语义：输出由当前状态决定，而 Perspective 正是 Actor 状态中向外可见的部分
  - Reaction 函数同时接收 `perspective` 和 `dispatch`，允许在副作用中访问感知并 dispatch 新的 Action
  - **重要设计**：这种非柯里化的设计允许 reaction 在闭包外层创建，使得使用 `stateful` 等 reaction 组合器时，状态可以在多次调用之间正确共享
  
  **重要**：
  - `InitialFn` 和 `TransitionFn` 是 Agent 建模的核心部分，必须是**纯函数**
  - `ReactionFn` **不属于 Agent 建模**，应该在创建 Agent 实例时通过依赖注入传入
  - `ReactionFn` 本身也应该是纯函数，只有其返回值是副作用函数

- **定义 Agent 总的 Worldscape 和 Actuation**，例如
  - `type Worldscape = AppearanceOfUser & AppearanceOfLlm`
  - `type Actuation = ActionFromUser | ActionFromLlm`

### 文件结构

```
项目根目录/
│
├── decl/                          # 类型声明目录（严格包含以下文件，不能减少，也不能增加）
│   ├── actors.ts                  # Actors 类型和常量定义
│   ├── observations.ts            # 所有 FooObBar 类型的 schema 和类型定义
│   │                              #   包含 property 对应的类型，以及其依赖数据类型的 schema 及定义
│   ├── appearances.ts             # 所有 AppearanceOfFoo 类型的 schema 和类型定义
│   ├── perspectives.ts            # 所有 PerspectiveOfFoo 类型的 schema 和类型定义
│   ├── actions.ts                 # 所有 Actor 可以 dispatch 的 Action 的 schema 和类型定义
│   ├── helpers.ts                 # 关键 Helper Generic 类型定义
│   │                              #   AppearanceOf, PerspectiveOf, ActionFrom, InitialFnOf, TransitionFnOf, ReactionFnOf
│   ├── agent.ts                   # Worldscape, Actuation, ReactionFns 的定义
│   └── index.ts                   # 综合 export
│
├── impl/                          # 实现目录
│   ├── initials/                  # 每个 actor 对应一个文件，另外含一个 index.ts
│   │   ├── user.ts                # 实现 user initial function
│   │   ├── llm.ts                 # 实现 llm initial function
│   │   └── index.ts               # 综合 export
│   │
│   ├── transitions/               # 每个 actor 对应一个文件
│   │   │                          # 如果有多个 Action 类型，可转文件夹
│   │   │                          # 文件夹内每个新 Action 类型对应一个文件
│   │   ├── user.ts                # 实现 user transition function
│   │   ├── llm.ts                 # 实现 llm transition function
│   │   └── index.ts               # 综合 export
│   │
│   ├── agent/                     # Agent 综合实现目录
│   │   ├── initial.ts             # initialAgent 函数实现
│   │   ├── transition.ts          # transitionAgent 函数实现
│   │   ├── reaction.ts            # createReactionAgent 函数实现
│   │   ├── create.ts              # createAgent 工厂函数（接受 ReactionFns 参数）
│   │   └── index.ts               # 综合 export
│   │
│   └── index.ts                   # 综合 export
│
└── index.ts                       # 综合 export（项目入口）
```

**注意**：`impl/output/` 目录不属于 Agent 建模的一部分。如果需要提供默认的 output 实现作为参考，可以将其放在单独的目录中（如 `examples/` 或 `defaults/`）。

每个文件夹都必须严格的按照规定的结构组织，唯一的 exception 是，如果某个 .ts 文件过大，可以改成对应的文件夹进行代码拆分。例如 decl/observations.ts 如果太大，可以转成 decl/observations/，分成多个文件，通过 decl/observation/index.ts 综合 export

### 命名规范

- 所有的常量用 SNAKE_CASE
- 所有的类型用 PascalCase，如果遇到缩写，变换成一般的单词的形式，如要 Llm，不要 LLM
- 所有的函数和变量用 camelCase，如果遇到缩写，变换成一般的单词的形式，如要 llm，不要 LLM
- 所有的 user 名称用 kebab-case string，如 'user', 'llm', 'task-manager'

## 迭代式建模流程

### 核心思想

与传统的瀑布式建模方法（如七步建模法）不同，本方法采用**迭代式**建模：

1. **从最小实现开始**：先实现一个最简单的、可运行的版本
2. **以追加需求的方式扩展**：根据新需求逐步扩展模型，而不是一开始就设计完整的模型
3. **每个迭代步骤都要 Review**：确保每一步的设计都符合需求，避免过度设计

这种方法更符合实际工程开发流程，因为在实际项目中，我们往往无法在一开始就想清楚具体有哪些参与方，有哪些 action/output。

### 初始版本（最小实现）

初始版本只包含 `user` 和 `llm` 两个 Actor，实现最基本的对话功能：

- **Actors**: `'user' | 'llm'`
- **Observations**:
  - `UserObLlm = { assiMessages: AssiMessages }` - User 观察 Llm 的回复
  - `UserObUser = { userMessages: UserMessages }` - User 观察自己的消息（自环）
  - `LlmObLlm = { assiMessages: AssiMessages }` - Llm 观察自己的回复（自环）
  - `LlmObUser = { userMessages: UserMessages }` - Llm 观察 User 的消息
- **Actions**:
  - `ActionFromUser = SendUserMessage`
  - `ActionFromLlm = SendAssiMessage`

这个初始版本应该能够：
- 用户发送消息
- Llm 接收消息并生成回复
- 用户接收并显示回复

## 迭代扩展流程

迭代的每一个步骤都要和人 Review 好再继续。每个迭代步骤遵循以下流程：

### Step 1 - 增补 Perspective 和 Action

这一步，要结合需求，考察各个 Actor，思考以下问题：

1. **是否需要新增 Actor？** 如果需要，它的 Perspective 和 Action 分别是什么？
2. **对于已有的每个 Actor，是否需要感知到新的感知（Perspective）？** 如果需要，新感知的类型定义是怎样的？
3. **对于已有的每个 Actor 是否需要发起新的 Action？** 如果需要，该 Action 的类型定义是怎样的？

**操作**：
- 把设计到的类型定义出来，写进对应的文件（`decl/actions.ts`）
- 扩展 `ActionFromFoo` 类型
- **但不着急定义新的 `FooObBar` 类型，也不着急扩展 Perspective 定义**

### Step 2 - 找出新 Observations

对第一步找到的每个新 Perspective，思考它来自哪个 Actor，发现新的 Observations。

**操作**：
- 对面向每个 Actor 的 Observations 进行综合去重，确保新增的 Observations 之间，以及它们和既有 Observations 之间无冗余信息
- 创建实际的 `FooObBar` 类型，并加入对应的 `AppearanceOfBar` 和 `PerspectiveOfFoo` 类型中去
- 更新 `decl/observations.ts`、`decl/appearances.ts`、`decl/perspectives.ts`

### Step 3 - 审视 Actor 的 Appearance 和 Action

这一步要确保 Appearance 和 Action 的完整性：

1. **对第二步每个 Actor 新增的 Appearance，要审视是否有对应的 Action 来迭代它**。如果缺失，补充对应的 Action。
2. **对第一步每个 Actor 新增的 Action，要审视是否有对应的 Appearance 来承接它**。如果缺失，要思考是哪个 Actor 会关注这个 Action，增补对应的 Observation，并分别加到对应 Actor 的 Appearance 和 Perspective。

**操作**：
- 检查 Appearance 和 Action 的对应关系
- 补充缺失的 Action 或 Observation
- 更新相关类型定义

### Step 4 - 补充实现代码逻辑

针对新增的 Actor、Perspective、Appearance、Action，对应地调整 `initial`、`transition` 函数的实现。

**操作**：
- 更新 `impl/initials/` 中的初始化函数
- 更新 `impl/transitions/` 中的状态转换函数
- 更新 `impl/agent.ts` 中的统合函数
- 确保代码能够编译通过，类型检查无误

**注意**：不需要在建模阶段实现 output 函数。Output 函数应该在使用 Agent 时通过 `createAgent(ReactionFns)` 注入。

### 迭代完成检查

完成每个迭代步骤后，检查：

- [ ] 所有新增的类型定义都正确
- [ ] Appearance 和 Action 的对应关系完整
- [ ] Observation 的定义无冗余
- [ ] 代码实现符合类型定义
- [ ] 代码能够编译通过
- [ ] 功能符合需求预期

## 使用 Automata

完成建模后，使用 `createAgent` 函数创建 Moore 自动机，需要注入各个 Actor 的 reaction 函数。

```typescript
import { createAgent } from '@moora/starter-agent';
import type { ReactionFns } from '@moora/starter-agent';

// 定义各个 Actor 的 reaction 函数
const reactionFns: ReactionFns = {
  user: ({ perspective, dispatch }) => {
    // 同步执行，可以立即处理输出
    console.log('User perspective:', perspective);
    // 如果需要异步操作，使用 queueMicrotask
  },
  llm: ({ perspective, dispatch }) => {
    // 同步执行
    console.log('LLM perspective:', perspective);
    // 如果需要异步操作，使用 queueMicrotask
    queueMicrotask(async () => {
      // 例如：调用 LLM API，然后 dispatch 回复消息
      const response = await callLlmApi(perspective.userMessages);
      dispatch({
        type: 'send-assi-message',
        id: 'msg-001',
        content: response,
        timestamp: Date.now(),
      });
    });
  },
};

// 创建 Agent 实例
const agent = createAgent(reactionFns);
```

注意：`reaction` 函数返回的是 `Output<Action>` 类型，它是一个同步副作用函数。如果需要异步操作，应该在函数内部自行使用 `queueMicrotask` 来处理。

### 实际使用示例

```typescript
import { createAgent } from '@moora/starter-agent';
import type { ReactionFns } from '@moora/starter-agent';

// 定义 reaction 函数（实际项目中可能来自不同的模块）
const reactionFns: ReactionFns = {
  user: ({ perspective, dispatch }) => {
    console.log('[User] Messages:', perspective.userMessages);
    // User actor 的副作用，如果需要异步操作，使用 queueMicrotask
  },
  llm: ({ perspective, dispatch }) => {
    console.log('[LLM] Processing...');
    // 如果需要异步操作，使用 queueMicrotask
    queueMicrotask(async () => {
      // 调用 LLM API 并 dispatch 回复
      if (perspective.userMessages.length > 0) {
        const lastMessage = perspective.userMessages[perspective.userMessages.length - 1];
        // const response = await callLlmApi(lastMessage.content);
        dispatch({
          type: 'send-assi-message',
          id: `assi-${Date.now()}`,
          content: `Echo: ${lastMessage.content}`,
          timestamp: Date.now(),
        });
      }
    });
  },
};

// 创建自动机
const agent = createAgent(reactionFns);

// 订阅状态变化
agent.subscribe((dispatch) => (output) => {
  // output 是 Eff<Dispatch<Actuation>, void>
  // 直接执行即可，如果需要异步操作，output 内部会使用 queueMicrotask
  output(dispatch);
});

// 直接 dispatch Action 来触发状态转换
agent.dispatch({ type: 'send-user-message', id: 'msg-001', content: 'Hello', timestamp: Date.now() });
```
