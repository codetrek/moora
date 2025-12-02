# Triplet Agent 建模进度记录

## 当前状态

**已完成步骤**: 3/7 (42.9%)

**最后更新**: 2024年（步骤 3 完成）

---

## 详细进度

### ✅ 步骤 1: 对节点 - 识别参与方

**状态**: 已完成

**输出文件**: `src/participants.ts`

**完成内容**:
- ✅ 定义了三个参与者常量：`USER`, `AGENT`, `TOOLKIT`
- ✅ 定义了 `Participants` 类型
- ✅ 每个参与者都有清晰的职责描述

**参与者定义**:
- **USER**: 接收用户输入，展示 Agent 响应
- **AGENT**: 处理消息，调用 LLM，决定工具使用
- **TOOLKIT**: 执行工具调用，返回结果

---

### ✅ 步骤 2: 理 I/O - 定义每个参与方的 Input/Output Schema

**状态**: 已完成

**输出文件**: `src/io.ts`

**完成内容**:
- ✅ User 节点的 I/O Schema
  - `InputForUser`: messages (Message[]), streamingMessageIds (string[])
  - `OutputFromUser`: sendMessage (带 messageId), cancelStreaming
- ✅ Agent 节点的 I/O Schema
  - `InputForAgent`: messages, toolResults, prompt, tools (ToolDefinition[])
  - `OutputFromAgent`: callTool (parameters: JSON string), sendChunk, completeMessage
- ✅ Toolkit 节点的 I/O Schema
  - `InputForToolkit`: pendingToolCalls (parameters: JSON string)
  - `OutputFromToolkit`: toolResult, toolError
- ✅ 定义了共享的 `Message` 类型
- ✅ 定义了 `ToolDefinition` 类型（name, description, parametersSchema）
- ✅ 定义了工具类型：`InputFor<P>`, `OutputFrom<P>`, `RunEffectFn<P>`
- ✅ 所有 Schema 使用 Zod@4 定义
- ✅ 复杂数据结构使用 JSON string（parameters, parametersSchema）

**设计决策**:
- 使用 JSON string 存储复杂数据，简化序列化和类型安全
- 支持流式输出（sendChunk + completeMessage）
- 统一的消息类型在 User 和 Agent 之间共享

---

### ✅ 步骤 3: 识别单向数据流 - 定义 Channel 和拓扑结构

**状态**: 已完成

**输出文件**: `src/channels.ts`

**完成内容**:
- ✅ 定义了 4 个节点间 Channel:
  - `Channel_USER_AGENT`: USER → AGENT
  - `Channel_AGENT_TOOLKIT`: AGENT → TOOLKIT
  - `Channel_TOOLKIT_AGENT`: TOOLKIT → AGENT
  - `Channel_AGENT_USER`: AGENT → USER
- ✅ 定义了 3 个 Loopback Channel（用于状态迭代感知）:
  - `Channel_USER_USER`: USER → USER
  - `Channel_AGENT_AGENT`: AGENT → AGENT
  - `Channel_TOOLKIT_TOOLKIT`: TOOLKIT → TOOLKIT
- ✅ 定义了所有 Channel 的类型
- ✅ 定义了 `Channel` 联合类型（包含所有 7 个 Channel）
- ✅ 定义了工具类型：`ChannelSource<C>`, `ChannelTarget<C>`
- ✅ 实现了 `isValidChannel()` 验证函数

**拓扑结构**:
```
USER ──────> AGENT ──────> TOOLKIT
  ↑              │              │
  │              │              │
  └──────────────┴──────────────┘
  (Loopback)   (Loopback)    (Loopback)
```

**重要设计**:
- Loopback Channels 允许每个节点感知自身状态变化
- 这对于状态机的状态迭代和自反馈机制至关重要
- 所有信息流都是单向的，避免循环依赖

---

### ⏳ 步骤 4: 聚焦通道关注点 - 定义每条 Channel 的 State 和 transition 函数

**状态**: 待开始

**需要完成**:
- [ ] 为每条 Channel 定义 State Schema（使用 Zod@4）
- [ ] State 表示 Target 节点对 Source 节点状态的关注点
- [ ] 定义 transition 函数，描述 State 如何随 Source 节点的 Output 变化
- [ ] transition 函数必须是纯函数
- [ ] 使用 mutative 进行不可变更新

**需要定义的 State**:
- [ ] StateUserAgent (USER → AGENT)
- [ ] StateAgentToolkit (AGENT → TOOLKIT)
- [ ] StateToolkitAgent (TOOLKIT → AGENT)
- [ ] StateAgentUser (AGENT → USER)
- [ ] StateUserUser (USER → USER, Loopback)
- [ ] StateAgentAgent (AGENT → AGENT, Loopback)
- [ ] StateToolkitToolkit (TOOLKIT → TOOLKIT, Loopback)

---

### ⏳ 步骤 5: 节点状态推着走 - 定义每个节点的 Effect、effectsAt 和 runEffect

**状态**: 待开始

**需要完成**:
- [ ] 为每个 Participant 定义极简 Effect 类型
- [ ] Effect 只包含无法从状态中获取的信息
- [ ] 定义 `effectsAtFor<P>` 函数（根据节点的"综合观察"推导 Effect）
- [ ] 定义 `runEffectFor<P>` 函数（执行副作用，调用异步 Actor）

---

### ⏳ 步骤 6: 最后统合去冗余 - 统合全局 State、Signal、Effect 类型

**状态**: 待开始

**需要完成**:
- [ ] 合并所有 Channel State 类型，形成全局 State
- [ ] Signal 是各个 Participant Output 的 union
- [ ] Effect 是各个 Participant Effect 的 union
- [ ] 定义从全局 State 推导每个 Channel State 的函数
- [ ] 统合所有 transition、effectsAt、runEffect 函数

---

### ⏳ 步骤 7: 精巧模型便在手 - 创建 createTripletAgentMoorex 工厂函数

**状态**: 待开始

**需要完成**:
- [ ] 创建 `createTripletAgentMoorex` 工厂函数
- [ ] 函数接受配置参数（renderUI callback、LLM client、tool executor 等）
- [ ] 返回配置好的 Moorex 实例
- [ ] 支持状态序列化和恢复

---

## 文件结构

```
packages/triplet-agent/
├── package.json          ✅ 已创建
├── tsconfig.json         ✅ 已创建
├── README.md             ✅ 已更新
├── PROGRESS.md           ✅ 本文件
└── src/
    ├── index.ts          ✅ 已创建（导出所有类型和常量）
    ├── participants.ts   ✅ 步骤 1 完成
    ├── io.ts             ✅ 步骤 2 完成
    └── channels.ts       ✅ 步骤 3 完成
```

---

## 下一步行动

1. 开始步骤 4：为每条 Channel 定义 State Schema 和 transition 函数
2. 确保所有 State 都可以序列化
3. transition 函数必须是纯函数，使用 mutative 进行不可变更新

---

## 注意事项

- 所有类型定义要完整，避免使用 `any`
- 使用 Discriminated Union 类型区分不同的信号和副作用
- 确保所有状态都可以序列化
- 纯函数原则：transition 和 effectsAt 必须是纯函数
- 副作用只在 runEffect 中执行

