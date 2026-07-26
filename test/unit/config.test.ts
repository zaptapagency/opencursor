import { describe, it, expect } from 'vitest';
import { ModelRegistry, findModel, MODELS } from '../../src/config/models';
import { redactSecrets } from '../../src/config/secrets';

// In-memory Memento stand-in for ModelRegistry.
class FakeMemento {
  private store = new Map<string, unknown>();
  get<T>(key: string, fallback: T): T {
    return (this.store.get(key) as T) ?? fallback;
  }
  async update(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }
  keys(): readonly string[] {
    return [...this.store.keys()];
  }
}

describe('ModelRegistry', () => {
  it('defaults to the first catalog model when unset', () => {
    const reg = new ModelRegistry(new FakeMemento() as never);
    expect(reg.getActive().id).toBe(MODELS[0].id);
  });

  it('persists and returns the active model', async () => {
    const reg = new ModelRegistry(new FakeMemento() as never);
    await reg.setActive('gpt-4o');
    expect(reg.getActive().id).toBe('gpt-4o');
    expect(reg.getActive().provider).toBe('openai');
  });

  it('findModel resolves known ids and rejects unknown', () => {
    expect(findModel('gpt-4o-mini')?.provider).toBe('openai');
    expect(findModel('does-not-exist')).toBeUndefined();
  });
});

describe('redactSecrets', () => {
  it('redacts OpenAI and Anthropic style keys', () => {
    const out = redactSecrets(
      'key sk-abcdef0123456789abcd and sk-ant-abcdef0123456789abcd tail',
    );
    expect(out).not.toContain('abcdef0123456789');
    expect(out).toContain('REDACTED');
  });
});
