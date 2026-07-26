// Language-aware heuristic chunker. Splits source into semantically meaningful
// chunks by detecting top-level declaration boundaries (functions, classes,
// etc.) per language, then packs lines into bounded windows.
//
// NOTE(phase6): This is a heuristic stand-in for Tree-sitter AST chunking. It
// is intentionally dependency-free and works across languages; the intended
// upgrade is web-tree-sitter with per-grammar queries.

export interface Chunk {
  startLine: number;
  endLine: number;
  text: string;
}

const BOUNDARY_PATTERNS: Record<string, RegExp> = {
  ts: /^\s*(export\s+)?(async\s+)?(function|class|interface|type|enum|const|let|var)\b|^\s*(public|private|protected|static)\s/,
  js: /^\s*(export\s+)?(async\s+)?(function|class|const|let|var)\b/,
  py: /^\s*(def|class)\s/,
  go: /^\s*(func|type)\s/,
  rs: /^\s*(pub\s+)?(fn|struct|enum|trait|impl|mod)\b/,
  md: /^#{1,6}\s/,
  json: /^\s*"[^"]+"\s*:/,
};

export function languageFromPath(path: string): string {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'ts';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'js';
    case 'py':
      return 'py';
    case 'go':
      return 'go';
    case 'rs':
      return 'rs';
    case 'md':
    case 'markdown':
      return 'md';
    case 'json':
      return 'json';
    default:
      return 'text';
  }
}

/**
 * Chunk source text. `maxLines` bounds chunk size; boundaries are preferred but
 * a chunk is force-split if it grows beyond `maxLines`.
 */
export function chunkSource(
  text: string,
  language: string,
  maxLines = 80,
  minLines = 5,
): Chunk[] {
  const lines = text.split(/\r?\n/);
  if (lines.length <= minLines) {
    return text.trim()
      ? [{ startLine: 1, endLine: lines.length, text }]
      : [];
  }
  const boundary = BOUNDARY_PATTERNS[language];
  const chunks: Chunk[] = [];
  let start = 0;

  const flush = (end: number) => {
    const slice = lines.slice(start, end);
    const body = slice.join('\n');
    if (body.trim()) {
      chunks.push({ startLine: start + 1, endLine: end, text: body });
    }
    start = end;
  };

  for (let i = 1; i < lines.length; i++) {
    const atBoundary = boundary?.test(lines[i]) ?? false;
    const tooBig = i - start >= maxLines;
    if ((atBoundary && i - start >= minLines) || tooBig) {
      flush(i);
    }
  }
  flush(lines.length);
  return chunks;
}
