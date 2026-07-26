// Normalizes tool definitions and tool-call arguments across providers.
// Anthropic and OpenAI use different wire shapes; the agent loop speaks only
// the neutral `ToolDefinition` / `ToolCall` types from provider.ts.
import type { ToolDefinition } from './provider';

export interface AnthropicToolShape {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface OpenAiToolShape {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export function toAnthropicTools(tools: ToolDefinition[]): AnthropicToolShape[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));
}

export function toOpenAiTools(tools: ToolDefinition[]): OpenAiToolShape[] {
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

/** Safely parse a JSON arguments string emitted incrementally by a provider. */
export function parseToolArguments(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }
  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
