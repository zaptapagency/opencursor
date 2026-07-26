import { describe, it, expect } from 'vitest';
import { getNonce, renderWebviewHtml } from '../../src/view/html';

// Fake webview implementing just the surface renderWebviewHtml uses.
const fakeWebview = {
  cspSource: 'vscode-webview://fake',
  asWebviewUri: (uri: { toString(): string }) => ({
    toString: () => `https://webview/${uri.toString()}`,
  }),
} as unknown as import('vscode').Webview;

const extensionUri = { fsPath: '/ext', toString: () => '/ext' } as unknown as
  import('vscode').Uri;

describe('renderWebviewHtml', () => {
  it('generates 32-char alphanumeric nonces', () => {
    const nonce = getNonce();
    expect(nonce).toHaveLength(32);
    expect(nonce).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('embeds a CSP with a nonce and references built assets', () => {
    const html = renderWebviewHtml(fakeWebview, extensionUri);
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain("script-src 'nonce-");
    expect(html).toContain('main.js');
    expect(html).toContain('main.css');
    expect(html).toContain('<div id="root"></div>');
  });

  it('uses a fresh nonce per render', () => {
    const a = renderWebviewHtml(fakeWebview, extensionUri);
    const b = renderWebviewHtml(fakeWebview, extensionUri);
    const nonceOf = (h: string) =>
      h.match(/nonce-([A-Za-z0-9]+)/)?.[1];
    expect(nonceOf(a)).not.toEqual(nonceOf(b));
  });
});
