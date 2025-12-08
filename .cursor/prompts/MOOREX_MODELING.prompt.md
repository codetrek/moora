# Agent 建模迭代 Prompt

> 从 [AGENT_MODELING_METHODOLOGY.md](../../docs/AGENT_MODELING_METHODOLOGY.md) 提取，聚焦架构、文件结构、迭代方法

## 核心概念

### Actor（行为体）
Agent 心智需要认知的行为体。例如 `User` Actor 是用户在 Agent 认知中的投射。每个 Actor 是独立的 Moore 自动机。

### Observation（观察）
Actor 之间的观察，是被观察 Actor 状态的切片。例如 `UserObLlm` 表示 User 对 Llm 的观察。

- **Appearance**（表现）= 所有指向该 Actor 的 Observation 并集（入边）
- **Perspective**（感知）= 所有该 Actor 发出的 Observation 并集（出边）

## 整体架构

建模目标是设计 Moore 自动机核心要素：

- `type Appearance` - 表现类型
- `type Action` - 动作类型  
- `function initial` - 初始化函数（纯函数）
- `function transition` - 状态转换函数（纯函数）

**注意**：`output` 函数不属于建模，应在使用时通过依赖注入传入。

### 类型定义要点

使用 Zod 4 定义 schema，用 `z.infer` 推导类型：

```typescript
// Actors 枚举
type Actors = 'user' | 'llm'

// Observations
type UserObLlm = { assiMessages: AssiMessages }
type LlmObUser = { userMessages: UserMessages }

// Appearances = 入边 Observation 并集
type AppearanceOfUser = UserObUser & LlmObUser
type AppearanceOfLlm = UserObLlm & LlmObLlm

// Perspectives = 出边 Observation 并集
type PerspectiveOfUser = UserObUser & UserObLlm
type PerspectiveOfLlm = LlmObUser & LlmObLlm

// Actions
type ActionFromUser = SendUserMessage
type ActionFromLlm = SendAssiMessage

// Helper Generics
type AppearanceOf<Actor extends Actors>
type PerspectiveOf<Actor extends Actors>
type ActionFrom<Actor extends Actors>
type InitialFnOf<Actor extends Actors>
type TransitionFnOf<Actor extends Actors>
type ReactionFnOf<Actor extends Actors> = Eff<{ perspective: PerspectiveOf<Actor>; dispatch: Dispatch<Actuation> }>
// 注意：ReactionFnOf 非柯里化设计，允许 reaction 在闭包外层创建，使 stateful 等组合器状态可共享

// Agent 总类型
type Worldscape = AppearanceOfUser & AppearanceOfLlm
type Actuation = ActionFromUser | ActionFromLlm
```

## 文件结构（严格遵循）

```
项目根目录/
│
├── decl/                          # 类型声明目录（固定文件，不增不减）
│   ├── actors.ts                  # Actors 类型和常量
│   ├── observations.ts            # FooObBar 类型 schema + 依赖数据类型
│   ├── appearances.ts             # AppearanceOfFoo 类型 schema
│   ├── perspectives.ts            # PerspectiveOfFoo 类型 schema
│   ├── actions.ts                 # Action 类型 schema
│   ├── helpers.ts                 # Helper Generic 类型
│   ├── agent.ts                   # Worldscape, Actuation, ReactionFns
│   └── index.ts                   # 综合 export
│
├── impl/                          # 实现目录
│   ├── initials/                  # 每个 actor 一个文件
│   │   ├── user.ts
│   │   ├── llm.ts
│   │   └── index.ts
│   │
│   ├── transitions/               # 每个 actor 一个文件
│   │   ├── user.ts                # 多 Action 类型可转文件夹
│   │   ├── llm.ts
│   │   └── index.ts
│   │
│   ├── agent/                     # Agent 综合实现
│   │   ├── initial.ts             # initialAgent
│   │   ├── transition.ts          # transitionAgent
│   │   ├── reaction.ts            # createReactionAgent
│   │   ├── create.ts              # createAgent 工厂函数
│   │   └── index.ts
│   │
│   └── index.ts
│
└── index.ts                       # 项目入口
```

**代码拆分**：单文件过大时可转为同名文件夹，通过 index.ts 综合 export。

## 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 常量 | SNAKE_CASE | `MAX_RETRY` |
| 类型 | PascalCase | `UserObLlm`（非 `UserObLLM`）|
| 函数/变量 | camelCase | `llmActor`（非 `LLMActor`）|
| user 名称 | kebab-case string | `'user'`, `'task-manager'` |

## 迭代式建模流程

### 核心思想

1. **从最小实现开始** - 先实现最简单可运行版本
2. **追加需求扩展** - 根据新需求逐步扩展
3. **每步 Review** - 确保每一步符合需求，避免过度设计

### 迭代四步法

#### Step 1 - 增补 Perspective 和 Action

思考：
1. 是否需要新增 Actor？Perspective 和 Action 是什么？
2. 已有 Actor 是否需要新的 Perspective？
3. 已有 Actor 是否需要新的 Action？

**操作**：
- 定义新类型，写入 `decl/actions.ts`
- 扩展 `ActionFromFoo` 类型
- **暂不定义新 `FooObBar`，暂不扩展 Perspective**

#### Step 2 - 找出新 Observations

对 Step 1 的每个新 Perspective，确定来源 Actor，发现新 Observations。

**操作**：
- 综合去重，确保无冗余
- 创建 `FooObBar` 类型
- 更新 `decl/observations.ts`、`decl/appearances.ts`、`decl/perspectives.ts`

#### Step 3 - 审视 Appearance 与 Action 对应关系

1. 新增 Appearance  检查是否有对应 Action 迭代它
2. 新增 Action  检查是否有对应 Appearance 承接它

**操作**：
- 补充缺失的 Action 或 Observation
- 更新相关类型定义

#### Step 4 - 补充实现代码

**操作**：
- 更新 `impl/initials/` 初始化函数
- 更新 `impl/transitions/` 状态转换函数
- 更新 `impl/agent/` 统合函数
- 确保编译通过，类型检查无误

### 迭代完成检查清单

- [ ] 新增类型定义正确
- [ ] Appearance 和 Action 对应关系完整
- [ ] Observation 无冗余
- [ ] 代码实现符合类型定义
- [ ] 代码编译通过
- [ ] 功能符合需求预期
