# Architecture

## Monorepo structure

The project is organized as an npm workspaces monorepo with three packages:

| Package | Path | Purpose |
|---|---|---|
| `@bookmark-manager/extension` | `packages/extension/` | Browser extension (Chrome + Firefox) |
| `@bookmark-manager/shared` | `packages/shared/` | Types and constants shared across packages |
| `@bookmark-manager/server` | `packages/server/` | Optional backend service |

---

## Extension

### Extension contexts

A Manifest V3 extension runs code in three isolated contexts. They cannot share memory — all coordination happens through message passing or shared storage.

| Context | File | Lifetime | DOM access |
|---|---|---|---|
| Background service worker | `src/background/index.ts` | Ephemeral — terminated when idle | No |
| Sidebar page | `src/sidebar/main.tsx` | Lives while sidebar is open | Yes |
| Content script | `src/content/` | Lives while tab is open | Yes (host page) |

### Service worker constraints

The background service worker is **not persistent**. The browser terminates it after ~30 seconds of inactivity and restarts it on demand. This means:

- No in-memory state survives between invocations. Do not store anything in module-level variables and expect it to persist.
- Use `chrome.storage.session` for short-lived state (cleared on browser restart) or `chrome.storage.local` for durable state.
- All async work must complete before the service worker goes idle. Use `chrome.runtime.onMessage` with a response callback, or `event.waitUntil()` where applicable.
- The service worker has no DOM and cannot use `window`, `document`, or browser UI APIs directly.

### Message passing

Communication between contexts uses `chrome.runtime.sendMessage` / `chrome.runtime.onMessage`. The sidebar sends requests to the background; the background handles storage and AI calls.

```
Sidebar  ──sendMessage──▶  Background SW  ──fetch──▶  AI provider API
                                │
                         StorageProvider
               ┌──────────────┼──────────────┐
       File System    chrome.storage.local    Remote API
       (local JSON)   (browser storage)       (server sync)
```

Content scripts are used only for reading page metadata (title, URL) at save time — they do not participate in storage or AI calls.

### Storage abstraction

All bookmark data access goes through a `StorageProvider` interface defined in `packages/extension/src/storage/types.ts`. The rest of the application depends only on this interface — not on any specific backend.

```typescript
interface StorageProvider {
  readData(): Promise<RootData>;
  writeData(data: RootData): Promise<void>;
}
```

Three implementations ship currently. The user chooses in the Settings panel; the choice is persisted in `chrome.storage.local`.

#### FileSystemStorageProvider

Reads and writes a user-specified local JSON file using the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API).

**Browser support:** Chromium only. Firefox does not implement `showSaveFilePicker`, so the file storage option is hidden in the settings UI when the API is unavailable (`typeof window.showSaveFilePicker === 'function'`).

**Onboarding flow:**
1. On first run, the sidebar detects no file handle is stored.
2. User is shown a setup screen prompting them to select or create a file.
3. `showSaveFilePicker()` opens a native save dialog.
4. The returned `FileSystemFileHandle` is persisted to IndexedDB (file handles cannot be stored in `chrome.storage` directly — they are non-serializable objects).
5. On subsequent runs, the stored handle is retrieved and permission re-verified with `handle.queryPermission({ mode: 'readwrite' })`. If permission was revoked, the user is prompted again.

Writes are full-file overwrites (read → mutate → write). At bookmark-manager scale this is fine; the file will rarely exceed a few hundred KB.

#### BrowserStorageProvider

Reads and writes `chrome.storage.local` directly. Simpler setup — no file picker, no IndexedDB handle management. Data is tied to the browser profile and subject to `chrome.storage.local`'s quota (~10MB, sufficient for typical use).

#### RemoteStorageProvider

Syncs with the backend service over HTTP. On `readData()`, fetches all bookmarks via `GET /bookmarks`. On `writeData()`, diffs against an in-memory cache populated by the last `readData()` call and issues only the necessary `POST`, `PATCH`, and `DELETE` requests — unchanged bookmarks generate no traffic.

On first connection, local bookmarks are merged with any existing server bookmarks — server wins on URL conflict, local-only bookmarks are pushed up.

**Setup:** Select Server in the Storage Backend setting, enter the server URL, then sign in or create an account. The session token is stored in `chrome.storage.local`.

### Build output

Vite produces a directory loadable directly as an unpacked extension:

```
packages/extension/dist/          Chrome build
packages/extension/dist-firefox/  Firefox build

dist/
  manifest.json          copied from public/
  background/index.js    service worker bundle
  sidebar/index.html     copied from public/sidebar/
  sidebar/index.js       React app bundle
```

The Firefox build applies `public/manifest.firefox.json` over the Chrome manifest at the end of the build via a Vite `closeBundle` plugin.

### Browser compatibility

| Feature | Chromium | Firefox | Notes |
|---|---|---|---|
| File storage backend | Supported | Not supported | Firefox does not implement the File System Access API (`showSaveFilePicker`). The option is hidden in the settings UI via feature detection. |
| Open in Private Window | Supported | Requires user opt-in | `chrome.windows.create({ incognito: true })` is rejected unless the user has enabled **Allow in Private Windows** for this extension in `about:addons`. The call fails gracefully if permission has not been granted. |

---

## Server

The backend service is a Node.js REST API built with Fastify and Prisma. It is optional — the extension works without it using local storage.

### Stack

| Layer | Technology |
|---|---|
| HTTP framework | Fastify 5 |
| ORM | Prisma 6 |
| Database | PostgreSQL 18 |
| Auth | Server-side sessions (opaque tokens) |
| API docs | `@fastify/swagger` + `@fastify/swagger-ui` (served at `/docs`) |

### Application structure

```
packages/server/src/
  index.ts          entry point — binds to port 3000
  app.ts            Fastify app factory (buildApp) — registers plugins and routes
  plugins/
    prisma.ts       decorates app with a shared PrismaClient instance
    session.ts      decorates app with an authenticate preHandler
  routes/
    health.ts       GET /health
    auth.ts         POST /auth/signup, /auth/login, /auth/logout
    bookmarks.ts    GET/POST/PATCH/DELETE /bookmarks
```

The `buildApp()` factory in `app.ts` is separate from `index.ts` so tests can import and run the app via `app.inject()` without binding to a port.

### Authentication

Authentication uses **server-side sessions** with opaque tokens:

1. On signup or login, the server generates 32 bytes of cryptographically secure random data and returns it to the client as a 64-character hex string.
2. The server stores a SHA-256 hash of the token in the `Session` table — the raw token is never persisted.
3. Sessions expire after 30 days.
4. Authenticated requests send `Authorization: Bearer <token>`; the server hashes it, looks up the session, checks expiry, and attaches the user to `request.user`.

This design allows instant revocation (delete the session row) and is safe against database compromise (hashes cannot be reversed into usable tokens).

### Database schema

```
User            — email, passwordHash
Session         — tokenHash, userId, expiresAt
Organization    — name
OrgMembership   — userId, orgId, role (MEMBER | EDITOR | ADMIN)
Bookmark        — url, title, description, tags[], faviconUrl, userId | orgId
```

Every `Bookmark` belongs to exactly one owner — either a `User` (personal) or an `Organization` (shared). A CHECK constraint enforces this at the database level.

Migrations live in `packages/server/prisma/migrations/` and are applied with `prisma migrate deploy` (production/CI) or `prisma migrate dev` (local development).
