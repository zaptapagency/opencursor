import * as vscode from 'vscode';
import {
  resolveWorkspacePath,
  str,
  type AgentTool,
  type ToolContext,
} from './types';

// Proposes writing/replacing a file. The change is ALWAYS surfaced as a
// reviewable diff via DiffReviewer; nothing is written silently.
export const writeFileTool: AgentTool = {
  requiresApproval: true,
  definition: {
    name: 'write_file',
    description:
      'Create or overwrite a file with new content. The user reviews the diff and accepts/rejects hunks before anything is written.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Workspace-relative file path' },
        content: { type: 'string', description: 'Full new file content' },
      },
      required: ['path', 'content'],
    },
  },
  async execute(args, ctx: ToolContext): Promise<string> {
    const rel = str(args, 'path');
    const content = str(args, 'content');
    const uri = resolveWorkspacePath(ctx.workspaceRoot, rel);

    let original = '';
    let existed = true;
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      original = doc.getText();
    } catch {
      existed = false;
    }

    const applied = await ctx.diffReviewer.review(
      uri,
      original,
      content,
      `Agent write: ${rel}`,
    );
    if (applied === 0) {
      return `User rejected all changes to ${rel}; file left unchanged.`;
    }
    return `${existed ? 'Updated' : 'Created'} ${rel} (${applied} hunk(s) applied).`;
  },
};
