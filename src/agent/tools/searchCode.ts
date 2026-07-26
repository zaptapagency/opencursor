import { spawn } from 'node:child_process';
import { str, optStr, type AgentTool, type ToolContext } from './types';

// Full-text code search via ripgrep. Returns matching lines with file:line.
export const searchCodeTool: AgentTool = {
  requiresApproval: false,
  definition: {
    name: 'search_code',
    description:
      'Search the workspace for a regex or literal string using ripgrep.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Regex or literal to search' },
        glob: {
          type: 'string',
          description: 'Optional file glob filter, e.g. *.ts',
        },
        max_results: { type: 'number', description: 'Cap results (default 60)' },
      },
      required: ['query'],
    },
  },
  async execute(args, ctx: ToolContext): Promise<string> {
    const query = str(args, 'query');
    const glob = optStr(args, 'glob');
    const max = typeof args.max_results === 'number' ? args.max_results : 60;
    const rgArgs = [
      '--line-number',
      '--no-heading',
      '--color',
      'never',
      '--max-count',
      '20',
    ];
    if (glob) {
      rgArgs.push('--glob', glob);
    }
    rgArgs.push('--', query, '.');

    const output = await runRipgrep(rgArgs, ctx.workspaceRoot.fsPath);
    const lines = output.split('\n').filter(Boolean).slice(0, max);
    if (lines.length === 0) {
      return `No matches for "${query}".`;
    }
    return `Search results for "${query}" (${lines.length} lines):\n${lines.join('\n')}`;
  },
};

async function runRipgrep(args: string[], cwd: string): Promise<string> {
  const { rgPath } = await import('@vscode/ripgrep');
  return new Promise((resolve, reject) => {
    const proc = spawn(rgPath, args, { cwd });
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => (out += d.toString()));
    proc.stderr.on('data', (d) => (err += d.toString()));
    proc.on('error', reject);
    proc.on('close', (code) => {
      // rg exits 1 when there are no matches — not an error for us.
      if (code === 0 || code === 1) {
        resolve(out);
      } else {
        reject(new Error(err || `ripgrep exited with code ${code}`));
      }
    });
  });
}
