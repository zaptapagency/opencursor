# Engineering Charter — opencursor

Read this before every non-trivial task. You own outcomes, not tickets. Make
decisions like the person who gets paged at 3 AM — because that's you. This is a
solo/small-team SaaS: cost matters, speed matters, **correctness matters more
than either.** When in doubt: cheap, boring, reversible.

## Repository map

Two independently-deployable artifacts in one repo:

- **Extension** (repo root) — `opencursor`, a Cursor-clone VS Code extension.
  Ships as a `.vsix`. Built with **npm** (`package.json`, `src/`, `test/`).
  Verified: 42/42 unit tests, clean build/lint. Do not disturb its toolchain.
- **`web/`** — `opencursor Cloud`, the companion SaaS platform (accounts,
  licensing, billing, admin). Standalone **Next.js 15** app, built with
  **pnpm**, deployed on **Railway**. Self-contained (own `pnpm-lock.yaml`); not
  an npm/pnpm workspace of the root.

The full build roadmap lives in the approved plan; phases: A scaffold (done) →
B auth → C licensing + extension integration → D Stripe billing → E marketing
polish → F admin → G CI/CD hardening.

## 0. The Stack (do not deviate without asking)

- **App:** Next.js 15+, App Router, TypeScript strict, RSC by default
- **DB:** PostgreSQL (Railway now → DO Managed Postgres if Railway DB > ~$25/mo) via Prisma
- **Cache/Queues:** Redis (Railway/Upstash) — only when actually needed
- **Auth:** Auth.js (NextAuth v5) + Prisma adapter, email + Google. Not Clerk.
- **Payments:** Stripe (Checkout + Billing Portal + webhooks). Never from the client.
- **File storage:** DO Spaces (S3-compatible) — only when users upload files. Never the app filesystem.
- **Email:** Resend. Never send from a request handler — enqueue it.
- **Hosting:** Railway (app + Postgres). One prod service, one preview per PR. Auto-deploy from `main`.
- **DNS/CDN:** Cloudflare (free) in front of Railway. Domain at Namecheap, nameservers → Cloudflare.
- **Source/CI:** GitHub (private) + GitHub Actions (lint, typecheck, test, `prisma validate` on every PR).
- **Errors/logs:** Sentry (free tier). Structured JSON logs to stdout.
- **UI:** Tailwind + shadcn/ui. No other component libraries. No CSS-in-JS.
- **Validation:** Zod at every trust boundary (routes, actions, env, webhooks).
- **Testing:** Vitest for units; Playwright only for revenue-adjacent flows.

Cost target: ~$5–15/mo until real users. **No new tool/library/service without
asking** — every dependency is a bill, a security surface, and a 3 AM page.

## 1. Prime Directives (non-negotiable)

1. **Understand before you touch.** No edit to a file you haven't read. No new
   function without grepping for what exists. No new dep without checking
   `package.json`. Grep first, code second.
2. **Match the codebase.** Follow existing patterns, naming, structure.
   Consistency > cleverness. If a pattern is wrong, flag it — don't silently diverge.
3. **Root cause, not symptom.** Never `any`, `@ts-ignore`, `@ts-expect-error`,
   or `eslint-disable` to make an error go away. Suppressing a signal is a bug.
4. **Small, reversible, verifiable.** Each change ships and reverts on its own.
   If you can't state the blast radius in one sentence, split it.
5. **Prove it works.** "Compiles" ≠ "works." Run it. Hit the route. Check the
   row in `prisma studio`. If you can't run it, say so explicitly.

## 2. Decision Framework — Act vs. Ask

**Just do it:** reads, searches, `pnpm test/dev/typecheck`, following an explicit
instruction with one obvious interpretation, fixing a bug contained in the file
at hand.

**Decide and state your reasoning:** choosing between two patterns already in the
repo; refactoring within the module you're editing; adding a well-scoped helper,
type, Zod schema, or migration to finish the task.

**Stop and ask (one crisp question, then wait):** ambiguity that changes the DB
schema, API contract, or user-visible behavior; anything touching auth, billing,
Stripe webhooks, permissions, or tenant isolation; deleting code whose callers
you haven't traced; adding a dependency, service, or env var; a task >~300 lines
across >~5 files (propose a plan first).

Default bias: **act when reversible, ask when not.**

## 3. SaaS Defaults

**Multi-tenancy (this app has Organizations):** `User → Membership(role) →
Organization`. All tenant data hangs off `organizationId`. **Every** tenant-scoped
Prisma query MUST filter by `organizationId` — a missing filter leaks other
customers' data. Every server action / route: (1) get session `auth()`, (2)
verify membership of the claimed `organizationId`, (3) verify `role` allows it.
Never trust `organizationId` from the client. Prefer opaque slugs over raw ids in URLs.

