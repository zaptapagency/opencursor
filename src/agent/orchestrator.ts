import * as vscode from 'vscode';
import type { Services } from '../core/services';
import type { AgentStepDTO } from '../shared/messages';
import type { ChatMessage, ToolCall } from '../llm/provider';
import { toolMap, type ToolContext } from './tools';
import { needsApproval, summarizeCall, type ApprovalMode } from './approval';

export interface AgentCallbacks {
  onStep(step: AgentStepDTO): void;
  onStepUpdate(
    id: string,
    status: AgentStepDTO['status'],
    detail?: string,
  ): void;
  onText(delta: string): void;
  requestApproval(title: string, detail: string): Promise<boolean>;
}

const MAX_ITERATIONS = 12;

const SYSTEM_PROMPT = `You are opencursor's autonomous coding agent working inside a real VS Code workspace.
Plan briefly, then use the provided tools to accomplish the task step by step.
Rules:
- Inspect the codebase with read_file/list_dir/search_code before editing.
- Make all file changes with write_file (the user reviews a diff).
- Run commands (tests, builds) with run_terminal and read the output before concluding.
- After each tool result, decide the next step. When the task is complete, stop calling tools and give a concise final summary of what you changed.`;

// The agentic loop: plan -> call tool -> observe -> repeat, emitting a visible
// step trace and streaming the final answer.
export class AgentOrchestrator {
  private stepSeq = 0;

  constructor(private readonly services: Services) {}

  private nextId(): string {
    return `step-${Date.now()}-${this.stepSeq++}`;
  }

  async run(
    task: string,
    contextBlock: string,
    approvalMode: ApprovalMode,
    callbacks: AgentCallbacks,
    signal: AbortSignal,
  ): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      throw new Error('Agent mode requires an open workspace folder.');
    }

    const tools = toolMap();
    const { provider, model } = await this.services.activeProvider();
    const toolCtx: ToolContext = {
      workspaceRoot: folder.uri,
      diffReviewer: this.services.diffReviewer,
      requestApproval: callbacks.requestApproval,
      log: (line) => callbacks.onText(`\n\`${line}\`\n`),
    };

    const userContent = contextBlock
      ? `${task}\n\n<context>\n${contextBlock}\n</context>`
      : task;
    const messages: ChatMessage[] = [
      { role: 'user', content: userContent },
    ];

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      if (signal.aborted) {
        return;
      }
      let assistantText = '';
      const pendingCalls: ToolCall[] = [];
      let stop: string = 'end';

      for await (const ev of provider.stream({
        model: model.id,
        system: SYSTEM_PROMPT,
        messages,
        tools: [...tools.values()].map((t) => t.definition),
        signal,
      })) {
        if (ev.type === 'text') {
          assistantText += ev.text;
          callbacks.onText(ev.text);
        } else if (ev.type === 'tool_call') {
          pendingCalls.push(ev.call);
        } else if (ev.type === 'done') {
          stop = ev.stopReason;
        }
      }

      messages.push({
        role: 'assistant',
        content: assistantText,
        toolCalls: pendingCalls.length ? pendingCalls : undefined,
      });

      if (pendingCalls.length === 0 || stop !== 'tool_use') {
        const doneStep = this.nextId();
        callbacks.onStep({
          id: doneStep,
          kind: 'final',
          title: 'Task complete',
          status: 'done',
        });
        return;
      }

      for (const call of pendingCalls) {
        if (signal.aborted) {
          return;
        }
        const result = await this.runOneTool(
          call,
          tools,
          toolCtx,
          approvalMode,
          callbacks,
        );
        messages.push({
          role: 'tool',
          content: result,
          toolCallId: call.id,
        });
      }
    }

    callbacks.onStep({
      id: this.nextId(),
      kind: 'error',
      title: `Stopped after ${MAX_ITERATIONS} iterations`,
      status: 'failed',
    });
  }

  private async runOneTool(
    call: ToolCall,
    tools: Map<string, import('./tools').AgentTool>,
    toolCtx: ToolContext,
    approvalMode: ApprovalMode,
    callbacks: AgentCallbacks,
  ): Promise<string> {
    const stepId = this.nextId();
    const tool = tools.get(call.name);
    const summary = summarizeCall(call.name, call.arguments);

    callbacks.onStep({
      id: stepId,
      kind: 'tool_call',
      title: summary,
      detail: JSON.stringify(call.arguments, null, 2),
      status: 'running',
    });

    if (!tool) {
      callbacks.onStepUpdate(stepId, 'failed', `Unknown tool: ${call.name}`);
      return `Error: unknown tool "${call.name}".`;
    }

    if (needsApproval(tool, approvalMode)) {
      const approved = await callbacks.requestApproval(summary, tool.definition.description);
      if (!approved) {
        callbacks.onStepUpdate(stepId, 'rejected', 'User rejected this action.');
        return `User rejected the ${call.name} call.`;
      }
      callbacks.onStepUpdate(stepId, 'approved');
    }

    try {
      const observation = await tool.execute(call.arguments, toolCtx);
      callbacks.onStepUpdate(stepId, 'done', observation.slice(0, 500));
      return observation;
    } catch (err) {
      const message = (err as Error).message;
      callbacks.onStepUpdate(stepId, 'failed', message);
      return `Error executing ${call.name}: ${message}`;
    }
  }
}
