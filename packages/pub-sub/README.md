# @moora/pub-sub

一个简单的发布订阅库，用于管理事件订阅。

## 安装

```bash
npm install @moora/pub-sub
```

## 使用

```typescript
import { createPubSub } from '@moora/pub-sub';

// 创建 pub-sub 实例
const pubsub = createPubSub<string>();

// 订阅
const unsubscribe = pubsub.sub((value) => {
  console.log('Received:', value);
});

// 发布
pubsub.pub('Hello, World!');

// 取消订阅
unsubscribe();
```

## API

### `createPubSub<T>()`

创建一个发布订阅实例。

**类型参数：**
- `T` - 发布的数据类型

**返回值：**
- `PubSub<T>` - 包含 `pub` 和 `sub` 方法的实例

### `PubSub<T>`

发布订阅实例类型。

- `pub(value: T): void` - 发布数据给所有订阅者
- `sub(handler: (value: T) => void): CancelFn` - 订阅数据，返回取消订阅的函数

### 类型

- `CancelFn` - 取消函数类型
- `Unsubscribe` - 取消订阅函数类型（等同于 `CancelFn`）
- `Subscribe<T>` - 订阅函数类型
- `Publish<T>` - 发布函数类型
- `PubSub<T>` - 发布订阅组件类型

## 特性

- 类型安全：完整的 TypeScript 类型支持
- 轻量级：无外部依赖
- 同步执行：发布时同步调用所有订阅者
- 支持多个订阅者：可以同时有多个订阅者
- 取消订阅：支持取消订阅功能

## License

MIT
