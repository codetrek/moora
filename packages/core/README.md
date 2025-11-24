# @moora/core

Core functionality for the moora monorepo.

## Installation

```bash
npm install @moora/core
# or
bun add @moora/core
```

## Usage

```typescript
import { greet, VERSION } from "@moora/core";

console.log(greet("World")); // Hello, World!
console.log(VERSION); // 0.1.0
```

## API

### `greet(name: string): string`

Returns a greeting message.

**Parameters:**
- `name` - The name to greet

**Returns:** A greeting string

### `VERSION`

The current version of the package.
