import * as vscode from 'vscode';
import { exec } from 'node:child_process';
import { str, type AgentTool, type ToolContext } from './types';

// Runs a shell command. Requires approval by default and always shows the
// command. Output is captured and returned to the model; it is also echoed to
// a visible integrated terminal so the user can see what ran.
const TIMEOUT_MS = 120_000;
const MAX_OUTPUT = 20_000;

let sharedTerminal: vscode.Terminal | undefined;

function terminal(): vscode.Terminal {
  if (!sharedTerminal || sharedTerminal.exitStatus !== undefined) {
    sharedTerminal = vscode.window.createTerminal('opencursor agent');
  }
  return sharedTerminal;
}

export const runTerminalTool: AgentTool = {
  requiresApproval: true,
  definition: {
    name: 'run_terminal',
    description:
      'Run a shell command in the workspace root and return its output. Requires user approval.',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
      },
      required: ['command'],
    },
  },
  async execute(args, ctx: ToolContext): Promise<string> {
    const command = str(args, 'command');
    const term = terminal();
    term.show(true);
    term.sendText(`# opencursor: ${command}`, true);

    const result = await new Promise<{ code: number; output: string }>(
      (resolve) => {
        exec(
          command,
          {
            cwd: ctx.workspaceRoot.fsPath,
            timeout: TIMEOUT_MS,
            maxBuffer: 10 * 1024 * 1024,
            windowsHide: true,
          },
          (error, stdout, stderr) => {
            const combined = `${stdout}${stderr}`.slice(0, MAX_OUTPUT);
            const code =
              error && typeof (error as { code?: number }).code === 'number'
                ? ((error as { code?: number }).code as number)
                : error
                  ? 1
                  : 0;
            resolve({ code, output: combined });
          },
        );
      },
    );

    ctx.log(`$ ${command} → exit ${result.code}`);
    return `Command: ${command}\nExit code: ${result.code}\nOutput:\n${
      result.output || '(no output)'
    }`;
  },
};
