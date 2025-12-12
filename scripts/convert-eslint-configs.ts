#!/usr/bin/env bun

/**
 * Convert .eslintrc.cjs files to eslint.config.js format
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const packagesDir = join(import.meta.dir, '..', 'packages');

// Map package names to config types
const packageConfigs: Record<string, string> = {
  'service-agent-worker': 'node',
  'webui-agent-worker': 'browser',
  // Others use 'base'
};

function convertPackage(packagePath: string) {
  const packageName = packagePath.split('/').pop()!;
  const eslintrcPath = join(packagePath, '.eslintrc.cjs');
  const configPath = join(packagePath, 'eslint.config.cjs');

  if (!existsSync(eslintrcPath)) {
    return;
  }

  const configType = packageConfigs[packageName] || 'base';

  const configContent = `module.exports = [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
      "import": require("eslint-plugin-import"),
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      // ESLint recommended rules
      ...require("eslint/use-at-your-own-risk").builtinRules,

      // TypeScript recommended rules
      ...require("@typescript-eslint/eslint-plugin").configs.recommended.rules,

      // Type imports 必须单独分组
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          fixStyle: "separate-type-imports",
        },
      ],

      // Import 排序规则：先 dependency，再包内；type 和非 type 分开
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling"],
            "index",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
            orderImportKind: "ignore",
          },
          pathGroups: [
            { pattern: "@moora/**", group: "internal", position: "before" },
            { pattern: "@/**", group: "internal", position: "before" },
          ],
          pathGroupsExcludedImportTypes: ["builtin", "type"],
          distinctGroup: false,
        },
      ],

      // Import rules
      "import/no-unused-modules": "off",
      "import/no-unresolved": "error",

      // TypeScript specific rules
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    ignores: ["dist", "node_modules", "*.config.*", "*.d.ts"],
  },
];`;

  writeFileSync(configPath, configContent);
  unlinkSync(eslintrcPath);

  console.log(`Converted ${packageName} to eslint.config.cjs`);
}

function main() {
  const packages = readdirSync(packagesDir)
    .map(name => join(packagesDir, name))
    .filter(dir => statSync(dir).isDirectory());

  for (const packagePath of packages) {
    convertPackage(packagePath);
  }

  console.log('All ESLint configs converted!');
}

if (import.meta.main) {
  main();
}