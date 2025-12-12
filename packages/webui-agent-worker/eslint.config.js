import { browser } from "@moora/eslint-config";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    ...browser[0],
    languageOptions: {
      ...browser[0].languageOptions,
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
];