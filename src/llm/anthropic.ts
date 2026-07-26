import Anthropic from '@anthropic-ai/sdk';
import type {
  ChatMessage,
  Provider,
  StreamEvent,
  StreamOptions,
} from './provider';
import { parseToolArguments, toAnthropicTools } from './toolAdapter';

// Anthropic implementation of the Provider interface. Uses the raw streaming
// API so we can surface text and tool_use blocks incrementally.
export class AnthropicProvider implements Provider {
  readonly id = 'anthropic';
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  supportsTools(): boolean {
    return true;
  }

  async embed(): Promise<number[][]> {
    // Anthropic has no first-party embeddings endpoint; embeddings are routed
    // to OpenAI (see EmbeddingService). Fail loudly if called directly.
    throw new Error('AnthropicProvider does not support embeddings.');
  }

  async *stream(options: StreamOptions): AsyncIterable<StreamEvent> {
    const messages = toAnthropicMessages(options.messages);
    const stream = this.client.messages.stream(
      {
        model: options.model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature,
        system: options.system,
        messages,
        tools: options.tools
          ? (toAnthropicTools(options.tools) as unknown as Anthropic.Tool[])
          : undefined,
      },
      { signal: options.signal },
    );

    // Accumulate tool_use blocks whose JSON arguments arrive as deltas.
    const toolBuffers = new Map<number, { id: string; name: string; json: string }>();

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          toolBuffers.set(event.index, {
            id: event.content_block.id,
            name: event.content_block.name,
            json: '',
          });
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          yield { type: 'text', text: event.delta.text };
        } else if (event.delta.type === 'input_json_delta') {
          const buf = toolBuffers.get(event.index);
          if (buf) {
            buf.json += event.delta.partial_json;
          }
        }
      } else if (event.type === 'content_block_stop') {
        const buf = toolBuffers.get(event.index);
        if (buf) {
          yield {
            type: 'tool_call',
            call: {
              id: buf.id,
              name: buf.name,
              arguments: parseToolArguments(buf.json),
            },
          };
          toolBuffers.delete(event.index);
        }
      } else if (event.type === 'message_delta') {
        const reason = event.delta.stop_reason;
        yield {
          type: 'done',
          stopReason:
            reason === 'tool_use'
              ? 'tool_use'
              : reason === 'max_tokens'
                ? 'length'
                : 'end',
        };
      }
    }
  }
}

/**
 * Map neutral chat messages to the Anthropic messages array (no system role).
 *
 * IMPORTANT: the Anthropic Messages API rejects consecutive messages with the
 * same role. When the orchestrator answers multiple tool_use calls from a
 * single assistant turn, it appends one `tool` ChatMessage per call — those
 * must be merged into a single `user` message carrying multiple tool_result
 * blocks, not emitted as separate consecutive user messages.
 */
/** Normalize either message content shape into a content-block array. */
function asBlocks(
  content: string | Anthropic.ContentBlockParam[],
): Anthropic.ContentBlockParam[] {
  if (typeof content === 'string') {
    return content ? [{ type: 'text', text: content }] : [];
  }
  return content;
}

export function toAnthropicMessages(
  messages: ChatMessage[],
): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  let toolResults: Anthropic.ToolResultBlockParam[] = [];

  // Push a message, merging into the previous one instead of appending when
  // it shares the same role — the Anthropic API rejects any two consecutive
  // messages with the same role, and a plain user turn can otherwise land
  // right after a flushed tool-results user message (e.g. a user message
  // sent immediately after tool results with no assistant turn in between).
  const push = (
    role: 'user' | 'assistant',
    content: string | Anthropic.ContentBlockParam[],
  ) => {
    const last = out[out.length - 1];
    if (last && last.role === role) {
      last.content = [...asBlocks(last.content), ...asBlocks(content)];
    } else {
      out.push({ role, content });
    }
  };

  const flushToolResults = () => {
    if (toolResults.length > 0) {
      push('user', toolResults as unknown as Anthropic.ContentBlockParam[]);
      toolResults = [];
    }
  };

  for (const m of messages) {
    if (m.role === 'system') {
      continue; // system prompt is passed separately
    }
    if (m.role === 'tool') {
      toolResults.push({
        type: 'tool_result',
        tool_use_id: m.toolCallId ?? '',
        content: m.content,
      });
      continue;
    }
    flushToolResults();
    if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
      const blocks: Anthropic.ContentBlockParam[] = [];
      if (m.content) {
        blocks.push({ type: 'text', text: m.content });
      }
      for (const call of m.toolCalls) {
        blocks.push({
          type: 'tool_use',
          id: call.id,
          name: call.name,
          input: call.arguments,
        });
      }
      push('assistant', blocks);
      continue;
    }
    push(m.role, m.content);
  }
  flushToolResults();
  return out;
}
