import type { Provider } from './provider';
import { AnthropicProvider } from './anthropic';
import { OpenAiProvider } from './openai';
import type { ProviderId, SecretsManager } from '../config/secrets';

// Builds live Provider instances from stored secrets. Providers are cached per
// key so we don't reconstruct SDK clients on every request.
export class ProviderFactory {
  private cache = new Map<string, Provider>();

  constructor(private readonly secrets: SecretsManager) {}

  async get(provider: ProviderId): Promise<Provider> {
    const key = await this.secrets.ensureKey(provider);
    if (!key) {
      throw new Error(
        `No API key configured for ${provider}. Run "opencursor: Set API Key".`,
      );
    }
    const cacheKey = `${provider}:${key.slice(-6)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const instance =
      provider === 'anthropic'
        ? new AnthropicProvider(key)
        : new OpenAiProvider(key);
    this.cache.set(cacheKey, instance);
    return instance;
  }

  /** Invalidate cached clients (e.g. after a key is rotated). */
  clear(): void {
    this.cache.clear();
  }
}
