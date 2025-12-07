# @moora/toolkit

函数式 Toolkit 系统，用于管理工具定义和调用。

## 安装

```bash
bun add @moora/toolkit
```

## 核心概念

### ToolDefinition

工具定义包含以下属性：

- `name`: 工具名称（必须唯一）
- `description`: 工具描述
- `parameterSchema`: 参数的 JSON Schema
- `execute`: 执行函数 `(parameters: string) => Promise<string>`

### Toolkit

Toolkit 接口提供以下能力：

- `getToolNames()`: 获取所有工具名称列表
- `getToolInfo(name)`: 根据名称获取工具详情
- `getAllToolInfos()`: 获取所有工具的详情列表
- `invoke(name, parameters)`: 调用工具
- `hasTool(name)`: 检查工具是否存在

## 使用示例

### 创建 Toolkit

```typescript
import { createToolkit, type ToolDefinition } from '@moora/toolkit';

const tools: ToolDefinition[] = [
  {
    name: 'add',
    description: 'Add two numbers',
    parameterSchema: {
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['a', 'b'],
    },
    execute: async (params) => {
      const { a, b } = JSON.parse(params);
      return JSON.stringify({ result: a + b });
    },
  },
  {
    name: 'multiply',
    description: 'Multiply two numbers',
    parameterSchema: {
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['a', 'b'],
    },
    execute: async (params) => {
      const { a, b } = JSON.parse(params);
      return JSON.stringify({ result: a * b });
    },
  },
];

const mathToolkit = createToolkit(tools);
```

### 调用工具

```typescript
// 获取工具列表
console.log(mathToolkit.getToolNames()); // ['add', 'multiply']

// 获取工具详情
const addInfo = mathToolkit.getToolInfo('add');
console.log(addInfo);
// {
//   name: 'add',
//   description: 'Add two numbers',
//   parameterSchema: { ... }
// }

// 调用工具
const result = await mathToolkit.invoke('add', '{"a": 1, "b": 2}');
console.log(result); // '{"result":3}'
```

### 合并多个 Toolkit

```typescript
import { createToolkit, mergeToolkits } from '@moora/toolkit';

const mathToolkit = createToolkit([/* math tools */]);
const stringToolkit = createToolkit([/* string tools */]);

const combinedToolkit = mergeToolkits([mathToolkit, stringToolkit]);
```

### 创建受限 Toolkit

```typescript
import { createToolkit, restrictToolkit } from '@moora/toolkit';

const fullToolkit = createToolkit([/* all tools */]);

// 黑名单模式：排除指定工具
const safeToolkit = restrictToolkit(fullToolkit, {
  blacklist: ['deleteFile', 'executeCommand'],
});

// 白名单模式：只保留指定工具
const limitedToolkit = restrictToolkit(fullToolkit, {
  whitelist: ['read', 'search'],
});
```

### 创建空 Toolkit

```typescript
import { emptyToolkit } from '@moora/toolkit';

const empty = emptyToolkit();
console.log(empty.getToolNames()); // []
```

## API 参考

### `createToolkit(tools: ToolDefinition[]): Toolkit`

从工具定义列表创建 Toolkit。

### `mergeToolkits(toolkits: Toolkit[]): Toolkit`

合并多个 Toolkit 成为一个功能更全的 Toolkit。

### `restrictToolkit(toolkit: Toolkit, options: FilterOptions): Toolkit`

创建受限的 Toolkit，支持黑名单或白名单模式。

### `emptyToolkit(): Toolkit`

创建一个空的 Toolkit。

## 类型导出

```typescript
import type {
  ToolDefinition,
  ToolExecuteFn,
  ToolInfo,
  Toolkit,
  BlacklistOptions,
  WhitelistOptions,
  FilterOptions,
} from '@moora/toolkit';
```

## License

MIT
