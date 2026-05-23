# Bugs Found in Testing

This document records bugs discovered through using the extension and server. Each entry describes what was broken, how it was found, and how it was fixed.

---

### AI tag race condition (PR #26)

Saving bookmarks quickly in succession caused AI-suggested tags to be lost or applied to the wrong bookmark. The async AI tagging call was closing over a stale copy of state and writing back outdated data, overwriting whatever had been saved in the meantime.

Found through manual testing. Fixed by reading from a ref rather than the stale closure, ensuring the AI write-back always applies to the current state.

---

### File System Access API not available on Firefox (PR #53)

The file storage option was shown to all users regardless of browser. On Chromium, it works. On Firefox, clicking the option did nothing — Firefox does not implement `showSaveFilePicker`, so the file picker never opened and the selection appeared to have no effect.

Found by loading the extension in Firefox and trying to select a file. The fix gates the option on `typeof window.showSaveFilePicker === 'function'`, hiding it entirely in browsers that don't support it.

---

### Tag tree expand/collapse state reset on navigation (PR #57)

The expand and collapse state of tag tree nodes was stored only in React component state. Switching to the Settings tab and back caused `BookmarksView` to unmount and remount, resetting everything to fully expanded.

Found by using the extension normally — collapsing some branches to reduce noise, then navigating to settings and back. The fix persists expand/collapse state per tag path in `chrome.storage.local`, survives browser restarts, and prunes entries for tag paths that no longer exist when bookmarks change.

---

### File storage truncated existing file on open (PR #59)

The file storage option had a single "Select File..." button backed by `showSaveFilePicker`. When pointing it at an existing bookmarks file, Chrome shows a "Replace?" confirmation before handing back the handle — and by the time the extension calls `readData()`, the file has already been truncated. JSON.parse fails on the empty content, the catch block fires with an empty bookmark list, and that empty list is written back, destroying the file's contents.

Found by testing the intended workflow: create bookmarks in one browser, export to a file, open in a second browser by selecting the same file. The fix splits the action into two buttons: "New File..." continues to use `showSaveFilePicker` for creating a fresh file, while "Open Existing File..." uses `showOpenFilePicker` followed by `requestPermission({ mode: 'readwrite' })`. The open picker never truncates — it reads first, merges, then writes.

---

### Duplicate Dockerfile caused migrations to never run (PR #64)

While writing the Dockerfile for server deployment, the AI assistant created the file twice: first at the repo root (`Dockerfile`), then again at `packages/server/Dockerfile` as originally intended. The root file was left behind with the original content — `node:22-alpine` as the base image and no `prisma migrate deploy` step in the startup command.

`docker-compose.yml` specified `dockerfile: packages/server/Dockerfile`, but `podman-compose` ignored the `dockerfile:` field and resolved the build context root, finding and using the root `Dockerfile` instead. The result was a container that started the server directly without running migrations, causing every database request to fail with "relation does not exist".

Detected by running `podman compose up` and attempting a signup — the server returned 500 and the Postgres logs showed the `User` table did not exist. The root cause became clear when the build output showed `FROM node:22-alpine` instead of the expected `node:24-alpine`, confirming the wrong Dockerfile was being used.

Fixed by updating the root `Dockerfile` with the correct content (node:24, migration retry loop in the startup command), pointing `docker-compose.yml` to `dockerfile: Dockerfile` explicitly, and removing `packages/server/Dockerfile`.

---

### Server backend bookmarks lost on browser restart (PR #65)

The initial server storage implementation used `RemoteStorageProvider` as the primary store — every read went directly to the server and the results were held in an in-memory cache. This meant bookmarks were only available while there was an active network connection and a live cache. Reloading the extension or restarting the browser cleared the cache, and the sidebar showed nothing until the next successful fetch from the server.

The failure mode was discovered by restarting the browser with the server backend active and observing an empty bookmark list, even though the server had all the data. The in-memory cache was also the cause of the earlier-documented AI tag race condition.

The fix replaced the architecture entirely. The server is no longer the primary store — browser storage is always the working copy. `SyncService` syncs bidirectionally with the server using `POST /sync`, which merges changes using last-write-wins on `updatedAt`. Soft-delete tombstones (`deletedAt`) propagate deletions across devices without data loss. Sync is triggered on startup, debounced 3 seconds after every write, and runs on a 15-minute background alarm. The extension icon badge turns red if sync fails, and a status line appears in the sidebar. Bookmarks now survive browser restarts, extension reloads, and temporary server outages.

---

### Missing `alarms` permission crashed background service worker (PR #67)

Adding the 15-minute periodic sync alarm in PR #65 required the `"alarms"` permission, which was not declared in either manifest. Without it, `chrome.alarms` is `undefined` at runtime. Accessing `chrome.alarms.onAlarm` on startup threw `TypeError: Cannot read properties of undefined (reading 'onAlarm')`, which caused the background service worker registration to fail entirely (status code 15).

Found immediately after reloading the extension following the sync work. Fixed by adding `"alarms"` to the `permissions` array in both `manifest.json` and `manifest.firefox.json`.

---

### Duplicate bookmarks allowed (PR #66)

The "Save Current Page" button had no duplicate check — clicking it on a page already in the bookmark list added a second copy of the same URL. The import path had a duplicate check, but the direct save path did not.

Found through normal use. Fixed with a guard in `handleAddBookmark` that skips any URL already present in local storage (excluding tombstones from the server sync), and a check in `BookmarksView.handleSaveCurrentPage` that shows a brief "Already Saved" label on the button instead of calling `onAdd` when the current tab's URL is already bookmarked.
