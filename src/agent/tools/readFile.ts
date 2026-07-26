import * as vscode from 'vscode';
import {
  resolveWorkspacePath,
  str,
  type AgentTool,
  type ToolContext,
} from './types';

// Reads a workspace file and returns its contents (optionally a line range).
export const readFileTool: AgentTool = {
  requiresApproval: false,
  definition: {
    name: 'read_file',
    description:
      'Read the contents of a file in the workspace. Optionally limit to a line range.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Workspace-relative file path' },
        start_line: { type: 'number', description: '1-based start line' },
        end_line: { type: 'number', description: '1-based end line' },
      },
      required: ['path'],
    },
  },
  async execute(args, ctx: ToolContext): Promise<string> {
    const rel = str(args, 'path');
    const uri = resolveWorkspacePath(ctx.workspaceRoot, rel);
    const bytes = await vscode.workspace.fs.readFile(uri);
    const lines = Buffer.from(bytes).toString('utf8').split('\n');
    const start = typeof args.start_line === 'number' ? args.start_line : 1;
    const end =
      typeof args.end_line === 'number' ? args.end_line : lines.length;
    const slice = lines.slice(Math.max(0, start - 1), end);
    return `File ${rel} (lines ${start}-${Math.min(end, lines.length)}):\n${slice
      .map((l, i) => `${start + i}\t${l}`)
      .join('\n')}`;
  },
};
