// Line-level diff and hunk logic shared by inline edit (Cmd+K) and agent file
// writes. Pure functions here are unit-tested; presentation lives in
// diffReviewer.ts.

export interface Hunk {
  /** 0-based line index in the original where the hunk begins. */
  originalStart: number;
  /** Number of original lines replaced (may be 0 for pure insertion). */
  originalLines: number;
  /** Replacement lines (may be empty for pure deletion). */
  modifiedText: string[];
}

type Op = { type: 'eq' | 'del' | 'ins'; line: string };

// The LCS DP below is O(n*m) time and space. Real edits typically touch a
// small contiguous region of a file, so we trim the common prefix/suffix
// first — this keeps the DP tiny for the common case. If the remaining
// differing region is still pathologically large, we fall back to a single
// coarse replace instead of risking a multi-second hang or OOM.
const MAX_DP_CELLS = 4_000_000;

/** Line diff producing an ordered op list, robust on large inputs. */
function diffLines(a: string[], b: string[]): Op[] {
  let start = 0;
  const maxPrefix = Math.min(a.length, b.length);
  while (start < maxPrefix && a[start] === b[start]) {
    start++;
  }

  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const prefix: Op[] = a
    .slice(0, start)
    .map((line) => ({ type: 'eq' as const, line }));
  const suffix: Op[] = a
    .slice(endA)
    .map((line) => ({ type: 'eq' as const, line }));
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);

  const middleOps: Op[] =
    midA.length * midB.length > MAX_DP_CELLS
      ? [
          ...midA.map((line) => ({ type: 'del' as const, line })),
          ...midB.map((line) => ({ type: 'ins' as const, line })),
        ]
      : diffLinesLcs(midA, midB);

  return [...prefix, ...middleOps, ...suffix];
}

/** Classic O(n*m) longest-common-subsequence line diff. */
function diffLinesLcs(a: string[], b: string[]): Op[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'eq', line: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'del', line: a[i] });
      i++;
    } else {
      ops.push({ type: 'ins', line: b[j] });
      j++;
    }
  }
  while (i < n) {
    ops.push({ type: 'del', line: a[i++] });
  }
  while (j < m) {
    ops.push({ type: 'ins', line: b[j++] });
  }
  return ops;
}

/** Group a line diff into contiguous change hunks. */
export function computeHunks(original: string, modified: string): Hunk[] {
  const a = original.split('\n');
  const b = modified.split('\n');
  const ops = diffLines(a, b);
  const hunks: Hunk[] = [];
  let origIndex = 0;
  let current: Hunk | null = null;

  for (const op of ops) {
    if (op.type === 'eq') {
      if (current) {
        hunks.push(current);
        current = null;
      }
      origIndex++;
    } else {
      if (!current) {
        current = {
          originalStart: origIndex,
          originalLines: 0,
          modifiedText: [],
        };
      }
      if (op.type === 'del') {
        current.originalLines++;
        origIndex++;
      } else {
        current.modifiedText.push(op.line);
      }
    }
  }
  if (current) {
    hunks.push(current);
  }
  return hunks;
}

/**
 * Apply the selected subset of hunks to the original text. `accepted` is a set
 * of hunk indices; unaccepted hunks are left as the original lines.
 */
export function applyHunks(
  original: string,
  hunks: Hunk[],
  accepted: Set<number>,
): string {
  const lines = original.split('\n');
  const out: string[] = [];
  let cursor = 0;
  hunks.forEach((hunk, index) => {
    while (cursor < hunk.originalStart) {
      out.push(lines[cursor++]);
    }
    if (accepted.has(index)) {
      out.push(...hunk.modifiedText);
    } else {
      for (let k = 0; k < hunk.originalLines; k++) {
        out.push(lines[cursor + k]);
      }
    }
    cursor += hunk.originalLines;
  });
  while (cursor < lines.length) {
    out.push(lines[cursor++]);
  }
  return out.join('\n');
}

/** Human-readable unified-style summary of a hunk for review UIs. */
export function describeHunk(hunk: Hunk, original: string): string {
  const lines = original.split('\n');
  const removed = lines
    .slice(hunk.originalStart, hunk.originalStart + hunk.originalLines)
    .map((l) => `- ${l}`);
  const added = hunk.modifiedText.map((l) => `+ ${l}`);
  return [...removed, ...added].join('\n');
}
