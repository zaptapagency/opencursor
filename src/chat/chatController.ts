import * as vscode from 'vscode';
import type { Services } from '../core/services';
import type {
  HostToWebview,
  MentionDTO,
  WebviewToHost,
} from '../shared/messages';
import { assertNever } from '../shared/messages';
import type { ChatMessage } from '../llm/provider';
import { AgentOrchestrator } from '../agent/orchestrator';

// Host-side chat orchestration: manages conversation history, streams model
// output to the webview, resolves @-mentions into context, and delegates agent
// mode to the orchestrator. Owns stop/regenerate/clear.
const CHAT_SYSTEM =
  'You are opencursor, an expert pair-programmer embedded in VS Code. Answer using the provided context when relevant. Use Markdown and fenced code blocks.';

let idSeq = 0;
function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${idSeq++}`;
}

export class ChatController {
  private history: ChatMessage[] = [];
  private abort?: AbortController;
  private lastSend?: { text: string; mentions: MentionDTO[]; mode: 'chat' | 'agent' };
  private readonly agent: AgentOrchestrator;

  constructor(
    private readonly services: Services,
    private readonly post: (msg: HostToWebview) => void,
  ) {
    this.agent = new AgentOrchestrator(services);
  }

  async handle(msg: WebviewToHost): Promise<void> {
    switch (msg.type) {
      case 'ready':
        await this.sendInit();
        return;
      case 'ping':
        this.post({ type: 'pong', text: `echo: ${msg.text}` });
        return;
      case 'chat/send':
        await this.onSend(msg.text, msg.mentions, msg.mode);
        return;
      case 'chat/stop':
        this.abort?.abort();
        return;
      case 'chat/regenerate':
        if (this.lastSend) {
          // Drop the previous assistant turn before regenerating.
          if (this.history.at(-1)?.role === 'assistant') {
            this.history.pop();
          }
          await this.onSend(
            this.lastSend.text,
            this.lastSend.mentions,
            this.lastSend.mode,
            true,
          );
        }
        return;
      case 'chat/clear':
        this.history = [];
        this.post({ type: 'chat/cleared' });
        return;
      case 'chat/pickModel': {
        const picked = await this.services.models.pick();
        if (picked) {
          this.post({
            type: 'chat/modelChanged',
            model: picked.label,
            provider: picked.provider,
          });
        }
        return;
      }
      case 'mentions/query': {
        const suggestions = await this.services.mentions.suggest(msg.query);
        this.post({ type: 'mentions/results', suggestions });
        return;
      }
      default:
        assertNever(msg);
    }
  }

  private async sendInit(): Promise<void> {
    const model = this.services.models.getActive();
    this.post({
      type: 'init',
      version: '0.0.1',
      model: model.label,
      provider: model.provider,
    });
  }

  private async onSend(
    text: string,
    mentions: MentionDTO[],
    mode: 'chat' | 'agent',
    isRegen = false,
  ): Promise<void> {
    this.lastSend = { text, mentions, mode };
    this.abort = new AbortController();

    if (!isRegen) {
      const userId = newId('u');
      this.post({
        type: 'chat/userMessage',
        message: { id: userId, role: 'user', content: text },
      });
    }

    const model = this.services.models.getActive();
    let contextBlock = '';
    if (mentions.length > 0) {
      const budget = Math.floor(model.contextWindow * 0.5);
      const { items, notes } = await this.services.mentions.resolve(
        mentions,
        text,
        budget,
      );
      contextBlock = items.map((i) => i.content).join('\n\n');
      for (const note of notes) {
        this.post({ type: 'chat/error', message: note });
      }
    }

    const assistantId = newId('a');
    this.post({ type: 'chat/assistantStart', id: assistantId });

    try {
      if (mode === 'agent') {
        await this.runAgent(text, contextBlock, assistantId);
      } else {
        await this.runChat(text, contextBlock, assistantId);
      }
    } catch (err) {
      this.post({
        type: 'chat/error',
        message: (err as Error).message,
      });
    } finally {
      this.post({ type: 'chat/assistantEnd', id: assistantId });
    }
  }

  private async runChat(
    text: string,
    contextBlock: string,
    assistantId: string,
  ): Promise<void> {
    const { provider, model } = await this.services.activeProvider();
    const userContent = contextBlock
      ? `<context>\n${contextBlock}\n</context>\n\n${text}`
      : text;
    this.history.push({ role: 'user', content: userContent });

    let full = '';
    for await (const ev of provider.stream({
      model: model.id,
      system: CHAT_SYSTEM,
      messages: this.history,
      signal: this.abort!.signal,
    })) {
      if (ev.type === 'text') {
        full += ev.text;
        this.post({
          type: 'chat/assistantDelta',
          id: assistantId,
          delta: ev.text,
        });
      }
    }
    this.history.push({ role: 'assistant', content: full });
  }

  private async runAgent(
    text: string,
    contextBlock: string,
    assistantId: string,
  ): Promise<void> {
    await this.agent.run(
      text,
      contextBlock,
      'default',
      {
        onStep: (step) => this.post({ type: 'agent/step', step }),
        onStepUpdate: (stepId, status, detail) =>
          this.post({ type: 'agent/stepUpdate', stepId, status, detail }),
        onText: (delta) =>
          this.post({ type: 'chat/assistantDelta', id: assistantId, delta }),
        requestApproval: async (title, detail) => {
          const choice = await vscode.window.showWarningMessage(
            `opencursor agent wants to: ${title}`,
            { modal: true, detail },
            'Approve',
            'Reject',
          );
          return choice === 'Approve';
        },
      },
      this.abort!.signal,
    );
  }
}
