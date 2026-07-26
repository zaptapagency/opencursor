// Structured JSON logging to stdout/stderr (charter §3). Railway captures the
// stream. Callers pass IDs, never payloads — never log tokens, passwords, full
// request bodies for auth routes, or full Stripe payloads.

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  organizationId?: string;
  userId?: string;
  requestId?: string;
  route?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, msg: string, context: LogContext = {}): void {
  const entry = {
    level,
    msg,
    time: new Date().toISOString(),
    ...context,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, context?: LogContext) => emit('debug', msg, context),
  info: (msg: string, context?: LogContext) => emit('info', msg, context),
  warn: (msg: string, context?: LogContext) => emit('warn', msg, context),
  error: (msg: string, context?: LogContext) => emit('error', msg, context),
};
