import * as vscode from 'vscode';
import {
  optStr,
  resolveWorkspacePath,
  type AgentTool,
  type ToolContext,
} from './types';

// Lists the entries of a workspace directory.
export const listDirTool: AgentTool = {
  requiresApproval: false,
  definition: {
    name: 'list_dir',
    description: 'List files and subdirectories of a workspace directory.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Workspace-relative directory (default: root)',
        },
      },
    },
  },
  async execute(args, ctx: ToolContext): Promise<string> {
    const rel = optStr(args, 'path') ?? '.';
    const uri =
      rel === '.' ? ctx.workspaceRoot : resolveWorkspacePath(ctx.workspaceRoot, rel);
    const entries = await vscode.workspace.fs.readDirectory(uri);
    if (entries.length === 0) {
      return `Directory ${rel} is empty.`;
    }
    const lines = entries
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, type]) =>
        type === vscode.FileType.Directory ? `${name}/` : name,
      );
    return `Contents of ${rel}:\n${lines.join('\n')}`;
  },
};
