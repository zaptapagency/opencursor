// Thin typed wrapper around the VS Code webview messaging API.
import type { HostToWebview, WebviewToHost } from '../shared/messages';

interface VsCodeApi {
  postMessage(message: WebviewToHost): void;
  getState<T>(): T | undefined;
  setState<T>(state: T): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const api = acquireVsCodeApi();

export function postMessage(message: WebviewToHost): void {
  api.postMessage(message);
}

export function onMessage(
  handler: (message: HostToWebview) => void,
): () => void {
  const listener = (event: MessageEvent<HostToWebview>) =>
    handler(event.data);
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
