/**
 * @moora/agent-service
 *
 * Agent Service 启动入口
 */

import "dotenv/config";
import { createService } from "./server/create";

// 从环境变量读取配置
const llmEndpointUrl = process.env.LLM_ENDPOINT_URL || "https://api.openai.com/v1";
const llmApiKey = process.env.LLM_API_KEY;
const llmModel = process.env.LLM_MODEL || "gpt-4";
const systemPrompt = process.env.SYSTEM_PROMPT || "You are a helpful assistant.";
const port = parseInt(process.env.PORT || "3000", 10);

// 验证必需的环境变量
if (!llmApiKey) {
  console.error("Error: LLM_API_KEY environment variable is required");
  process.exit(1);
}

// 创建并启动服务
const app = createService({
  openai: {
    endpoint: {
      url: llmEndpointUrl,
      key: llmApiKey,
    },
    model: llmModel,
  },
  prompt: systemPrompt,
});

app.listen(port, () => {
  console.log(`🚀 Agent Service is running on http://localhost:${port}`);
});

