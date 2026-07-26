import type { AgentTool } from './types';
import { readFileTool } from './readFile';
import { listDirTool } from './listDir';
import { searchCodeTool } from './searchCode';
import { getDiagnosticsTool } from './getDiagnostics';
import { writeFileTool } from './writeFile';
import { runTerminalTool } from './runTerminal';

// The full agent tool set, keyed by name.
export const ALL_TOOLS: AgentTool[] = [
  readFileTool,
  listDirTool,
  searchCodeTool,
  getDiagnosticsTool,
  writeFileTool,
  runTerminalTool,
];

export function toolMap(): Map<string, AgentTool> {
  return new Map(ALL_TOOLS.map((t) => [t.definition.name, t]));
}

export type { AgentTool, ToolContext } from './types';
