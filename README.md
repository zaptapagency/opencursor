# opencursor

An AI coding agent for VS Code — chat, context mentions, inline edit, an
agentic tool-use loop, and local codebase retrieval — packaged as an
installable extension. Reproduces the core daily-use features of Cursor.

> **Monorepo note.** This repository contains two independently-deployable
> artifacts:
>
> - **the extension** (repo root) — ships as a `.vsix`, built with npm.
> - **[`web/`](web/)** — **opencursor Cloud**, the companion SaaS platform
>   (accounts, licensing, billing, admin). A standalone Next.js 15 app built
>   with pnpm and deployed on Railway. See [`web/README.md`](web/README.md).

## Features

- **AI chat panel** — streaming responses in a sidebar webview, Markdown +
  syntax-highlighted code, multi-turn history, stop / regenerate / clear.
- **Context mentions** — `@file`, `@folder/`, and `@codebase` inject real file
  contents / retrieved chunks into the prompt, with `@`-autocomplete and token
  budgeting.
- **Inline edit (Cmd/Ctrl+K)** — select code, describe a change, and review the
  streamed rewrite as a **per-hunk accept/reject** diff.
- **Agent mode** — an autonomous plan → tool → observe loop with a visible step
  trace and per-action approval. Tools: `read_file`, `list_dir`, `search_code`
  (ripgrep), `get_diagnostics`, `write_file` (reviewable diff), `run_terminal`.
- **Codebase indexing (RAG)** — chunk the workspace, embed chunks, store them in
  a local vector index, and semantically retrieve for `@codebase`. Incremental
  re-index on save.
- **Model routing** — pluggable Anthropic + OpenAI providers with streaming and
  tool calling, a model picker, and API keys stored in **SecretStorage**.
- **Diff review everywhere** — every model-authored file change is surfaced as a
  diff you accept or reject; nothing is written silently.

## Install

From a packaged `.vsix`:

```bash
npm install
npm run build
npm run package          # produces opencursor-0.0.1.vsix
code --install-extension opencursor-0.0.1.vsix
```

Or press **F5** in this repo to launch an Extension Development Host.

## Setup

1. Run **opencursor: Set API Key** (`Ctrl/Cmd+Shift+P`) and enter an Anthropic
   and/or OpenAI key. Keys are stored in VS Code SecretStorage — never in
   settings or logs.
2. Run **opencursor: Select Model** to choose the active chat/agent model.
3. `@codebase` and semantic retrieval require an **OpenAI** key (used for
   embeddings) and a one-time **opencursor: Index Workspace**.

## Commands

| Command | Purpose |
| ------- | ------- |
| `opencursor: Open Chat` | Focus the chat sidebar |
| `opencursor: Inline Edit` | Cmd/Ctrl+K rewrite of the selection |
| `opencursor: Select Model` | Pick the active model |
| `opencursor: Set API Key` | Store a provider key securely |
| `opencursor: Index Workspace` | Build the local RAG index |
| `opencursor: Ping Model (debug)` | Stream a one-line completion to verify keys |

## Develop

```bash
npm run build      # clean + typecheck + Vite webview + esbuild host + lint
npm test           # Vitest unit tests (provider mocked)
npm run test:integration   # @vscode/test-electron (downloads VS Code)
```

## Architecture

```
src/
  extension.ts        activation, commands, view registration
  core/services.ts    dependency container
  llm/                provider interface, anthropic.ts, openai.ts, toolAdapter
  config/             secrets (SecretStorage) + model registry
  chat/               host-side chat controller (streaming, history, agent)
  context/            mentions, tokenBudget, chunker, vectorStore, retriever, indexer
  edit/               diff (hunks), diffReviewer, inlineEdit (Cmd+K)
  agent/              orchestrator, approval, tools/*
  view/               webview provider + CSP HTML shell
  webview/            React app (Vite → media/webview)
  shared/messages.ts  typed webview<->host protocol
```

## Honest limitations

These are deliberate, documented tradeoffs — not hidden stubs:

- **Tab autocomplete is out of scope.** opencursor ships **no** custom
  tab-completion model. Inline edit (Cmd+K), chat, and agent mode are the
  editing surfaces. A fast inline-completion provider could be wired as an
  optional, clearly-labeled stand-in, but is intentionally not included.
- **Vector store is pure-TypeScript**, not LanceDB / sqlite-vec. It's an
  in-memory cosine index persisted to JSON in the extension's storage dir —
  fully local and dependency-free, chosen for reliable cross-platform install.
  The `VectorStore` interface is a drop-in seam for a native backend later.
- **Chunking is a language-aware heuristic**, not Tree-sitter AST parsing. It
  detects top-level declaration boundaries per language (TS/JS/Py/Go/Rust/
  JSON/MD) and packs bounded windows. `web-tree-sitter` is the intended upgrade
  (see `TODO(phase6)` in `src/context/chunker.ts`).
- **Embeddings require OpenAI.** Anthropic has no embeddings endpoint, so
  `@codebase` routes embeddings through OpenAI regardless of the chat provider.
- **Token counting is approximate** (~4 chars/token heuristic) to avoid a native
  tokenizer dependency.

## Security

- API keys live only in **SecretStorage**; `redactSecrets()` scrubs key-shaped
  strings from logs.
- `run_terminal` shows the command and **requires approval by default**; all
  file writes pass through the diff reviewer.

## License

MIT
