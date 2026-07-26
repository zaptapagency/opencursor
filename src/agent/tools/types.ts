import * as vscode from 'vscode';
import type { ToolDefinition } from '../../llm/provider';
import type { DiffReviewer } from '../../edit/diffReviewer';

// Shared contract for agent tools. Each tool declares a JSON-schema definition
// and an executor that returns an observation string fed back to the model.

export interface ToolContext {
  workspaceRoot: vscode.Uri;
  diffReviewer: DiffReviewer;
  /** Ask the user to approve an action; returns true if approved. */
  requestApproval(title: string, detail: string): Promise<boolean>;
  /** Emit a line of tool output to the visible trace. */
  log(line: string): void;
}

export interface AgentTool {
  readonly definition: ToolDefinition;
  /** Whether this tool must be approved before executing. */
  readonly requiresApproval: boolean;
  execute(args: Record<string, unknown>, ctx: ToolContext): Promise<string>;
}

/** Resolve a workspace-relative path to an absolute Uri, guarding traversal. */
export function resolveWorkspacePath(
  root: vscode.Uri,
  rel: string,
): vscode.Uri {
  const normalized = rel.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.split('/').includes('..')) {
    throw new Error(`Path escapes the workspace: ${rel}`);
  }
  return vscode.Uri.joinPath(root, normalized);
}

export function str(args: Record<string, unknown>, key: string): string {
  const v = args[key];
  if (typeof v !== 'string') {
    throw new Error(`Missing required string argument "${key}"`);
  }
  return v;
}

export function optStr(
  args: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = args[key];
  return typeof v === 'string' ? v : undefined;
}
