# Project Brief: AI-Powered Browser Bookmark Manager
*A cross-browser extension with tag-based organization and AI-assisted categorization*

---

## Vision

A completely independent bookmark manager that lives in the browser as an extension. It has its own data store, its own UI, and its own organizational model. The browser's native bookmark system is irrelevant — users interact exclusively with this extension.

The core differentiators:
- **Tag-based organization** instead of folders — tags are properties of a bookmark, not locations, so a bookmark can exist under multiple "folders" simultaneously
- **AI-powered auto-tagging** — when you save a bookmark, AI suggests relevant tags automatically
- **You own your data** — choose between a local JSON file (portable, cloud-syncable via Dropbox/OneDrive/etc.) or browser storage; no required accounts or backend for MVP
- **Cross-browser** — built on standard WebExtensions API, targeting Chromium-based browsers (Chrome, Edge, Vivaldi, Brave, Opera) with Firefox compatibility as a secondary goal
- **Pluggable AI providers** — supports Anthropic, OpenAI, Azure OpenAI, and OpenRouter via a simple provider abstraction
- **Designed for evolution** — storage abstraction accommodates a future backend service for team/organizational use or SaaS deployment

---

## Architecture

### Extension Type
WebExtensions API, Chromium-first. Uses standard APIs only (no Chrome-specific APIs) to maximize cross-browser compatibility. UI lives in a sidebar panel or dedicated extension page — not a minimal popup — because the feature set requires real UI space.

### Data Storage
A `StorageProvider` interface abstracts the storage backend. Two implementations are supported in MVP:

- **File System** — a single local JSON file the user selects via a file picker. Portable and cloud-syncable by placing it in a Dropbox, OneDrive, Google Drive, or iCloud folder.
- **Browser storage** — data stored in `chrome.storage.local`. Simpler setup, no file picker required, but limited to ~10MB and tied to the browser profile.

The user chooses their preferred backend during setup. Swapping backends or adding new ones (including a remote API) is a contained change that does not affect application code.

### AI Integration
External API calls to the user's chosen AI provider. The user supplies their own API key during setup. Providers are implemented as concrete instances of a common provider interface, making it easy to add new providers later.

### Backend (MVP: none)
No server, no account creation, no cloud dependency for MVP. The extension talks directly to the AI provider API and to the user's chosen local storage backend.

A backend service is planned as a post-MVP evolution. The `StorageProvider` abstraction is designed to accommodate a `RemoteStorageProvider` that talks to an API. The backend vision: a self-hostable service usable by individuals, organizations, or as a managed SaaS offering. When a backend is in use, AI calls would be proxied through it (removing the need for users to supply their own API keys), and multi-device sync would be handled natively rather than relying on cloud folder placement.

---

## Tag Model

Tags are strings stored directly on each bookmark. The `/` character is reserved as a hierarchy separator and cannot be used within a tag name. This convention enables a parent/child tag relationship with no additional data structure required.

**Examples:**
- `programming` — top-level tag
- `programming/rust` — child tag under `programming`
- `programming/rust/async` — grandchild tag

The tag tree is **derived at runtime** by scanning all bookmarks — there is no separate tag registry. This keeps the data model simple. The one operation that requires a sweep of all bookmarks is tag rename, which is handled by a dedicated `renameTag(oldName, newName)` function.

**UI Views:**
1. **Flat list** — all bookmarks with their tags displayed inline
2. **Tree view** — tags presented as expandable folders, with subtags as subfolders; a bookmark appears under every tag applied to it

---

## Data Model

### Bookmark Object

```json
{
  "id": "uuid-v4",
  "url": "https://example.com",
  "title": "Example Site",
  "description": "",
  "tags": ["programming/rust", "tools/cli"],
  "faviconUrl": "https://example.com/favicon.ico",
  "faviconCache": null,
  "createdAt": "2026-04-27T12:00:00Z",
  "aiSuggestedTags": ["programming/rust"],
  "userModifiedTags": true
}
```

**Field notes:**
- `id` — UUID v4, generated at save time
- `title` — pre-populated from the page's `<title>` tag / browser tab title; user-editable
- `description` — optional user note; may also store an AI-generated page summary
- `tags` — array of tag strings, including hierarchy via `/` separator
- `faviconUrl` — stored at save time; rendered via `chrome://favicon/` API for MVP (uses browser cache automatically)
- `faviconCache` — reserved for future base64-encoded favicon caching for offline support; `null` for MVP
- `aiSuggestedTags` — the raw tags the AI suggested, preserved for future analysis/improvement
- `userModifiedTags` — true if the user changed the AI's suggestions before saving

### Root Data File Structure

```json
{
  "version": "1.0",
  "settings": {
    "aiProvider": "anthropic",
    "aiApiKey": "sk-ant-...",
    "dataFilePath": "/Users/name/Dropbox/bookmarks.json"
  },
  "bookmarks": []
}
```

**Notes:**
- `version` field enables forward-compatible schema migrations
- `settings` stored in the same file for portability; API key stored locally only
- `dataFilePath` is where the user wants the file to live (for cloud sync folder placement)

---

## AI Provider Abstraction

Define a provider interface early. Each provider is a concrete implementation. Swapping or adding providers is then a contained, isolated task.

