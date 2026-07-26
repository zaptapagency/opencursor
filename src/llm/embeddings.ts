import type { ProviderFactory } from './factory';
import { OpenAiProvider } from './openai';
import { DEFAULT_EMBEDDING_MODEL } from '../config/models';

// Embeddings are always served by OpenAI (Anthropic has no embeddings API),
// regardless of the active chat provider. Used by the codebase indexer.
export class EmbeddingService {
  constructor(
    private readonly factory: ProviderFactory,
    private readonly model: string = DEFAULT_EMBEDDING_MODEL,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }
    const provider = await this.factory.get('openai');
    if (!(provider instanceof OpenAiProvider)) {
      throw new Error('Embedding provider must be OpenAI.');
    }
    return provider.embed(texts, this.model);
  }
}
