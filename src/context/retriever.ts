import type { EmbeddingService } from '../llm/embeddings';
import type { VectorStore } from './vectorStore';

export interface RetrievedChunk {
  path: string;
  startLine: number;
  endLine: number;
  text: string;
  score: number;
}

// Semantic retrieval over the local vector store. Embeds the query and returns
// the top-k most similar indexed chunks.
export class Retriever {
  constructor(
    private readonly store: VectorStore,
    private readonly embeddings: EmbeddingService,
  ) {}

  async retrieve(query: string, k = 8): Promise<RetrievedChunk[]> {
    if (this.store.size() === 0 || !query.trim()) {
      return [];
    }
    const [vector] = await this.embeddings.embed([query]);
    if (!vector) {
      return [];
    }
    return this.store.search(vector, k).map((hit) => ({
      path: hit.record.path,
      startLine: hit.record.startLine,
      endLine: hit.record.endLine,
      text: hit.record.text,
      score: hit.score,
    }));
  }
}
