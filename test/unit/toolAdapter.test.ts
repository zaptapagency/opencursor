import { describe, it, expect } from 'vitest';
import {
  parseToolArguments,
  toAnthropicTools,
  toOpenAiTools,
} from '../../src/llm/toolAdapter';
import type { ToolDefinition } from '../../src/llm/provider';

const tools: ToolDefinition[] = [
  {
    name: 'read_file',
    description: 'Read a file',
    parameters: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
];

describe('tool adapter', () => {
  it('maps to Anthropic input_schema shape', () => {
    const [t] = toAnthropicTools(tools);
    expect(t.name).toBe('read_file');
    expect(t.input_schema).toEqual(tools[0].parameters);
    expect('parameters' in t).toBe(false);
  });

  it('maps to OpenAI function shape', () => {
    const [t] = toOpenAiTools(tools);
    expect(t.type).toBe('function');
    expect(t.function.name).toBe('read_file');
    expect(t.function.parameters).toEqual(tools[0].parameters);
  });

  it('parses valid JSON arguments', () => {
    expect(parseToolArguments('{"path":"a.ts"}')).toEqual({ path: 'a.ts' });
  });

  it('returns empty object for blank or malformed arguments', () => {
    expect(parseToolArguments('')).toEqual({});
    expect(parseToolArguments('   ')).toEqual({});
    expect(parseToolArguments('{not json')).toEqual({});
    expect(parseToolArguments('42')).toEqual({});
  });
});
