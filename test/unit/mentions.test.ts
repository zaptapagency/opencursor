import { describe, it, expect } from 'vitest';
import { parseMentions } from '../../src/context/mentions';

describe('parseMentions', () => {
  it('parses file mentions', () => {
    expect(parseMentions('look at @src/app.ts please')).toEqual([
      { kind: 'file', value: 'src/app.ts' },
    ]);
  });

  it('parses folder mentions (trailing slash)', () => {
    expect(parseMentions('scan @src/utils/ now')).toEqual([
      { kind: 'folder', value: 'src/utils' },
    ]);
  });

  it('parses @codebase', () => {
    expect(parseMentions('where is auth handled @codebase')).toEqual([
      { kind: 'codebase', value: 'codebase' },
    ]);
  });

  it('parses multiple mentions in order', () => {
    expect(parseMentions('@a.ts and @dir/ and @codebase')).toEqual([
      { kind: 'file', value: 'a.ts' },
      { kind: 'folder', value: 'dir' },
      { kind: 'codebase', value: 'codebase' },
    ]);
  });

  it('returns empty for text without mentions', () => {
    expect(parseMentions('no mentions here')).toEqual([]);
  });
});
