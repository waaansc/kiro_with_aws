import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['lambda/**/*.ts'],
      exclude: ['lambda/**/*.test.ts'],
    },
  },
  resolve: {
    alias: {
      '@shared': './lambda/shared',
    },
  },
});
