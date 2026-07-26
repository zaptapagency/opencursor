import * as vscode from 'vscode';
import { SecretsManager } from '../config/secrets';
import { ModelRegistry, type ModelInfo } from '../config/models';
import { ProviderFactory } from '../llm/factory';
import { EmbeddingService } from '../llm/embeddings';
import type { Provider } from '../llm/provider';
import { VectorStore } from '../context/vectorStore';
import { Retriever } from '../context/retriever';
import { CodebaseIndexer } from '../context/indexer';
import { MentionResolver } from '../context/mentions';
import { DiffReviewer } from '../edit/diffReviewer';

// Central dependency container. Constructed once at activation and shared by
// the chat controller, inline edit, and agent orchestrator.
export class Services {
  readonly secrets: SecretsManager;
  readonly models: ModelRegistry;
  readonly factory: ProviderFactory;
  readonly embeddings: EmbeddingService;
  readonly store: VectorStore;
  readonly retriever: Retriever;
  readonly indexer: CodebaseIndexer;
  readonly mentions: MentionResolver;
  readonly diffReviewer: DiffReviewer;

  constructor(context: vscode.ExtensionContext) {
    this.secrets = new SecretsManager(context.secrets);
    this.models = new ModelRegistry(context.workspaceState);
    this.factory = new ProviderFactory(this.secrets);
    this.embeddings = new EmbeddingService(this.factory);

    const storageRoot = context.storageUri ?? context.globalStorageUri;
    const indexPath = vscode.Uri.joinPath(
      storageRoot,
      'vector-index.json',
    ).fsPath;
    this.store = new VectorStore(indexPath);
    this.retriever = new Retriever(this.store, this.embeddings);
    this.indexer = new CodebaseIndexer(this.store, this.embeddings);
    this.mentions = new MentionResolver(this.retriever);
    this.diffReviewer = new DiffReviewer(context);
  }

  async init(): Promise<void> {
    await this.store.load();
  }

  /** Resolve the active model and a live provider for it. */
  async activeProvider(): Promise<{ provider: Provider; model: ModelInfo }> {
    const model = this.models.getActive();
    const provider = await this.factory.get(model.provider);
    return { provider, model };
  }
}
