import { defineConfig } from '@vscode/test-cli';

// Integration tests run inside a real VS Code instance via @vscode/test-electron.
export default defineConfig({
  files: 'test/integration/**/*.test.js',
  version: 'stable',
  mocha: {
    ui: 'bdd',
    timeout: 60000,
  },
});
