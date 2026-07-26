import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';

// A fully-local vector store: in-memory cosine similarity search with JSON
// persistence to disk. This is a reliable, dependency-free stand-in for a
// native vector DB (LanceDB / sqlite-vec) — see README limitations.

export interface VectorRecord {
  id: string;
  path: string;
  startLine: number;
  endLine: number;
  text: string;
  vector: number[];
}

export interface SearchHit {
  record: VectorRecord;
  score: number;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) {
    return 0;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export class VectorStore {
  private records = new Map<string, VectorRecord>();

  constructor(private readonly filePath?: string) {}

  size(): number {
    return this.records.size;
  }

  paths(): Set<string> {
    const set = new Set<string>();
    for (const r of this.records.values()) {
      set.add(r.path);
    }
    return set;
  }

  upsert(records: VectorRecord[]): void {
    for (const r of records) {
      this.records.set(r.id, r);
    }
  }

  removeByPath(path: string): void {
    for (const [id, r] of this.records) {
      if (r.path === path) {
        this.records.delete(id);
      }
    }
  }

  clear(): void {
    this.records.clear();
  }

  search(queryVector: number[], k: number): SearchHit[] {
    const hits: SearchHit[] = [];
    for (const record of this.records.values()) {
      hits.push({ record, score: cosineSimilarity(queryVector, record.vector) });
    }
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, k);
  }

  async load(): Promise<void> {
    if (!this.filePath) {
      return;
    }
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as VectorRecord[];
      this.records.clear();
      for (const r of parsed) {
        this.records.set(r.id, r);
      }
    } catch {
      // No persisted index yet; start empty.
    }
  }

  async save(): Promise<void> {
    if (!this.filePath) {
      return;
    }
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    await fs.writeFile(
      this.filePath,
      JSON.stringify([...this.records.values()]),
      'utf8',
    );
  }
}
