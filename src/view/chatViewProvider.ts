import * as vscode from 'vscode';
import { renderWebviewHtml } from './html';
import type { HostToWebview, WebviewToHost } from '../shared/messages';
import type { Services } from '../core/services';
import { ChatController } from '../chat/chatController';

// Hosts the sidebar chat webview and bridges it to the ChatController.
export class ChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'opencursor.chat';

  private view?: vscode.WebviewView;
  private controller?: ChatController;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly services: Services,
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    // Note: `retainContextWhenHidden` is not a WebviewOptions property for
    // WebviewView — it must be passed to registerWebviewViewProvider's
    // `webviewOptions` instead (see extension.ts), otherwise VS Code
    // deallocates the webview's document (and all React state) every time the
    // user switches away from the sidebar tab and back, silently wiping the
    // conversation.
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')],
    };
    webviewView.webview.html = renderWebviewHtml(
      webviewView.webview,
      this.extensionUri,
    );

    // Only construct the controller once: resolveWebviewView can still be
    // invoked again in edge cases (e.g. the view being torn down), and we
    // don't want to drop host-side conversation history when it is.
    if (!this.controller) {
      this.controller = new ChatController(this.services, (msg) =>
        this.post(msg),
      );
    }

    webviewView.webview.onDidReceiveMessage((raw: WebviewToHost) => {
      void this.controller?.handle(raw);
    });
  }

  /** Reveal the chat view (used by the "Open Chat" command). */
  async focus(): Promise<void> {
    await vscode.commands.executeCommand('opencursor.chat.focus');
  }

  private post(message: HostToWebview): void {
    void this.view?.webview.postMessage(message);
  }
}
