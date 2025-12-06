#!/usr/bin/env bun

/**
 * 启动 Agent Service
 */

import { join } from "path";
import { $ } from "bun";

const args = process.argv.slice(2);
const watch = args.includes("--watch") || args.includes("-w");
const script = watch ? "dev" : "start";

const rootDir = process.cwd();
const serviceDir = join(rootDir, "packages", "agent-service");

async function startService() {
  try {
    console.log(`🚀 Starting Agent Service (${watch ? "watch" : "production"} mode)...`);
    console.log(`📦 Package: @moora/agent-service`);
    console.log(`📁 Directory: ${serviceDir}\n`);

    // 切换到服务目录并执行启动命令
    const originalCwd = process.cwd();
    process.chdir(serviceDir);

    try {
      await $`bun run ${script}`;
    } finally {
      process.chdir(originalCwd);
    }
  } catch (error: any) {
    const errorMessage = error?.stderr?.toString() || error?.message || "Unknown error";
    console.error(`❌ Failed to start service: ${errorMessage}`);
    process.exit(1);
  }
}

startService();

