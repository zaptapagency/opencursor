import { describe, it, expect } from 'vitest';
import {
  VectorStore,
  cosineSimilarity,
  type VectorRecord,
} from '../../src/context/vectorStore';

function rec(id: string, path: string, vector: number[]): VectorRecord {
  return { id, path, startLine: 1, endLine: 2, text: id, vector };
}

describe('cosineSimilarity', () => {
  it('is 1 for identical vectors and 0 for orthogonal', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('guards mismatched or empty vectors', () => {
    expect(cosineSimilarity([1, 2], [1])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

describe('VectorStore', () => {
  it('upserts and searches by similarity', () => {
    const store = new VectorStore();
    store.upsert([
      rec('a', 'a.ts', [1, 0, 0]),
      rec('b', 'b.ts', [0, 1, 0]),
      rec('c', 'c.ts', [0.9, 0.1, 0]),
    ]);
    const hits = store.search([1, 0, 0], 2);
    expect(hits[0].record.id).toBe('a');
    expect(hits[1].record.id).toBe('c');
  });

  it('replaces records with the same id', () => {
    const store = new VectorStore();
    store.upsert([rec('a', 'a.ts', [1, 0])]);
    store.upsert([rec('a', 'a.ts', [0, 1])]);
    expect(store.size()).toBe(1);
    expect(store.search([0, 1], 1)[0].score).toBeCloseTo(1);
  });

  it('removes all records for a path', () => {
    const store = new VectorStore();
    store.upsert([rec('a1', 'a.ts', [1, 0]), rec('a2', 'a.ts', [0, 1])]);
    store.removeByPath('a.ts');
    expect(store.size()).toBe(0);
  });
});
