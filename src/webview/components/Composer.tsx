import { useRef, useState } from 'react';
import type { MentionDTO, MentionSuggestion } from '../../shared/messages';
import { parseMentionsClient } from '../mentionsClient';

interface Props {
  busy: boolean;
  suggestions: MentionSuggestion[];
  onQueryMentions: (query: string) => void;
  onClearSuggestions: () => void;
  onSend: (text: string, mentions: MentionDTO[], mode: 'chat' | 'agent') => void;
  onStop: () => void;
}

// Chat composer with @-mention autocomplete and a chat/agent mode toggle.
export function Composer({
  busy,
  suggestions,
  onQueryMentions,
  onClearSuggestions,
  onSend,
  onStop,
}: Props) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'chat' | 'agent'>('chat');
  const [showSuggest, setShowSuggest] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const handleChange = (value: string) => {
    setText(value);
    const caret = ref.current?.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const match = before.match(/@([^\s@]*)$/);
    if (match) {
      setShowSuggest(true);
      onQueryMentions(match[1]);
    } else {
      setShowSuggest(false);
      onClearSuggestions();
    }
  };

  const applySuggestion = (s: MentionSuggestion) => {
    const caret = ref.current?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@([^\s@]*)$/, `@${s.value} `);
    setText(before + text.slice(caret));
    setShowSuggest(false);
    onClearSuggestions();
    ref.current?.focus();
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || busy) {
      return;
    }
    onSend(trimmed, parseMentionsClient(trimmed), mode);
    setText('');
    setShowSuggest(false);
  };

  return (
    <div className="composer">
      {showSuggest && suggestions.length > 0 && (
        <ul className="suggest">
          {suggestions.map((s) => (
            <li key={`${s.kind}:${s.value}`} onMouseDown={() => applySuggestion(s)}>
              <span className="suggest-label">{s.label}</span>
              {s.description && (
                <span className="suggest-desc">{s.description}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mode-row">
        <label>
          <input
            type="radio"
            checked={mode === 'chat'}
            onChange={() => setMode('chat')}
          />
          Chat
        </label>
        <label>
          <input
            type="radio"
            checked={mode === 'agent'}
            onChange={() => setMode('agent')}
          />
          Agent
        </label>
      </div>
      <textarea
        ref={ref}
        value={text}
        placeholder="Ask anything. Use @file, @folder/ or @codebase for context."
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <div className="composer-actions">
        {busy ? (
          <button className="stop" onClick={onStop}>
            Stop
          </button>
        ) : (
          <button className="send" onClick={submit} disabled={!text.trim()}>
            Send
          </button>
        )}
      </div>
    </div>
  );
}
