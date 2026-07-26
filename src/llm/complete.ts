import type { Provider, StreamOptions } from './provider';

// Convenience helper: drive a provider stream to completion, forwarding text
// deltas and returning the full concatenated text. Ignores tool calls.
export async function streamText(
  provider: Provider,
  options: StreamOptions,
  onDelta?: (delta: string) => void,
): Promise<string> {
  let full = '';
  for await (const event of provider.stream(options)) {
    if (event.type === 'text') {
      full += event.text;
      onDelta?.(event.text);
    }
  }
  return full;
}

/** Strip a single leading/trailing Markdown code fence, if present. */
export function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```[^\n]*\n([\s\S]*?)\n?```$/);
  return fenceMatch ? fenceMatch[1] : trimmed;
}
