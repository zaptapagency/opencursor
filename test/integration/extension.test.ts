import * as assert from 'node:assert';
import * as vscode from 'vscode';

// Runs inside a real VS Code instance via @vscode/test-electron.
// Compiled to test/integration/*.test.js by the pretest esbuild step.
suite('opencursor extension', () => {
  test('activates and registers the hello command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('opencursor.hello'),
      'opencursor.hello command should be registered',
    );
  });

  test('hello command executes without throwing', async () => {
    await vscode.commands.executeCommand('opencursor.hello');
  });
});
