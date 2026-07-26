import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Check,
  FileSearch,
  GitCompareArrows,
  MessagesSquare,
  Pencil,
  Route,
} from 'lucide-react';

const features = [
  {
    icon: MessagesSquare,
    title: 'AI chat panel',
    body: 'Streaming responses in a sidebar, Markdown and syntax-highlighted code, multi-turn history with stop, regenerate, and clear.',
  },
  {
    icon: FileSearch,
    title: 'Context mentions',
    body: '@file, @folder, and @codebase inject real file contents and retrieved chunks into the prompt, with autocomplete and token budgeting.',
  },
  {
    icon: Pencil,
    title: 'Inline edit',
    body: 'Select code, describe a change, and review the streamed rewrite as a per-hunk accept or reject diff.',
  },
  {
    icon: Bot,
    title: 'Agent mode',
    body: 'An autonomous plan → tool → observe loop with a visible step trace and per-action approval across read, search, edit, and terminal tools.',
  },
  {
    icon: Route,
    title: 'Model routing',
    body: 'Pluggable Anthropic and OpenAI providers with streaming and tool calling, a model picker, and keys stored in SecretStorage.',
  },
  {
    icon: GitCompareArrows,
    title: 'Diff review everywhere',
    body: 'Every model-authored change is surfaced as a diff you accept or reject. Nothing is ever written to disk silently.',
  },
];

const proFeatures = [
  'Everything in Free, forever',
  'Supporter status and a Pro license key',
  'Priority access to new features',
  'Multiple saved key profiles',
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      {/* Ambient gradient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top,hsl(var(--accent)/0.25),transparent_60%)]"
      />

      <header className="container flex items-center justify-between py-6">
        <span className="text-lg font-semibold tracking-tight">
          opencursor<span className="text-muted-foreground"> Cloud</span>
        </span>
        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <a href="#pricing" className="transition-colors hover:text-foreground">
            Pricing
          </a>
          <Link
            href="/dashboard"
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Sign in
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="container flex flex-col items-center py-24 text-center sm:py-32">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          The companion platform for the opencursor extension
        </span>
        <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
          Your AI coding agent,{' '}
          <span className="text-muted-foreground">with a home.</span>
        </h1>
        <p className="mt-6 max-w-xl text-balance text-lg text-muted-foreground">
          opencursor brings Cursor-grade chat, inline edit, an agentic tool loop,
          and codebase retrieval to VS Code. opencursor Cloud handles your
          account, license, and billing.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Get started
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-md border border-border px-6 py-3 font-medium transition-colors hover:bg-secondary"
          >
            Explore features
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight">
          Everything Cursor does daily — in your editor
        </h2>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-foreground/20"
            >
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-secondary text-foreground">
                <Icon className="size-5" />
              </div>
              <h3 className="text-lg font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container py-20">
        <h2 className="text-center text-3xl font-semibold tracking-tight">
          Simple, honest pricing
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
          Bring your own API key. The extension is free and open. Go Pro to
          support development and unlock priority features.
        </p>
        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-8">
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Free
            </h3>
            <p className="mt-4 text-4xl font-semibold">
              $0
              <span className="text-base font-normal text-muted-foreground">
                {' '}
                / forever
              </span>
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              The full extension, with your own Anthropic or OpenAI key.
            </p>
          </div>
          <div className="relative rounded-2xl border border-foreground/30 bg-card p-8 shadow-[0_0_0_1px_hsl(var(--foreground)/0.1)]">
            <span className="absolute -top-3 right-8 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
              Recommended
            </span>
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Pro
            </h3>
            <p className="mt-4 text-4xl font-semibold">
              $9
              <span className="text-base font-normal text-muted-foreground">
                {' '}
                / month
              </span>
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {proFeatures.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-foreground" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="container flex flex-col items-center gap-2 border-t border-border py-10 text-sm text-muted-foreground">
        <span>
          © {new Date().getFullYear()} opencursor. Released under the MIT
          License.
        </span>
      </footer>
    </main>
  );
}
