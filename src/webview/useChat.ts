import { useEffect, useRef, useState } from 'react';
import type {
  AgentStepDTO,
  HostToWebview,
  MentionDTO,
  MentionSuggestion,
} from '../shared/messages';
import { onMessage, postMessage } from './vscodeApi';

export interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  steps: AgentStepDTO[];
  streaming: boolean;
}

export interface ChatState {
  messages: UiMessage[];
  model: string;
  provider: string;
  busy: boolean;
  suggestions: MentionSuggestion[];
  errors: string[];
}

// Manages all webview chat state and the message channel to the host.
export function useChat() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    model: '…',
    provider: '',
    busy: false,
    suggestions: [],
    errors: [],
  });
  const currentAssistant = useRef<string | null>(null);

  useEffect(() => {
    const dispose = onMessage((msg: HostToWebview) => {
      setState((s) => reduce(s, msg, currentAssistant));
    });
    postMessage({ type: 'ready' });
    return dispose;
  }, []);

  const send = (text: string, mentions: MentionDTO[], mode: 'chat' | 'agent') =>
    postMessage({ type: 'chat/send', text, mentions, mode });
  const stop = () => postMessage({ type: 'chat/stop' });
  const regenerate = () => postMessage({ type: 'chat/regenerate' });
  const clear = () => postMessage({ type: 'chat/clear' });
  const pickModel = () => postMessage({ type: 'chat/pickModel' });
  const queryMentions = (query: string) =>
    postMessage({ type: 'mentions/query', query });
  const clearSuggestions = () =>
    setState((s) => ({ ...s, suggestions: [] }));

  return {
    state,
    send,
    stop,
    regenerate,
    clear,
    pickModel,
    queryMentions,
    clearSuggestions,
  };
}

function reduce(
  s: ChatState,
  msg: HostToWebview,
  current: React.MutableRefObject<string | null>,
): ChatState {
  switch (msg.type) {
    case 'init':
      return { ...s, model: msg.model, provider: msg.provider };
    case 'chat/modelChanged':
      return { ...s, model: msg.model, provider: msg.provider };
    case 'chat/userMessage':
      return {
        ...s,
        errors: [],
        messages: [
          ...s.messages,
          {
            id: msg.message.id,
            role: 'user',
            content: msg.message.content,
            steps: [],
            streaming: false,
          },
        ],
      };
    case 'chat/assistantStart':
      current.current = msg.id;
      return {
        ...s,
        busy: true,
        messages: [
          ...s.messages,
          { id: msg.id, role: 'assistant', content: '', steps: [], streaming: true },
        ],
      };
    case 'chat/assistantDelta':
      return {
        ...s,
        messages: s.messages.map((m) =>
          m.id === msg.id ? { ...m, content: m.content + msg.delta } : m,
        ),
      };
    case 'chat/assistantEnd':
      current.current = null;
      return {
        ...s,
        busy: false,
        messages: s.messages.map((m) =>
          m.id === msg.id ? { ...m, streaming: false } : m,
        ),
      };
    case 'agent/step':
      return updateAssistant(s, current.current, (m) => ({
        ...m,
        steps: [...m.steps, msg.step],
      }));
    case 'agent/stepUpdate':
      return updateAssistant(s, current.current, (m) => ({
        ...m,
        steps: m.steps.map((st) =>
          st.id === msg.stepId
            ? { ...st, status: msg.status, detail: msg.detail ?? st.detail }
            : st,
        ),
      }));
    case 'chat/error':
      return { ...s, errors: [...s.errors, msg.message] };
    case 'chat/cleared':
      return { ...s, messages: [], errors: [] };
    case 'mentions/results':
      return { ...s, suggestions: msg.suggestions };
    case 'pong':
      return s;
    default:
      return s;
  }
}

function updateAssistant(
  s: ChatState,
  id: string | null,
  fn: (m: UiMessage) => UiMessage,
): ChatState {
  if (!id) {
    return s;
  }
  return {
    ...s,
    messages: s.messages.map((m) => (m.id === id ? fn(m) : m)),
  };
}
