# 添加新包指南

## 步骤

### 1. 创建包目录结构

```bash
mkdir -p packages/new-package/src
```

### 2. 创建 package.json

```json
{
  "name": "@moora/new-package",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": {
      "bun": "./src/index.ts",
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target node --format esm && bun run build:types",
    "build:types": "tsc --emitDeclarationOnly --outDir dist",
    "prepublishOnly": "bun run build"
  },
  "files": ["dist"],
  "dependencies": {
    "@moora/core": "0.1.0"
  },
  "peerDependencies": {
    "typescript": "^5"
  }
}
```

### 3. 创建 tsconfig.json

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"]
}
```

### 4. 创建源代码

`packages/new-package/src/index.ts`:
```typescript
export function myFunction(): void {
  console.log("Hello from new package!");
}

export const VERSION = "0.1.0";
```

### 5. 更新根 tsconfig.json 的路径映射

在 `tsconfig.json` 的 `paths` 中添加新包：

```json
{
  "compilerOptions": {
    "paths": {
      "@moora/core": ["./packages/core"],
      "@moora/new-package": ["./packages/new-package"]
    }
  }
}
```

**⚠️ 重要：每次添加新包都必须更新这个路径映射，否则其他包无法引用新包。**

### 6. 安装依赖（如果需要）

```bash
bun install
```

### 7. 测试构建

```bash
cd packages/new-package
bun run build
```

## 包间依赖

### 在新包中使用其他包

```typescript
// packages/new-package/src/index.ts
import { greet } from "@moora/core";

export function greetLoud(name: string): string {
  return `${greet(name)}!!!`;
}
```

记得在 `package.json` 中添加依赖：

```json
{
  "dependencies": {
    "@moora/core": "0.1.0"
  }
}
```

### 版本管理

当运行 `bun run prepare-version` 时，脚本会自动：
- ✅ 更新所有包的 version 字段
- ✅ 更新所有 @moora/* 依赖的版本号
- ✅ 保持版本一致性

## 常见问题

### Q: 为什么需要在 tsconfig.json 中配置 paths？

A: Workspace 中的包相互引用时，TypeScript 需要知道 `@moora/package-name` 实际对应哪个目录。`paths` 配置将包名映射到包的根目录，TypeScript 会通过 `package.json` 的 `types` 字段找到类型定义。

### Q: 为什么 module 指向 src 而 main 指向 dist？

A: 这是 Bun package 的最佳实践：
- `module`: Bun 开发时直接使用 TypeScript 源码，无需编译，更快的开发体验
- `main`: Node.js 等其他运行时使用编译后的 JavaScript
- `exports.bun`: 明确告诉 Bun 使用源码
- `exports.import`: 其他环境使用编译后的代码

### Q: 发布时会有问题吗？

A: 不会。发布时 `prepublishOnly` 会先编译代码到 dist 目录，且 `files` 字段只包含 dist，所以发布的包只包含编译后的代码。其他用户安装后使用的是 `main` 字段指向的编译代码。

### Q: 如果忘记更新 paths 会怎样？

A: TypeScript 会报错 "Cannot find module '@moora/new-package'"，其他包将无法引用新包。

## 快速模板

复制这个模板快速创建新包：

```bash
# 设置包名
PACKAGE_NAME="new-package"

# 创建目录
mkdir -p packages/$PACKAGE_NAME/src

# 从现有包复制配置
cp packages/core/package.json packages/$PACKAGE_NAME/package.json
cp packages/core/tsconfig.json packages/$PACKAGE_NAME/tsconfig.json

# 手动编辑 package.json 更新包名
# 手动编辑 tsconfig.json 的 paths
# 创建 src/index.ts
```

然后记得更新根 `tsconfig.json` 的 `paths`！
