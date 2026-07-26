import * as vscode from 'vscode';

// SecretStorage-backed API key management. Keys are NEVER written to settings
// or logs — only to the OS keychain via VS Code SecretStorage.
export type ProviderId = 'anthropic' | 'openai';

const KEY_PREFIX = 'opencursor.apiKey.';

export class SecretsManager {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  private storageKey(provider: ProviderId): string {
    return `${KEY_PREFIX}${provider}`;
  }

  async getKey(provider: ProviderId): Promise<string | undefined> {
    return this.secrets.get(this.storageKey(provider));
  }

  async setKey(provider: ProviderId, key: string): Promise<void> {
    await this.secrets.store(this.storageKey(provider), key.trim());
  }

  async deleteKey(provider: ProviderId): Promise<void> {
    await this.secrets.delete(this.storageKey(provider));
  }

  /**
   * Return an existing key, or prompt the user for one and persist it.
   * The prompt uses `password: true` so the value is never shown.
   */
  async ensureKey(provider: ProviderId): Promise<string | undefined> {
    const existing = await this.getKey(provider);
    if (existing) {
      return existing;
    }
    const entered = await vscode.window.showInputBox({
      title: `${provider} API key`,
      prompt: `Enter your ${provider} API key (stored securely in SecretStorage)`,
      password: true,
      ignoreFocusOut: true,
    });
    if (entered && entered.trim()) {
      await this.setKey(provider, entered);
      return entered.trim();
    }
    return undefined;
  }
}

/** Redact anything that looks like an API key from a string before logging. */
export function redactSecrets(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, 'sk-***REDACTED***')
    .replace(/sk-ant-[A-Za-z0-9_-]{16,}/g, 'sk-ant-***REDACTED***');
}
