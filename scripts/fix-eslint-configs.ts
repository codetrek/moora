#!/usr/bin/env bun

/**
 * Fix ESLint configurations to use correct flat config format
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Map package names to config types
const packageConfigs: Record<string, string> = {
  'service-agent-worker': 'node',
  'webui-agent-worker': 'browser',
  // Others use 'base'
};

function fixConfig(packagePath: string) {
  const packageName = packagePath.split('/').pop()!;
  const configPath = join(packagePath, 'eslint.config.js');

  const configType = packageConfigs[packageName] || 'base';

  const configContent = `import { ${configType} } from "@moora/eslint-config";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    ...${configType}[0],
    languageOptions: {
      ...${configType}[0].languageOptions,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
    },
  },
  {
    ignores: ["dist", "node_modules", "*.config.*", "*.d.ts"],
  },
];`;

  writeFileSync(configPath, configContent);
  console.log(`Fixed ${packageName} to use ${configType} config`);
}

function main() {
  const packages = [
    'agent-common',
    'agent-starter',
    'agent-worker',
    'automata',
    'effects',
    'llm-openai',
    'pub-sub',
    'service-agent-worker',
    'toolkit',
    'tools-tavily',
    'webui-agent-worker',
  ];

  for (const packageName of packages) {
    const packagePath = join(import.meta.dir, '..', 'packages', packageName);
    fixConfig(packagePath);
  }

  console.log('All ESLint configs fixed!');
}

if (import.meta.main) {
  main();
}