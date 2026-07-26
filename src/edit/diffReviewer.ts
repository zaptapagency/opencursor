import * as vscode from 'vscode';
import { applyHunks, computeHunks, describeHunk, type Hunk } from './diff';

// Presents proposed file changes as a native diff editor plus a per-hunk
// accept/reject picker, then applies the accepted hunks via WorkspaceEdit.
// Used by both inline edit (Cmd+K) and agent file writes — nothing is written
// to disk without passing through here.

const SCHEME = 'opencursor-proposed';

/** Virtual document provider that serves the proposed (modified) text. */
class ProposedContentProvider implements vscode.TextDocumentContentProvider {
  private readonly contents = new Map<string, string>();
  private readonly emitter = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this.emitter.event;

  set(uri: vscode.Uri, text: string): void {
    this.contents.set(uri.toString(), text);
    this.emitter.fire(uri);
  }

  /** Drop a previously-set entry once its review is done, to avoid unbounded
   * growth across a long-running session with many diff reviews. */
  delete(uri: vscode.Uri): void {
    this.contents.delete(uri.toString());
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.contents.get(uri.toString()) ?? '';
  }
}

export class DiffReviewer {
  private readonly provider = new ProposedContentProvider();
  private counter = 0;

  constructor(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider(
        SCHEME,
        this.provider,
      ),
    );
  }

  /**
   * Show original vs proposed for `target`, let the user pick hunks, and apply
   * the accepted ones. Returns the number of hunks applied (0 = rejected all).
   */
  async review(
    target: vscode.Uri,
    originalText: string,
    proposedText: string,
    title: string,
  ): Promise<number> {
    const hunks = computeHunks(originalText, proposedText);
    if (hunks.length === 0) {
      void vscode.window.showInformationMessage(
        `${title}: no changes proposed.`,
      );
      return 0;
    }

    const previewUri = vscode.Uri.parse(
      `${SCHEME}:/${this.counter++}/${title.replace(/\s+/g, '-')}`,
    );
    this.provider.set(previewUri, proposedText);
    try {
      await vscode.commands.executeCommand(
        'vscode.diff',
        target,
        previewUri,
        `${title} (proposed)`,
        { preview: true },
      );

      const picked = await vscode.window.showQuickPick(
        hunks.map((hunk, index) => ({
          label: `Hunk ${index + 1} @ line ${hunk.originalStart + 1}`,
          detail: describeHunk(hunk, originalText).slice(0, 400),
          picked: true,
          index,
        })),
        {
          canPickMany: true,
          title: `${title} — choose hunks to accept`,
          placeHolder: 'All hunks selected by default; deselect to reject',
        },
      );

      if (!picked || picked.length === 0) {
        return 0;
      }

      const accepted = new Set(picked.map((p) => p.index));
      const finalText = applyHunks(originalText, hunks, accepted);
      await this.writeFile(target, finalText);
      return accepted.size;
    } finally {
      this.provider.delete(previewUri);
    }
  }

  /** Apply full proposed text without prompting (used after explicit accept). */
  async writeFile(target: vscode.Uri, text: string): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    let existing = '';
    try {
      const doc = await vscode.workspace.openTextDocument(target);
      existing = doc.getText();
      const fullRange = new vscode.Range(
        doc.positionAt(0),
        doc.positionAt(existing.length),
      );
      edit.replace(target, fullRange, text);
    } catch {
      edit.createFile(target, { ignoreIfExists: true });
      edit.insert(target, new vscode.Position(0, 0), text);
    }
    await vscode.workspace.applyEdit(edit);
    const doc = await vscode.workspace.openTextDocument(target);
    await doc.save();
  }

  /** Replace only a selection range after a review of just that range. */
  async replaceRange(
    target: vscode.Uri,
    range: vscode.Range,
    text: string,
  ): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(target, range, text);
    await vscode.workspace.applyEdit(edit);
    const doc = await vscode.workspace.openTextDocument(target);
    await doc.save();
  }

  computeHunksFor(original: string, modified: string): Hunk[] {
    return computeHunks(original, modified);
  }
}
