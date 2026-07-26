import { describe, it, expect } from 'vitest';
import { chunkSource, languageFromPath } from '../../src/context/chunker';

describe('chunker', () => {
  it('maps extensions to languages', () => {
    expect(languageFromPath('a/b.ts')).toBe('ts');
    expect(languageFromPath('x.py')).toBe('py');
    expect(languageFromPath('go/main.go')).toBe('go');
    expect(languageFromPath('README.md')).toBe('md');
    expect(languageFromPath('data.bin')).toBe('text');
  });

  it('returns whole text for tiny inputs', () => {
    const chunks = chunkSource('one\ntwo', 'ts');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].startLine).toBe(1);
  });

  it('splits on declaration boundaries', () => {
    const src = [
      'function a() {',
      '  return 1;',
      '}',
      'function b() {',
      '  return 2;',
      '}',
      'function c() {',
      '  return 3;',
      '}',
    ].join('\n');
    const chunks = chunkSource(src, 'ts', 80, 2);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].text).toContain('function a');
  });

  it('force-splits chunks larger than maxLines', () => {
    const src = Array.from({ length: 50 }, (_, i) => `line ${i}`).join('\n');
    const chunks = chunkSource(src, 'text', 10, 2);
    expect(chunks.length).toBeGreaterThanOrEqual(5);
    for (const c of chunks) {
      expect(c.endLine - c.startLine).toBeLessThanOrEqual(10);
    }
  });
});
