import type { AgentTool } from './tools/types';

// Approval policy: which tool calls require explicit user confirmation.
// Read-only tools run freely; anything that mutates files or runs commands is
// gated. A user may switch to "auto-approve" for a session, but writes still
// pass through the diff reviewer regardless.

export type ApprovalMode = 'default' | 'auto';

export function needsApproval(tool: AgentTool, mode: ApprovalMode): boolean {
  if (!tool.requiresApproval) {
    return false;
  }
  return mode !== 'auto';
}

/** One-line human summary of a pending tool call for the approval prompt. */
export function summarizeCall(
  name: string,
  args: Record<string, unknown>,
): string {
  switch (name) {
    case 'run_terminal':
      return `Run: ${String(args.command ?? '')}`;
    case 'write_file':
      return `Write file: ${String(args.path ?? '')}`;
    default:
      return `${name}(${Object.keys(args).join(', ')})`;
  }
}
