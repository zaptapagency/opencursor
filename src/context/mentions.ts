import * as vscode from 'vscode';
import type { MentionDTO, MentionSuggestion } from '../shared/messages';
import type { BudgetedItem } from './tokenBudget';
import { fitToBudget } from './tokenBudget';
import type { Retriever } from './retriever';

// Resolves @file / @folder / @codebase mentions into real content to inject
// into the prompt, and powers @-mention autocomplete.

const MENTION_RE = /@(codebase|[^\s@]+)/g;

/** Pure extraction of mention tokens from raw user text. */
export function parseMentions(text: string): MentionDTO[] {
  const out: MentionDTO[] = [];
  let match: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((match = MENTION_RE.exec(text)) !== null) {
    const raw = match[1];
    if (raw === 'codebase') {
      out.push({ kind: 'codebase', value: 'codebase' });
    } else if (raw.endsWith('/')) {
      out.push({ kind: 'folder', value: raw.replace(/\/+$/, '') });
    } else {
      out.push({ kind: 'file', value: raw });
    }
  }
  return out;
}

export class MentionResolver {
  constructor(private readonly retriever: Retriever) {}

  /** Autocomplete candidates for the text typed after an `@`. */
  async suggest(query: string): Promise<MentionSuggestion[]> {
    const suggestions: MentionSuggestion[] = [];
    const q = query.trim();

    if ('codebase'.startsWith(q.toLowerCase())) {
      suggestions.push({
        kind: 'codebase',
        label: '@codebase',
        value: 'codebase',
        description: 'Semantic search across the indexed workspace',
      });
    }

    const glob = q ? `**/*${q}*` : '**/*';
    const uris = await vscode.workspace.findFiles(
      glob,
      '**/{node_modules,.git,dist,out,.vscode-test}/**',
      50,
    );
    const folders = new Set<string>();
    for (const uri of uris) {
      const rel = vscode.workspace.asRelativePath(uri, false);
      suggestions.push({ kind: 'file', label: `@${rel}`, value: rel });
      const dir = rel.includes('/')
        ? rel.slice(0, rel.lastIndexOf('/'))
        : undefined;
      if (dir) {
        folders.add(dir);
      }
    }
    for (const dir of folders) {
      suggestions.push({
        kind: 'folder',
        label: `@${dir}/`,
        value: dir,
        description: 'Folder',
      });
    }
    return suggestions.slice(0, 40);
  }

  /**
   * Resolve mentions into budgeted context items. `@codebase` runs semantic
   * retrieval over the given query text.
   */
  async resolve(
    mentions: MentionDTO[],
    queryText: string,
    maxTokens: number,
  ): Promise<{ items: BudgetedItem[]; notes: string[] }> {
    const raw: BudgetedItem[] = [];
    const notes: string[] = [];

    for (const mention of mentions) {
      try {
        if (mention.kind === 'file') {
          raw.push(await this.readFile(mention.value));
        } else if (mention.kind === 'folder') {
          raw.push(...(await this.readFolder(mention.value)));
        } else {
          raw.push(...(await this.readCodebase(queryText)));
        }
      } catch (err) {
        notes.push(
          `Could not resolve @${mention.value}: ${(err as Error).message}`,
        );
      }
    }

    const budgeted = fitToBudget(raw, maxTokens);
    if (budgeted.skipped.length > 0) {
      notes.push(
        `Context budget exceeded; skipped ${budgeted.skipped.length} item(s).`,
      );
    }
    return { items: budgeted.included, notes };
  }

  private async readFile(rel: string): Promise<BudgetedItem> {
    const uri = await this.firstMatch(rel);
    const bytes = await vscode.workspace.fs.readFile(uri);
    const content = Buffer.from(bytes).toString('utf8');
    return {
      label: rel,
      content: `--- FILE: ${rel} ---\n${content}`,
    };
  }

  private async readFolder(rel: string): Promise<BudgetedItem[]> {
    const uris = await vscode.workspace.findFiles(
      `${rel}/**/*`,
      '**/{node_modules,.git,dist,out}/**',
      25,
    );
    const items: BudgetedItem[] = [];
    for (const uri of uris) {
      const path = vscode.workspace.asRelativePath(uri, false);
      const bytes = await vscode.workspace.fs.readFile(uri);
      items.push({
        label: path,
        content: `--- FILE: ${path} ---\n${Buffer.from(bytes).toString('utf8')}`,
      });
    }
    return items;
  }

  private async readCodebase(query: string): Promise<BudgetedItem[]> {
    const hits = await this.retriever.retrieve(query, 8);
    return hits.map((h) => ({
      label: `${h.path}:${h.startLine}-${h.endLine}`,
      content: `--- CHUNK: ${h.path}:${h.startLine}-${h.endLine} (score ${h.score.toFixed(3)}) ---\n${h.text}`,
    }));
  }

  private async firstMatch(rel: string): Promise<vscode.Uri> {
    const direct = await vscode.workspace.findFiles(rel, undefined, 1);
    if (direct.length > 0) {
      return direct[0];
    }
    const fuzzy = await vscode.workspace.findFiles(`**/${rel}`, undefined, 1);
    if (fuzzy.length > 0) {
      return fuzzy[0];
    }
    throw new Error('file not found in workspace');
  }
}
