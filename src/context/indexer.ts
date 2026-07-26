import * as vscode from 'vscode';
import { createHash } from 'node:crypto';
import type { EmbeddingService } from '../llm/embeddings';
import type { VectorStore, VectorRecord } from './vectorStore';
import { chunkSource, languageFromPath } from './chunker';

// Chunks the workspace with the heuristic chunker, embeds chunks in batches,
// and upserts them into the local vector store. Supports incremental re-index
// of a single file (on save) and a full workspace index with progress.

const INDEXABLE_GLOB = '**/*.{ts,tsx,js,jsx,mjs,cjs,py,go,rs,json,md}';
const EXCLUDE_GLOB = '**/{node_modules,.git,dist,out,.vscode-test,build,coverage}/**';
const EMBED_BATCH = 64;
const MAX_FILE_BYTES = 200_000;

export class CodebaseIndexer {
  constructor(
    private readonly store: VectorStore,
    private readonly embeddings: EmbeddingService,
  ) {}

  private chunkFile(path: string, text: string): Omit<VectorRecord, 'vector'>[] {
    const chunks = chunkSource(text, languageFromPath(path));
    return chunks.map((c) => ({
      id: hashId(path, c.startLine, c.endLine),
      path,
      startLine: c.startLine,
      endLine: c.endLine,
      text: c.text,
    }));
  }

  private async embedAndUpsert(
    pending: Omit<VectorRecord, 'vector'>[],
  ): Promise<void> {
    for (let i = 0; i < pending.length; i += EMBED_BATCH) {
      const batch = pending.slice(i, i + EMBED_BATCH);
      const vectors = await this.embeddings.embed(batch.map((b) => b.text));
      this.store.upsert(
        batch.map((b, j) => ({ ...b, vector: vectors[j] })),
      );
    }
  }

  /** Re-index a single file (used for incremental updates on save). */
  async indexFile(uri: vscode.Uri): Promise<number> {
    const rel = vscode.workspace.asRelativePath(uri, false);
    let bytes: Uint8Array;
    try {
      bytes = await vscode.workspace.fs.readFile(uri);
    } catch {
      this.store.removeByPath(rel);
      return 0;
    }
    if (bytes.byteLength > MAX_FILE_BYTES) {
      return 0;
    }
    const text = Buffer.from(bytes).toString('utf8');
    this.store.removeByPath(rel);
    const pending = this.chunkFile(rel, text);
    await this.embedAndUpsert(pending);
    await this.store.save();
    return pending.length;
  }

  /** Full workspace index with a VS Code progress notification. */
  async indexWorkspace(
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken,
  ): Promise<{ files: number; chunks: number }> {
    const uris = await vscode.workspace.findFiles(INDEXABLE_GLOB, EXCLUDE_GLOB);
    this.store.clear();
    let chunkCount = 0;
    const step = uris.length > 0 ? 100 / uris.length : 100;

    for (let i = 0; i < uris.length; i++) {
      if (token.isCancellationRequested) {
        break;
      }
      const uri = uris[i];
      const rel = vscode.workspace.asRelativePath(uri, false);
      progress.report({
        message: `Indexing ${rel} (${i + 1}/${uris.length})`,
        increment: step,
      });
      const bytes = await vscode.workspace.fs.readFile(uri);
      if (bytes.byteLength > MAX_FILE_BYTES) {
        continue;
      }
      const text = Buffer.from(bytes).toString('utf8');
      const pending = this.chunkFile(rel, text);
      await this.embedAndUpsert(pending);
      chunkCount += pending.length;
    }

    await this.store.save();
    return { files: uris.length, chunks: chunkCount };
  }
}

function hashId(path: string, start: number, end: number): string {
  return createHash('sha1')
    .update(`${path}:${start}:${end}`)
    .digest('hex')
    .slice(0, 16);
}
