// Typed message protocol between the extension host and webviews.
// Both sides import these types; runtime message passing goes through
// `postMessage` / `onDidReceiveMessage`.

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessageDTO {
  id: string;
  role: ChatRole;
  content: string;
}

/** A mention token the user embedded in a chat message (@file/@folder/@codebase). */
export interface MentionDTO {
  kind: 'file' | 'folder' | 'codebase';
  value: string;
}

/** One entry in the agent's visible step trace. */
export interface AgentStepDTO {
  id: string;
  kind: 'thought' | 'tool_call' | 'tool_result' | 'error' | 'final';
  title: string;
  detail?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'running' | 'done' | 'failed';
}

/** An autocomplete candidate for an `@` mention. */
export interface MentionSuggestion {
  kind: 'file' | 'folder' | 'codebase';
  label: string;
  value: string;
  description?: string;
}

/** Messages sent from a webview to the extension host. */
export type WebviewToHost =
  | { type: 'ready' }
  | { type: 'ping'; text: string }
  | { type: 'chat/send'; text: string; mentions: MentionDTO[]; mode: 'chat' | 'agent' }
  | { type: 'chat/stop' }
  | { type: 'chat/regenerate' }
  | { type: 'chat/clear' }
  | { type: 'chat/pickModel' }
  | { type: 'mentions/query'; query: string };

/** Messages sent from the extension host to a webview. */
export type HostToWebview =
  | { type: 'init'; version: string; model: string; provider: string }
  | { type: 'pong'; text: string }
  | { type: 'chat/userMessage'; message: ChatMessageDTO }
  | { type: 'chat/assistantStart'; id: string }
  | { type: 'chat/assistantDelta'; id: string; delta: string }
  | { type: 'chat/assistantEnd'; id: string }
  | { type: 'chat/error'; message: string }
  | { type: 'chat/cleared' }
  | { type: 'chat/modelChanged'; model: string; provider: string }
  | { type: 'mentions/results'; suggestions: MentionSuggestion[] }
  | { type: 'agent/step'; step: AgentStepDTO }
  | { type: 'agent/stepUpdate'; stepId: string; status: AgentStepDTO['status']; detail?: string };

/** Discriminated-union helper for exhaustive switch handling. */
export function assertNever(x: never): never {
  throw new Error(`Unexpected message variant: ${JSON.stringify(x)}`);
}