**Target providers for MVP:**
- Anthropic (Claude)
- OpenAI (GPT-4o)
- Azure OpenAI (same API shape as OpenAI, different endpoint/auth)
- OpenRouter (same API shape as OpenAI, user-configured model)

**Interface (conceptual):**
```typescript
interface AIProvider {
  name: string;
  suggestTags(url: string, title: string, description: string, existingTags: string[]): Promise<string[]>;
  summarizePage(url: string, title: string, content: string): Promise<string>;
}
```

Passing `existingTags` to `suggestTags` is important — it allows the AI to suggest tags that are consistent with the user's existing taxonomy rather than inventing new ones.

---

## Save Flow (Core UX Loop)

1. User is on a page they want to bookmark
2. User clicks the extension toolbar button
3. A panel opens showing:
   - Page title (pre-populated, editable)
   - Page URL (read-only)
   - AI-suggested tags (editable — user can add, remove, or modify)
   - Optional description field
4. User reviews tags, makes any changes
5. User clicks **Save**
6. Bookmark is written to the JSON file

**No interception of Ctrl+D or native browser bookmark shortcuts.** This is intentional — intercepting browser-level shortcuts varies per Chromium variant and is a maintenance liability. The dedicated save button is cleaner UX anyway, since it opens a richer save experience than the native dialog.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| UI Framework | React |
| Extension API | WebExtensions API (Manifest V3) |
| Data format | JSON |
| AI integration | REST API calls (provider-dependent) |
| Build tooling | Vite + web-ext (or equivalent) |

React is appropriate here (not overkill) because the UI includes a tag tree, bookmark list, search filtering, and settings — real stateful UI that benefits from component-based architecture. TypeScript throughout for type safety on the data model.

---

## MVP Scope

The following constitutes a shippable, useful v1:

- [ ] Extension installs and loads in Chrome/Chromium browsers
- [ ] Settings screen: choose AI provider, enter API key, choose storage backend (file or browser storage)
- [ ] Save bookmark flow: toolbar button → panel → AI tag suggestions → save
- [ ] Bookmark list view: flat list with tags displayed
- [ ] Tag tree view: expandable tree where tags are "folders"
- [ ] Basic search: filter bookmarks by title, URL, or tag
- [ ] Data persisted to user's chosen storage backend (file or browser storage)

---

## Post-MVP Backlog (not in scope for v1)

- Dead link detection (periodic background check of stored URLs)
- AI-generated page summary stored at save time
- Favicon caching (base64 in `faviconCache` field)
- Tag rename with sweep update across all bookmarks
- Import from browser's native bookmarks
- Import from Delicious, Pinboard, or other bookmark managers
- Recommendations ("you have 40 bookmarks tagged `rust` — here are related resources")
- Firefox compatibility validation and fixes
- Companion desktop app (Electron or Tauri) for richer management UI
- Keyboard shortcuts
- Bookmark deduplication
- **Backend service** — self-hostable API for multi-device sync, team/org use, and optional SaaS deployment; proxies AI calls so users don't need their own API keys; implemented as a `RemoteStorageProvider` behind the existing `StorageProvider` interface

---

## Important Technical Constraints

### Manifest V3
This extension must use Manifest V3 (MV3), which is the current and required standard for Chromium extensions. The key implication is that **background scripts are now service workers** — they do not run persistently and will be terminated by the browser when idle. This affects how state is managed in the background context. Do not assume a persistent background page. Use Chrome's storage APIs or message passing to communicate state across contexts.

### File System Access API
Browser extensions run in a sandboxed environment and do not have arbitrary filesystem access. Writing the bookmark data to a user-specified local file requires the **File System Access API**, which prompts the user to grant the extension access to a specific file or folder. This permission persists across sessions when stored correctly. This affects the onboarding flow — the user's first-run experience must include a step where they select or create the file they want to use as their data store. Claude Code should handle this using the `showOpenFilePicker` or `showSaveFilePicker` browser APIs.

---

## Key Design Decisions (already made)

| Decision | Choice | Rationale |
|---|---|---|
| Tag storage | Denormalized (strings on bookmark) | Simpler; performance irrelevant at bookmark-manager scale |
| Tag hierarchy | `/` separator convention | No extra data structure; intuitive; matches conventions in tools like Obsidian |
| Storage backend | User's choice: file or browser storage | File is portable/syncable; browser storage is simpler — abstraction means neither is locked in |
| Sync strategy (file backend) | User places file in cloud-synced folder | No backend to build or maintain; user controls their data |
| Save UX | Dedicated extension button | Avoids cross-browser Ctrl+D interception complexity |
| AI | External API, user-supplied key (MVP) | Simple setup; avoids local model complexity; backend will proxy when available |
| Favicon | `chrome://favicon/` for MVP | Browser cache handles it; no extra network requests |
| Data format | Single JSON file | Simple; portable; human-readable |
| Storage abstraction | `StorageProvider` interface | Isolates storage concerns; enables future backend without changing app code |

---

## Project Name (TBD)

Some options to consider: **Tagmark**, **Foliomark**, **Leafmark**, **Markleaf**. Or name it something entirely different — this is just a placeholder.

---

*This document was produced during project planning and represents the agreed architecture and scope before implementation begins. It should be treated as the authoritative reference for Claude Code sessions.*
