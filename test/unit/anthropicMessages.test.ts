import { describe, it, expect } from 'vitest';
import { toAnthropicMessages } from '../../src/llm/anthropic';
import type { ChatMessage } from '../../src/llm/provider';

// Regression test: the Anthropic Messages API rejects consecutive messages
// with the same role. Multiple tool results answering one assistant turn must
// be merged into a single user message with multiple tool_result blocks.
describe('toAnthropicMessages', () => {
  it('merges consecutive tool results into one user message', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'do two things' },
      {
        role: 'assistant',
        content: '',
        toolCalls: [
          { id: 'c1', name: 'read_file', arguments: {} },
          { id: 'c2', name: 'list_dir', arguments: {} },
        ],
      },
      { role: 'tool', content: 'file contents', toolCallId: 'c1' },
      { role: 'tool', content: 'dir listing', toolCallId: 'c2' },
      { role: 'user', content: 'thanks' },
    ];

    const out = toAnthropicMessages(messages);

    // No two consecutive entries should share a role.
    for (let i = 1; i < out.length; i++) {
      expect(out[i].role).not.toBe(out[i - 1].role);
    }

    const toolResultMsg = out.find(
      (m) =>
        m.role === 'user' &&
        Array.isArray(m.content) &&
        m.content.some(
          (b) => typeof b === 'object' && 'type' in b && b.type === 'tool_result',
        ),
    );
    expect(toolResultMsg).toBeDefined();
    expect(Array.isArray(toolResultMsg!.content)).toBe(true);
    const toolResultBlocks = (
      toolResultMsg!.content as { type: string }[]
    ).filter((b) => b.type === 'tool_result');
    expect(toolResultBlocks.length).toBe(2);
  });

  it('merges a trailing plain user message into the tool-result message rather than emitting consecutive user roles', () => {
    const messages: ChatMessage[] = [
      {
        role: 'assistant',
        content: '',
        toolCalls: [{ id: 'c1', name: 'read_file', arguments: {} }],
      },
      { role: 'tool', content: 'file contents', toolCallId: 'c1' },
      { role: 'user', content: 'thanks' },
    ];

    const out = toAnthropicMessages(messages);
    for (let i = 1; i < out.length; i++) {
      expect(out[i].role).not.toBe(out[i - 1].role);
    }
    expect(out).toHaveLength(2);
    const merged = out[1].content as { type: string; text?: string }[];
    expect(merged.some((b) => b.type === 'tool_result')).toBe(true);
    expect(merged.some((b) => b.type === 'text' && b.text === 'thanks')).toBe(
      true,
    );
  });

  it('drops system messages (handled separately) and keeps plain turns', () => {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'ignored' },
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ];
    const out = toAnthropicMessages(messages);
    expect(out).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ]);
  });
});
