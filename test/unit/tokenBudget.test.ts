import { describe, it, expect } from 'vitest';
import { estimateTokens, fitToBudget } from '../../src/context/tokenBudget';

describe('token budget', () => {
  it('estimates tokens roughly by length', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('a'.repeat(400))).toBe(100);
  });

  it('includes items that fit and skips the rest', () => {
    const items = [
      { label: 'a', content: 'x'.repeat(40) }, // 10 tokens
      { label: 'b', content: 'y'.repeat(40) }, // 10 tokens
      { label: 'c', content: 'z'.repeat(40) }, // 10 tokens
    ];
    const res = fitToBudget(items, 15, 4);
    expect(res.included[0].label).toBe('a');
    // Second item is partially truncated to fit remaining budget.
    expect(res.included.length).toBeGreaterThanOrEqual(1);
    expect(res.totalTokens).toBeLessThanOrEqual(15);
  });

  it('truncates an oversized item when enough budget remains', () => {
    const items = [{ label: 'big', content: 'q'.repeat(4000) }];
    const res = fitToBudget(items, 100, 64);
    expect(res.truncated).toContain('big');
    expect(res.included[0].content).toContain('truncated');
  });

  it('skips items entirely when budget is exhausted', () => {
    const items = [
      { label: 'a', content: 'x'.repeat(4000) },
      { label: 'b', content: 'y'.repeat(400) },
    ];
    const res = fitToBudget(items, 20, 64);
    expect(res.skipped.map((i) => i.label)).toContain('b');
  });
});
