import OpenAI from 'openai';
import type {
  ChatMessage,
  Provider,
  StreamEvent,
  StreamOptions,
} from './provider';
import { parseToolArguments, toOpenAiTools } from './toolAdapter';

// OpenAI implementation of the Provider interface using the Chat Completions
// streaming API with tool calling and an embeddings endpoint.
export class OpenAiProvider implements Provider {
  readonly id = 'openai';
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  supportsTools(): boolean {
    return true;
  }

  async embed(texts: string[], model: string): Promise<number[][]> {
    const res = await this.client.embeddings.create({
      model,
      input: texts,
    });
    return res.data.map((d) => d.embedding);
  }

  async *stream(options: StreamOptions): AsyncIterable<StreamEvent> {
    const messages = toOpenAiMessages(options.system, options.messages);
    const stream = await this.client.chat.completions.create(
      {
        model: options.model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature,
        messages,
        tools: options.tools ? toOpenAiTools(options.tools) : undefined,
        stream: true,
      },
      { signal: options.signal },
    );

    // Tool calls stream as indexed deltas that must be reassembled.
    const toolAcc = new Map<number, { id: string; name: string; args: string }>();
    let finishReason: string | null = null;

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) {
        continue;
      }
      const delta = choice.delta;
      if (delta?.content) {
        yield { type: 'text', text: delta.content };
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const slot = toolAcc.get(tc.index) ?? { id: '', name: '', args: '' };
          if (tc.id) {
            slot.id = tc.id;
          }
          if (tc.function?.name) {
            slot.name = tc.function.name;
          }
          if (tc.function?.arguments) {
            slot.args += tc.function.arguments;
          }
          toolAcc.set(tc.index, slot);
        }
      }
      if (choice.finish_reason) {
        finishReason = choice.finish_reason;
      }
    }

    for (const slot of toolAcc.values()) {
      yield {
        type: 'tool_call',
        call: {
          id: slot.id,
          name: slot.name,
          arguments: parseToolArguments(slot.args),
        },
      };
    }

    yield {
      type: 'done',
      stopReason:
        finishReason === 'tool_calls'
          ? 'tool_use'
          : finishReason === 'length'
            ? 'length'
            : 'end',
    };
  }
}

function toOpenAiMessages(
  system: string | undefined,
  messages: ChatMessage[],
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const out: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  if (system) {
    out.push({ role: 'system', content: system });
  }
  for (const m of messages) {
    if (m.role === 'system') {
      out.push({ role: 'system', content: m.content });
    } else if (m.role === 'tool') {
      out.push({
        role: 'tool',
        tool_call_id: m.toolCallId ?? '',
        content: m.content,
      });
    } else if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
      out.push({
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.toolCalls.map((c) => ({
          id: c.id,
          type: 'function',
          function: {
            name: c.name,
            arguments: JSON.stringify(c.arguments),
          },
        })),
      });
    } else if (m.role === 'assistant') {
      out.push({ role: 'assistant', content: m.content });
    } else {
      out.push({ role: 'user', content: m.content });
    }
  }
  return out;
}
