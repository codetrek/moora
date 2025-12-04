讨论一下 Agent 建模方法论的的优化。写一篇新的 prompt 文档。
之前 @.cursor/prompts/MOOREX_MODELING.prompt.md  的七步建模法虽然清晰，但它是瀑布式的，不是 iterative 的。我们实际工程当中，很有可能无法在一开始就想清楚具体有哪些参与方，有哪些 input/output。改进的方法是，以一个最小实现开始，以追加需求的形式扩展模型。
另外，修改几个概念的命名：
- Participant 改为 Actor，它实际是 Agent 心智需要认知的行为体，比如 User，并不是真的用户，而是用户在 Agent 认知中的投射。
- Channel 改为 Observation，就是 Actor 相互之间的观察，Observation 是被观察 Actor 状态的切片
  - 一个 Actor 的 State 就是对它的 Observation 的并集
  - 一个 Actor 的 Context 就是它的 Observation 的并集
  - 全局的 State 就是所有 Actor State 的并集，也是所有 Actor Context 的并集，因为所有在一个有向图上，所有节点的入边等于所有节点的出边。
- 每个 Actor 的
