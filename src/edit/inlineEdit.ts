import * as vscode from 'vscode';
import type { Services } from '../core/services';
import { streamText, stripCodeFence } from '../llm/complete';

// Cmd/Ctrl+K inline edit: take the selected code + an instruction, stream a
// rewrite from the model, and review the result as a per-hunk diff before
// applying anything.
export class InlineEditController {
  constructor(private readonly services: Services) {}

  async run(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showWarningMessage('opencursor: open a file first.');
      return;
    }

    let selection: vscode.Range = editor.selection;
    if (selection.isEmpty) {
      selection = editor.document.lineAt(editor.selection.active.line).range;
    }
    const original = editor.document.getText(selection);
    if (!original.trim()) {
      void vscode.window.showWarningMessage('opencursor: select code to edit.');
      return;
    }

    const instruction = await vscode.window.showInputBox({
      title: 'opencursor: Inline Edit',
      prompt: 'Describe the change to make to the selected code',
      placeHolder: 'e.g. add JSDoc and handle the null case',
      ignoreFocusOut: true,
    });
    if (!instruction) {
      return;
    }

    const { provider, model } = await this.services.activeProvider();
    const language = editor.document.languageId;

    const newCode = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'opencursor editing…' },
      async () => {
        const raw = await streamText(provider, {
          model: model.id,
          system:
            'You are a precise code-editing assistant. Rewrite the user code per the instruction. Return ONLY the replacement code with no explanation and no Markdown fences.',
          messages: [
            {
              role: 'user',
              content: `Language: ${language}\nInstruction: ${instruction}\n\nCode:\n${original}`,
            },
          ],
          temperature: 0,
        });
        return stripCodeFence(raw);
      },
    );

    if (newCode.trim() === original.trim()) {
      void vscode.window.showInformationMessage(
        'opencursor: model returned no changes.',
      );
      return;
    }

    // Build a whole-document proposal so hunks map to real file positions.
    const fullOriginal = editor.document.getText();
    const proposed =
      fullOriginal.slice(0, editor.document.offsetAt(selection.start)) +
      newCode +
      fullOriginal.slice(editor.document.offsetAt(selection.end));

    const applied = await this.services.diffReviewer.review(
      editor.document.uri,
      fullOriginal,
      proposed,
      'Inline Edit',
    );
    if (applied > 0) {
      void vscode.window.showInformationMessage(
        `opencursor: applied ${applied} hunk(s).`,
      );
    }
  }
}
