// Approximate token accounting and budgeting for context injection.
// We use a cheap heuristic (~4 chars/token) rather than a real tokenizer to
// avoid a heavy native dependency; it is intentionally conservative.

export function estimateTokens(text: string): number {
  if (!text) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}

export interface BudgetedItem {
  /** Identifier shown to the user, e.g. a file path. */
  label: string;
  content: string;
}

export interface BudgetResult {
  included: BudgetedItem[];
  /** Items dropped entirely because the budget was exhausted. */
  skipped: BudgetedItem[];
  /** Items whose content was truncated to fit. */
  truncated: string[];
  totalTokens: number;
}

/**
 * Fit items into a token budget in priority order. Items that don't fit whole
 * are truncated (with a marker) if at least `minChunkTokens` can be included;
 * otherwise they're skipped.
 */
export function fitToBudget(
  items: BudgetedItem[],
  maxTokens: number,
  minChunkTokens = 64,
): BudgetResult {
  const included: BudgetedItem[] = [];
  const skipped: BudgetedItem[] = [];
  const truncated: string[] = [];
  let used = 0;

  for (const item of items) {
    const cost = estimateTokens(item.content);
    const remaining = maxTokens - used;
    if (remaining <= 0) {
      skipped.push(item);
      continue;
    }
    if (cost <= remaining) {
      included.push(item);
      used += cost;
    } else if (remaining >= minChunkTokens) {
      const keepChars = remaining * 4;
      const clipped =
        item.content.slice(0, keepChars) +
        '\n… [truncated to fit context budget]';
      included.push({ label: item.label, content: clipped });
      truncated.push(item.label);
      used += remaining;
    } else {
      skipped.push(item);
    }
  }

  return { included, skipped, truncated, totalTokens: used };
}
