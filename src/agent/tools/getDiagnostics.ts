import * as vscode from 'vscode';
import { optStr, type AgentTool } from './types';

const SEVERITY: Record<number, string> = {
  [vscode.DiagnosticSeverity.Error]: 'error',
  [vscode.DiagnosticSeverity.Warning]: 'warning',
  [vscode.DiagnosticSeverity.Information]: 'info',
  [vscode.DiagnosticSeverity.Hint]: 'hint',
};

// Returns current language-server diagnostics for the workspace (or one file).
export const getDiagnosticsTool: AgentTool = {
  requiresApproval: false,
  definition: {
    name: 'get_diagnostics',
    description:
      'Get current diagnostics (errors/warnings) for the workspace or a file.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Optional workspace-relative file to filter to',
        },
      },
    },
  },
  async execute(args): Promise<string> {
    const filter = optStr(args, 'path');
    const all = vscode.languages.getDiagnostics();
    const lines: string[] = [];
    for (const [uri, diags] of all) {
      const rel = vscode.workspace.asRelativePath(uri, false);
      if (filter && !rel.includes(filter)) {
        continue;
      }
      for (const d of diags) {
        lines.push(
          `${rel}:${d.range.start.line + 1}:${d.range.start.character + 1} ${
            SEVERITY[d.severity] ?? 'info'
          }: ${d.message}`,
        );
      }
    }
    return lines.length === 0
      ? 'No diagnostics.'
      : `Diagnostics (${lines.length}):\n${lines.slice(0, 100).join('\n')}`;
  },
};
