import { useEffect, useRef } from 'react';
import type { AgentStepDTO } from '../../shared/messages';
import type { UiMessage } from '../useChat';
import { highlightWithin, renderMarkdown } from '../markdown';

const STATUS_ICON: Record<string, string> = {
  running: '⏳',
  approved: '✅',
  rejected: '⛔',
  done: '✔️',
  failed: '❌',
  pending: '•',
};

function TraceStep({ step }: { step: AgentStepDTO }) {
  return (
    <div className={`trace-step trace-${step.kind}`}>
      <div className="trace-head">
        <span className="trace-status">
          {STATUS_ICON[step.status ?? 'pending'] ?? '•'}
        </span>
        <span className="trace-title">{step.title}</span>
      </div>
      {step.detail && <pre className="trace-detail">{step.detail}</pre>}
    </div>
  );
}

export function Message({ message }: { message: UiMessage }) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message.role === 'assistant' && bodyRef.current) {
      highlightWithin(bodyRef.current);
    }
  }, [message.content, message.role]);

  return (
    <div className={`msg msg-${message.role}`}>
      <div className="msg-role">{message.role === 'user' ? 'You' : 'opencursor'}</div>
      {message.steps.length > 0 && (
        <div className="trace">
          {message.steps.map((s) => (
            <TraceStep key={s.id} step={s} />
          ))}
        </div>
      )}
      {message.role === 'assistant' ? (
        <div
          ref={bodyRef}
          className="msg-body markdown"
          // Safe: webview CSP blocks script execution and inline handlers.
          dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
        />
      ) : (
        <div className="msg-body user-text">{message.content}</div>
      )}
      {message.streaming && <span className="cursor-blink">▍</span>}
    </div>
  );
}
