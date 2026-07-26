import * as vscode from 'vscode';
import type { ProviderId } from './secrets';

// Model catalog and selection state. The active model is persisted in
// workspaceState; API keys live in SecretStorage (see secrets.ts).

export interface ModelInfo {
  provider: ProviderId;
  /** Model id passed to the SDK. */
  id: string;
  label: string;
  /** Rough context window in tokens, used by the token budgeter. */
  contextWindow: number;
  /** Model used for embeddings when this chat model is active. */
  embeddingModel?: string;
}

export const MODELS: ModelInfo[] = [
  {
    provider: 'anthropic',
    id: 'claude-opus-4-6',
    label: 'Claude Opus 4.6 (Anthropic)',
    contextWindow: 200000,
  },
  {
    provider: 'anthropic',
    id: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6 (Anthropic)',
    contextWindow: 200000,
  },
  {
    provider: 'openai',
    id: 'gpt-4o',
    label: 'GPT-4o (OpenAI)',
    contextWindow: 128000,
    embeddingModel: 'text-embedding-3-small',
  },
  {
    provider: 'openai',
    id: 'gpt-4o-mini',
    label: 'GPT-4o mini (OpenAI)',
    contextWindow: 128000,
    embeddingModel: 'text-embedding-3-small',
  },
];

const ACTIVE_MODEL_KEY = 'opencursor.activeModel';
const DEFAULT_MODEL_ID = 'claude-opus-4-6';
/** Embeddings always require OpenAI; this is the default embedding model. */
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

export function findModel(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id);
}

export class ModelRegistry {
  constructor(private readonly state: vscode.Memento) {}

  getActive(): ModelInfo {
    const id = this.state.get<string>(ACTIVE_MODEL_KEY, DEFAULT_MODEL_ID);
    return findModel(id) ?? MODELS[0];
  }

  async setActive(id: string): Promise<void> {
    await this.state.update(ACTIVE_MODEL_KEY, id);
  }

  /** Show a QuickPick and persist the chosen model. Returns the new model. */
  async pick(): Promise<ModelInfo | undefined> {
    const active = this.getActive();
    const items = MODELS.map((m) => ({
      label: m.label,
      description: m.id === active.id ? '(current)' : undefined,
      model: m,
    }));
    const chosen = await vscode.window.showQuickPick(items, {
      title: 'Select opencursor model',
      placeHolder: 'Choose a model for chat and agent mode',
    });
    if (chosen) {
      await this.setActive(chosen.model.id);
      return chosen.model;
    }
    return undefined;
  }
}
