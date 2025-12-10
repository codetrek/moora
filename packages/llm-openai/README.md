# @moora/llm-openai

OpenAI adapter for the Moora `CallLlm` interface. This package provides a simple way to use OpenAI's Chat Completion API with `@moora/agent-worker`.

## Installation

```bash
bun add @moora/llm-openai
```

## Usage

```typescript
import { createCallLlmWithOpenAI } from '@moora/llm-openai';
import { createAgent, createReaction, createLlmReaction } from '@moora/agent-worker';

// Create OpenAI-based callLlm function
const callLlm = createCallLlmWithOpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  model: 'gpt-4o',
  systemPrompt: 'You are a helpful assistant.',
  temperature: 0.7,  // optional
  topP: 0.9,         // optional
});

// Use with @moora/agent-worker
const reaction = createReaction({
  llm: createLlmReaction({ callLlm }),
  // ... other reactions
});

const agent = createAgent(reaction);
```

## Configuration Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `apiKey` | `string` | ✅ | OpenAI API key |
| `model` | `string` | ✅ | Model name (e.g., "gpt-4o", "gpt-4-turbo") |
| `systemPrompt` | `string` | ✅ | System prompt prepended to all conversations |
| `baseURL` | `string` | ❌ | Custom API endpoint (defaults to OpenAI) |
| `temperature` | `number` | ❌ | Sampling temperature (0-2) |
| `topP` | `number` | ❌ | Top-P (nucleus) sampling parameter (0-1) |

## Custom Endpoint

You can use this adapter with OpenAI-compatible APIs:

```typescript
const callLlm = createCallLlmWithOpenAI({
  apiKey: process.env.API_KEY!,
  baseURL: 'https://your-api-endpoint.com/v1',
  model: 'your-model',
  systemPrompt: 'You are a helpful assistant.',
});
```

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Run tests in watch mode
bun run test:watch
```

## License

MIT
