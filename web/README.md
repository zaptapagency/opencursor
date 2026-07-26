# opencursor Cloud

The companion SaaS platform for the [opencursor](../README.md) VS Code
extension: accounts, license activation, subscription billing, and admin. A
standalone Next.js 15 app, deployed on Railway.

> This is a separate deployable from the extension. The extension ships as a
> `.vsix`; this app runs as a web service. They live in one repo but build
> independently — this app uses **pnpm**, the extension uses npm.

## Stack

- **Next.js 15** (App Router, React Server Components, TypeScript strict)
- **PostgreSQL** via **Prisma** (multi-tenant: `User → Membership → Organization`)
- **Auth.js (NextAuth v5)** — Google OAuth + email magic link _(Phase B)_
- **Stripe** — Checkout, Billing Portal, webhooks _(Phase D)_
- **Tailwind CSS + shadcn/ui**
- **Zod** validation at every trust boundary

## Local development

Requires Node 20+, pnpm 9+, and a PostgreSQL database.

```bash
cd web
pnpm install
cp .env.example .env.local          # then fill in DATABASE_URL
pnpm prisma migrate dev             # create/apply the schema locally
pnpm dev                            # http://localhost:3000
```

Verify the app and database are healthy:

```bash
curl http://localhost:3000/api/health
# { "status": "ok", "db": "up", "time": "..." }
```

## Environment variables

All variables are documented in [`.env.example`](.env.example) and validated at
boot by [`src/lib/env.ts`](src/lib/env.ts). Phase A reads only `DATABASE_URL`,
`NEXT_PUBLIC_APP_URL`, and `NODE_ENV`; later phases add their own (auth, Stripe,
Resend, licensing, admin) as they land.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | `prisma generate` + production build |
| `pnpm start` | Start the production server |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint (`next lint`) |
| `pnpm prisma:migrate` | Create/apply a dev migration |
| `pnpm prisma:studio` | Open Prisma Studio |

## Railway deployment

1. Create a Railway project from the GitHub repo.
2. In the service settings, set **Root Directory** to `web`.
3. Add the **PostgreSQL** plugin — it injects `DATABASE_URL` automatically.
4. Set the remaining environment variables from `.env.example` in the service
   **Variables** UI.
5. Deploys are driven by [`railway.json`](railway.json): Nixpacks builds the
   app, then `prisma migrate deploy` runs migrations before the server starts.
   Railway gates traffic on the `/api/health` check.

Pushes to `main` auto-deploy. See the repo-root `CLAUDE.md` for the full
engineering charter and deployment ground rules.
