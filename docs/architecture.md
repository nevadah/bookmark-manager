# Architecture

## Extension contexts

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
                         File System Access API
                                │
                         bookmarks.json (local file)
```

Content scripts are used only for reading page metadata (title, URL) at save time — they do not participate in storage or AI calls.

## File System Access API

The extension writes bookmark data to a user-specified local file using the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API). This requires explicit user permission via a file picker.

### Onboarding flow

1. On first run, the sidebar detects no file handle is stored.
2. User is shown a setup screen prompting them to select or create a file.
3. `showSaveFilePicker()` opens a native save dialog.
4. The returned `FileSystemFileHandle` is serialized and stored in `chrome.storage.local` via `IndexedDB` (file handles cannot be stored in `chrome.storage` directly — use a wrapper).
5. On subsequent runs, the stored handle is retrieved and permission is re-verified with `handle.queryPermission({ mode: 'readwrite' })`. If permission was revoked, the user is prompted again.

### Storage wrapper

File handles must be persisted via IndexedDB (the only storage that accepts non-serializable objects in extensions). The storage layer in `src/shared/storage/` abstracts this:

- `getFileHandle()` — retrieves the stored handle or returns `null`
- `saveFileHandle(handle)` — persists the handle to IndexedDB
- `readBookmarks()` — reads and parses the JSON file
- `writeBookmarks(data)` — serializes and writes the full data file

Writes are full-file overwrites (read → mutate → write). At bookmark-manager scale this is fine; the file will rarely exceed a few hundred KB.

## Build output

Vite produces a `dist/` directory loadable directly as an unpacked extension:

```
dist/
  manifest.json          copied from public/
  background/index.js    service worker bundle
  sidebar/index.html     copied from public/sidebar/
  sidebar/index.js       React app bundle
```

The sidebar HTML in `public/sidebar/index.html` is static and references the built `../sidebar/index.js` bundle. Vite copies `public/` verbatim; only the JS entries go through Rollup.
