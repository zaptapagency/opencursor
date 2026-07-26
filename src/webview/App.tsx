import { useEffect, useRef } from 'react';
import { useChat } from './useChat';
import { Message } from './components/Message';
import { Composer } from './components/Composer';

// Root chat UI: header (model + actions), scrolling message list, composer.
export function App() {
  const chat = useChat();
  const { state } = chat;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  return (
    <div className="app">
      <header className="header">
        <div className="brand">opencursor</div>
        <div className="header-actions">
          <button className="link" onClick={chat.pickModel} title="Change model">
            {state.model}
          </button>
          <button className="link" onClick={chat.regenerate} disabled={state.busy}>
            ↻
          </button>
          <button className="link" onClick={chat.clear} disabled={state.busy}>
            Clear
          </button>
        </div>
      </header>

      <main className="messages">
        {state.messages.length === 0 && (
          <div className="empty">
            <p>Start a conversation.</p>
            <p className="subtle">
              Type <code>@</code> to add files, folders, or <code>@codebase</code>{' '}
              context. Switch to <b>Agent</b> mode for multi-step tasks.
            </p>
          </div>
        )}
        {state.messages.map((m) => (
          <Message key={m.id} message={m} />
        ))}
        {state.errors.map((e, i) => (
          <div key={i} className="error-note">
            {e}
          </div>
        ))}
        <div ref={endRef} />
      </main>

      <Composer
        busy={state.busy}
        suggestions={state.suggestions}
        onQueryMentions={chat.queryMentions}
        onClearSuggestions={chat.clearSuggestions}
        onSend={chat.send}
        onStop={chat.stop}
      />
    </div>
  );
}