**Auth/authz:** session checked in a shared helper (`lib/auth/requireOrgMember.ts`),
never inline. **Billing:** verify Stripe webhook signatures; idempotent handlers
(check `event.id` against a processed-events table); DB is the source of truth for
entitlements; never call Stripe from client components; test keys in dev/preview,
live only in prod. **Migrations:** all via `prisma migrate`; never `db push` to
prod; forward-only, backward-compatible for one deploy (stop-writing then drop,
two deploys); never mass-update without a counted `SELECT COUNT(*)` first.
**Secrets:** every env var in `env.ts` (Zod, validated at boot); secrets in
Railway UI + `.env.local` (gitignored); `NEXT_PUBLIC_*` is public. **Logs:**
structured JSON to stdout (`level, msg, organizationId, userId, requestId,
route`); never log tokens/passwords/auth bodies/Stripe payloads — IDs not
payloads; typed error classes with stable codes; unexpected → Sentry, expected →
typed response. **Rate limiting:** every public endpoint + every money-costing
mutation (per-org quota before the external call). **Background work:** external
API calls run in a queue (start with `graphile-worker`, not SQS/BullMQ);
idempotent, safe retries.

## 4. Code Quality Bar

TS strict, no `any` (`unknown` at boundaries, narrow with Zod). Parse at the
edge, trust internally. Pure core (`lib/`, DB-free testable) / effectful shell
(`app/`, `lib/db/`, `lib/stripe/`). Server Components by default; `"use client"`
only for interactivity. Server Actions for mutations. Names carry intent. Delete
dead code. Comments explain *why*, never *what*.

## 5. Testing

New behavior ships with a Vitest test that would have failed before. Bug fixes
ship with a regression test (write the failing test first). Playwright only for
signup, org creation, checkout, core product action, cancellation. Fix or delete
flaky tests — never retry-loop them.

## 6. Git & PR Hygiene

Trunk-based: short-lived branches, small PRs, merge to `main` → Railway
auto-deploys. One logical change per commit, imperative mood, *why* in the body.
Never force-push `main`, never commit `.env*`/secrets/generated files, never
amend history you didn't create this session without asking. CI green before
merge: typecheck, lint, test, `prisma validate`, `prisma migrate diff` clean.

## 7. Reporting Back

Lead with the outcome ("Done, merged, deployed" / "Blocked on Y"), not
narration. List what changed (file → one-line why). List what to verify (exact
command/URL/query). Flag anything surprising. **Never claim done for something
you didn't run** — say "implemented, not yet run" or "types pass, not tested
e2e" when that's the truth.

## 8. Disagreement

Push back once, clearly, with the reason and the alternative. Then, if overruled,
do it my way and note the risk. An engineer, not a stenographer.

## 9. Hard Stops — NEVER without explicit confirmation

Drop/truncate/rename a prod table, column, or index · modify auth, session,
permission, or membership logic · change Stripe webhook handlers, price IDs, or
billing math · rotate/print/move secrets or `.env` files · mass-update/delete
rows without a counted `WHERE` · `rm -rf`, `git reset --hard`, `git push
--force`, `DROP`, `TRUNCATE`, or `prisma migrate reset` outside a scratch dir ·
disable a test/lint/TS/CI step to make the build pass · add a paid service or a
dependency with a network side-effect · deploy to prod outside merge-to-`main`.

## 10. Infrastructure Ground Truth

```
GitHub (private, main) --push--> Railway (Next.js app + Postgres)
                                     ▲
Namecheap domain -> Cloudflare (proxy, free) -> Railway -> end users
Later, when needed: DO Spaces (uploads + nightly pg_dump), Upstash Redis
(rate limit/cache), DO Managed Postgres (if Railway DB > ~$25/mo).
```

Deployment: open PR → CI → review → merge to `main` → Railway builds & deploys →
Cloudflare serves. No manual prod steps, ever.

## 11. This Product In One Paragraph

> **DRAFT — pending founder confirmation.** opencursor is a Cursor-clone AI
> coding agent for VS Code (chat, inline edit, agent mode, codebase RAG),
> distributed free with a bring-your-own-API-key model. opencursor Cloud (the
> `web/` app) is how it makes money: developers pay ~$9/mo for a Pro license
> that grants supporter status and priority features, managed through their
> account and Stripe billing. The customer is an individual developer or a small
> team. "Broken" means: a paying customer can't sign in, can't activate or
> validate their license (so the extension won't recognize Pro), a Stripe
> webhook fails to grant/revoke entitlement (they paid but got nothing, or
> cancelled but kept access), or another org can see their data. Any of these
> erodes trust in a paid dev tool and must be treated as an incident.

Read this paragraph before every non-trivial decision. If a change doesn't serve
it, question the change.
