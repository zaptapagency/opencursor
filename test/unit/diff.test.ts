import { describe, it, expect } from 'vitest';
import { computeHunks, applyHunks } from '../../src/edit/diff';

describe('diff hunks', () => {
  it('detects a single changed line', () => {
    const hunks = computeHunks('a\nb\nc', 'a\nB\nc');
    expect(hunks).toHaveLength(1);
    expect(hunks[0].originalStart).toBe(1);
    expect(hunks[0].originalLines).toBe(1);
    expect(hunks[0].modifiedText).toEqual(['B']);
  });

  it('applying an accepted hunk yields the modified text', () => {
    const original = 'a\nb\nc';
    const modified = 'a\nB\nc';
    const hunks = computeHunks(original, modified);
    expect(applyHunks(original, hunks, new Set([0]))).toBe(modified);
  });

  it('rejecting a hunk keeps the original', () => {
    const original = 'a\nb\nc';
    const hunks = computeHunks(original, 'a\nB\nc');
    expect(applyHunks(original, hunks, new Set())).toBe(original);
  });

  it('handles insertions and deletions', () => {
    const original = 'one\ntwo\nthree';
    const modified = 'one\ntwo\ntwo-and-half\nthree';
    const hunks = computeHunks(original, modified);
    expect(applyHunks(original, hunks, new Set([0]))).toBe(modified);
  });

  it('supports selectively applying one of several hunks', () => {
    const original = 'a\nb\nc\nd\ne';
    const modified = 'A\nb\nc\nd\nE';
    const hunks = computeHunks(original, modified);
    expect(hunks).toHaveLength(2);
    expect(applyHunks(original, hunks, new Set([0]))).toBe('A\nb\nc\nd\ne');
    expect(applyHunks(original, hunks, new Set([1]))).toBe('a\nb\nc\nd\nE');
  });

  it('isolates a small hunk in a large file via prefix/suffix trimming', () => {
    const lines = Array.from({ length: 500 }, (_, i) => `line ${i}`);
    const original = lines.join('\n');
    const modified = lines
      .map((l, i) => (i === 250 ? 'CHANGED' : l))
      .join('\n');
    const hunks = computeHunks(original, modified);
    expect(hunks).toHaveLength(1);
    expect(hunks[0].originalStart).toBe(250);
    expect(applyHunks(original, hunks, new Set([0]))).toBe(modified);
  });

  it('falls back to a coarse whole-region replace for pathologically large diffs', () => {
    // No common prefix/suffix and large enough to exceed MAX_DP_CELLS, so the
    // implementation should skip the O(n*m) DP entirely rather than hang.
    const size = 2100;
    const original = Array.from({ length: size }, (_, i) => `orig-${i}`).join('\n');
    const modified = Array.from({ length: size }, (_, i) => `new-${i}`).join('\n');
    const start = Date.now();
    const hunks = computeHunks(original, modified);
    expect(Date.now() - start).toBeLessThan(2000);
    expect(applyHunks(original, hunks, new Set(hunks.map((_, i) => i)))).toBe(
      modified,
    );
  });
});
