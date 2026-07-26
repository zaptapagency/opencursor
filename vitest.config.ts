import { defineConfig } from 'vitest/config';

// Unit tests for pure logic. The `vscode` module is mocked so host code that
// imports it can be unit-tested outside the Extension Development Host.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/unit/**/*.test.ts'],
    alias: {
      vscode: new URL('./test/unit/mocks/vscode.ts', import.meta.url).pathname,
    },
  },
});
