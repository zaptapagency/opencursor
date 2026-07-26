import type { MentionDTO } from '../shared/messages';

// Client-side mention parsing (mirrors host mentions.parseMentions but without
// the vscode import so it can run in the webview bundle).
const MENTION_RE = /@(codebase|[^\s@]+)/g;

export function parseMentionsClient(text: string): MentionDTO[] {
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
