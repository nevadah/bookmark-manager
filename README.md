# Bookmark Manager

An AI-powered browser bookmark manager built as a WebExtension (Manifest V3). Tag-based organization with AI-assisted auto-tagging. Your data stays under your control — works entirely locally with no accounts required, with an optional backend service for sync and team use.

## Purpose

The purpose and goals of this project are:
- To practice coding with TypeScript and React and, as a secondary goal, to learn browser extension development.
- To use AI differently than other projects I've done. Claude guides the process and suggests tasks, I write the code, and Claude reviews my work.
- To demonstrate iterative design in practice. Initial design decisions are made with incomplete information — you can't fully evaluate a design until you're actually using it. This project tracks those decisions and the changes that follow from real use. See [docs/iterative-design.md](docs/iterative-design.md).

This is a learning project. It is not initially intended as something that will be put into production but it's possible it will get to that point.

## Features

- **Tag-based organization** — tags are properties, not folders; a bookmark can carry multiple tags simultaneously
- **Hierarchical tags** — use `/` as a separator (`programming/rust/async`); the tree is derived at runtime
- **AI auto-tagging** — pluggable providers (Anthropic, OpenAI, Azure OpenAI, OpenRouter); you supply your own API key
- **Your data, your choice** — pick your storage backend:
  - **Local file** — a single JSON file you control; place it in Dropbox/OneDrive/iCloud for free sync across machines
  - **Browser storage** — stored in your browser profile, no file picker required
  - **Backend service** *(in development)* — self-hostable or managed; removes the need for your own AI API key
- **Cross-browser** — targets Chromium (Chrome, Edge, Brave, Vivaldi, Opera) and Firefox

## Tech stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Extension UI | React 18, Vite 6 |
| Extension API | WebExtensions API, Manifest V3 |
| Server | Fastify 5, Prisma 6, Node.js 22 |
| Database | PostgreSQL 18 |
| Testing | Vitest |
| Monorepo | npm workspaces |

## Repository structure

```
packages/
  extension/        browser extension (Chrome + Firefox)
    src/
      background/   service worker
      sidebar/      React app — main extension UI
      providers/    AI provider abstraction and implementations
      storage/      StorageProvider abstraction and implementations
      i18n/         localization (react-i18next)
    public/
      manifest.json         Chrome MV3 manifest
      manifest.firefox.json Firefox overrides (applied at build time)
      sidebar/              static HTML shell
  shared/           types and constants shared across packages
    src/shared/
      types/        shared TypeScript types and data model
      providers/    AI prompt constants
  server/           optional backend service
    src/
      plugins/      Fastify plugins (Prisma client, session auth)
      routes/       API route handlers
      test/         integration tests
    prisma/
      schema.prisma database schema
      migrations/   applied migration history
```

---

## Extension development

### Prerequisites

- Node.js 22+
- npm

### Setup

```bash
npm install
```

### Build

```bash
npm run build          # Chrome production build → packages/extension/dist/
npm run build:firefox  # Firefox build → packages/extension/dist-firefox/
npm run dev            # watch mode (Chrome)
```

### Quality gates

```bash
npm run check   # lint + typecheck + build (both packages)
npm run test    # unit and integration tests (see Testing section)
```

### Load in Chrome

1. Run `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select `packages/extension/dist/`
5. Click the extension icon in the toolbar to open the sidebar

After making changes, run `npm run build` again and click the reload button on the extension card.

### Load in Firefox

1. Run `npm run build:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on** and select any file inside `packages/extension/dist-firefox/`

---

## Server development

### Additional prerequisites

- PostgreSQL 18 — install from [postgresql.org/download](https://www.postgresql.org/download/). Keep the default port (5432).

### Database setup

Create the development and test databases (run once):

```bash
createdb -U postgres bookmark_manager
createdb -U postgres bookmark_manager_test
```

### Environment setup

Create `packages/server/.env`:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/bookmark_manager"
```

Create `packages/server/.env.test`:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/bookmark_manager_test"
```

Both files are git-ignored. See `packages/server/.env.example` for the required format.

### Apply migrations

```bash
cd packages/server
npx prisma migrate dev
```

### Start the server

```bash
npm run dev -w @bookmark-manager/server
```

The server starts on `http://localhost:3000`. OpenAPI docs are available at `http://localhost:3000/docs`.

---

## Testing

Tests use Vitest. Server integration tests run against the `bookmark_manager_test` database — PostgreSQL must be running and `.env.test` must be configured before running them.

```bash
npm run test                                 # all tests (extension + server)
npm run test -w @bookmark-manager/server     # server only
npm run test -w @bookmark-manager/extension  # extension only
```

---

## CI

GitHub Actions runs on every push and pull request to `main`:

1. **Lint** — ESLint across all packages
2. **Typecheck** — `tsc --noEmit` across all packages
3. **Build** — Chrome and Firefox extension builds
4. **Test** — all tests; CI spins up a PostgreSQL 18 service container for the server integration tests

Artifact builds (Chrome `.zip` and Firefox `.xpi`) are produced on every PR and attached to the workflow run for manual testing.

Release builds are produced on `v*.*.*` tags and attached to a GitHub Release.
