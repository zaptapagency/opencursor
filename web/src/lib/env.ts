import { z } from 'zod';

/**
 * Environment variables, validated once at module load.
 *
 * Import `env` instead of reading `process.env` directly (charter §3: "if it's
 * not in env.ts, it doesn't exist"). Server-only secrets are validated only on
 * the server, so they are never required in — nor leaked into — the browser
 * bundle.
 *
 * Variables for later phases (auth, Stripe, Resend, admin, licensing) are
 * documented in `.env.example` and added to these schemas as each phase lands,
 * so validation always reflects exactly what the app reads today.
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (value) => value.startsWith('postgres'),
      'DATABASE_URL must be a PostgreSQL connection string',
    ),
});

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
});

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}

// NEXT_PUBLIC_* must be referenced statically for Next.js to inline the value.
const clientParsed = clientSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
if (!clientParsed.success) {
  throw new Error(
    `Invalid public environment variables:\n${formatIssues(clientParsed.error)}`,
  );
}

const isServer = typeof window === 'undefined';

// On the client we intentionally skip server-secret validation. The empty
// object is cast to the server shape because these fields are only ever read
// from server-side code; touching them in the browser is a programming error.
const serverParsed = isServer
  ? serverSchema.safeParse(process.env)
  : {
      success: true as const,
      data: {} as z.infer<typeof serverSchema>,
    };

if (!serverParsed.success) {
  throw new Error(
    `Invalid server environment variables:\n${formatIssues(serverParsed.error)}`,
  );
}

export const env = {
  ...serverParsed.data,
  ...clientParsed.data,
};
