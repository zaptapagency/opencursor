import { describe, it, expect } from 'vitest';
import { assertNever } from '../../src/shared/messages';
import type { HostToWebview, WebviewToHost } from '../../src/shared/messages';

// Reference reducer mirroring the host's handling of the two handshake
// messages, verifying the typed protocol without booting VS Code.
function reduce(
  msg: Extract<WebviewToHost, { type: 'ready' | 'ping' }>,
  version: string,
): HostToWebview {
  switch (msg.type) {
    case 'ready':
      return { type: 'init', version, model: 'Test Model', provider: 'anthropic' };
    case 'ping':
      return { type: 'pong', text: `echo: ${msg.text}` };
    default:
      return assertNever(msg);
  }
}

describe('webview<->host message protocol', () => {
  it('responds to ready with init carrying model + version', () => {
    expect(reduce({ type: 'ready' }, '1.2.3')).toEqual({
      type: 'init',
      version: '1.2.3',
      model: 'Test Model',
      provider: 'anthropic',
    });
  });

  it('echoes ping text back as pong', () => {
    expect(reduce({ type: 'ping', text: 'hi' }, '0.0.1')).toEqual({
      type: 'pong',
      text: 'echo: hi',
    });
  });

  it('assertNever throws on an unexpected variant', () => {
    expect(() => assertNever({ type: 'nope' } as never)).toThrow();
  });
});
