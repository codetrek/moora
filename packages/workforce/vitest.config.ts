import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 解决依赖包的 path alias
      '@moora/agent-worker': path.resolve(__dirname, '../agent-worker/src'),
      '@moora/agent-common': path.resolve(__dirname, '../agent-common/src'),
      '@moora/automata': path.resolve(__dirname, '../automata/src'),
      '@moora/effects': path.resolve(__dirname, '../effects/src'),
      '@moora/pub-sub': path.resolve(__dirname, '../pub-sub/src'),
      '@moora/toolkit': path.resolve(__dirname, '../toolkit/src'),
    },
  },
});
