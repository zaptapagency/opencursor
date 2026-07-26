import * as vscode from 'vscode';
import { ChatViewProvider } from './view/chatViewProvider';
import { Services } from './core/services';
import { InlineEditController } from './edit/inlineEdit';
import { streamText } from './llm/complete';
import type { ProviderId } from './config/secrets';

// Extension entry point: wires the service container, commands, and the
// sidebar chat view.
export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  const services = new Services(context);
  await services.init();

  const chatProvider = new ChatViewProvider(context.extensionUri, services);
  const inlineEdit = new InlineEditController(services);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ChatViewProvider.viewType,
      chatProvider,
      // Keep the webview's iframe (and React state) alive when the sidebar
      // tab is hidden — otherwise conversation history is silently wiped
      // every time the user switches tabs and back.
      { webviewOptions: { retainContextWhenHidden: true } },
    ),

    vscode.commands.registerCommand('opencursor.hello', () => {
      const model = services.models.getActive();
      void vscode.window.showInformationMessage(
        `opencursor ready — active model: ${model.label}`,
      );
    }),

    vscode.commands.registerCommand('opencursor.openChat', () =>
      chatProvider.focus(),
    ),

    vscode.commands.registerCommand('opencursor.inlineEdit', () =>
      inlineEdit.run(),
    ),

    vscode.commands.registerCommand('opencursor.pickModel', async () => {
      const picked = await services.models.pick();
      if (picked) {
        void vscode.window.showInformationMessage(
          `opencursor model set to ${picked.label}`,
        );
      }
    }),

    vscode.commands.registerCommand('opencursor.setApiKey', async () => {
      const provider = await vscode.window.showQuickPick(
        ['anthropic', 'openai'],
        { title: 'Set API key for provider' },
      );
      if (!provider) {
        return;
      }
      const key = await vscode.window.showInputBox({
        title: `${provider} API key`,
        password: true,
        ignoreFocusOut: true,
      });
      if (key) {
        await services.secrets.setKey(provider as ProviderId, key);
        services.factory.clear();
        void vscode.window.showInformationMessage(
          `Stored ${provider} API key securely.`,
        );
      }
    }),

    vscode.commands.registerCommand('opencursor.indexWorkspace', async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'opencursor: indexing workspace',
          cancellable: true,
        },
        async (progress, token) => {
          try {
            const result = await services.indexer.indexWorkspace(
              progress,
              token,
            );
            void vscode.window.showInformationMessage(
              `Indexed ${result.files} files into ${result.chunks} chunks.`,
            );
          } catch (err) {
            void vscode.window.showErrorMessage(
              `Indexing failed: ${(err as Error).message}`,
            );
          }
        },
      );
    }),

    // Temporary Phase 1 verification command: streams a real completion.
    vscode.commands.registerCommand('opencursor.pingModel', async () => {
      try {
        const { provider, model } = await services.activeProvider();
        const channel = vscode.window.createOutputChannel('opencursor ping');
        channel.show(true);
        channel.appendLine(`Model: ${model.label}\n---`);
        await streamText(
          provider,
          {
            model: model.id,
            messages: [
              { role: 'user', content: 'Reply with a short hello in one line.' },
            ],
            maxTokens: 64,
          },
          (delta) => channel.append(delta),
        );
        channel.appendLine('\n--- done');
      } catch (err) {
        void vscode.window.showErrorMessage(
          `Ping failed: ${(err as Error).message}`,
        );
      }
    }),

    // Incremental re-index on save.
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      if (services.store.size() > 0 && doc.uri.scheme === 'file') {
        try {
          await services.indexer.indexFile(doc.uri);
        } catch {
          // Non-fatal: incremental index best-effort.
        }
      }
    }),
  );
}

export function deactivate(): void {
  // Subscriptions are disposed by VS Code.
}
