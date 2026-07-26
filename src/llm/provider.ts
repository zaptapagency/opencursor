// Provider-agnostic LLM abstraction. Both Anthropic and OpenAI implementations
// conform to this so the chat and agent loops never branch on provider.

export type Role = 'system' | 'user' | 'assistant' | 'tool';

/** A tool the model may call. `parameters` is a JSON Schema object. */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** A tool invocation requested by the model. */
export interface ToolCall {
  id: string;
  name: string;
  /** Parsed arguments object. */
  arguments: Record<string, unknown>;
}

export interface ChatMessage {
  role: Role;
  content: string;
  /** Present on assistant turns that requested tool calls. */
  toolCalls?: ToolCall[];
  /** Present on `tool` messages: the id of the call being answered. */
  toolCallId?: string;
}

/** Streaming events emitted while a completion is generated. */
export type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; call: ToolCall }
  | { type: 'done'; stopReason: 'end' | 'tool_use' | 'stop' | 'length' };

export interface StreamOptions {
  model: string;
  messages: ChatMessage[];
  system?: string;
  tools?: ToolDefinition[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface Provider {
  /** Stable provider id, e.g. 'anthropic' | 'openai'. */
  readonly id: string;
  supportsTools(): boolean;
  /** Stream a completion as an async iterable of events. */
  stream(options: StreamOptions): AsyncIterable<StreamEvent>;
  /** Embed texts; throws if the provider has no embedding endpoint. */
  embed(texts: string[], model: string): Promise<number[][]>;
}
