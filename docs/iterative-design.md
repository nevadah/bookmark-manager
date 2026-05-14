# Iterative Design

This document records design decisions that changed as a direct result of using the extension — cases where the original design looked reasonable on paper but turned out to be wrong in practice. It also includes a few cases where I applied independent judgment to push back on or extend a design before a problem became apparent.

This is the record the README refers to when it says the project "tracks those decisions and the changes that follow from real use."

---

## UX changes driven by use

### Separate Bookmarks, Tags, and Search tabs → unified single view (PRs #21, #37)

The sidebar originally had three separate navigation tabs: Bookmarks, Tags, and Search. The assumption was that these were distinct enough modes to warrant separate views.

In practice, the separation created unnecessary navigation friction. The tags *are* the bookmarks — they're the same data viewed as a tree. And search is something you do *while* browsing bookmarks, not instead of it.

PR #21 unified the bookmarks list and tag tree into a single view with an edit panel. PR #37 removed the standalone Search tab and integrated filtering directly into the bookmarks view. The result is a single coherent view instead of three that each showed a partial picture.

---

### Tag chips removed from bookmark list (PR #34)

The original bookmark list displayed each bookmark's tags as inline chips below the title. This seemed like useful information to surface.

After using the extension, the chips made the list visually noisy without adding much — the tag tree right above already showed tag structure, and the chips duplicated that information in a harder-to-read form. Removing them made the list cleaner and easier to scan.

---

### Toolbar and nav fixed to top of sidebar (PRs #30, #35)

The save button, toolbar actions, and navigation were initially part of the normal document flow, scrolling with the bookmark list.

With any meaningful number of bookmarks, the toolbar and navigation scrolled out of view, requiring a scroll back to the top to save a new bookmark or switch views. Both were fixed in place: the nav bar stops scrolling off screen (PR #30), and the bookmark toolbar stays visible as the list scrolls beneath it (PR #35).

---

### `openInNewTab` setting added (PR #39)

Clicking a bookmark originally always opened it in a new tab. That behavior was hardcoded.

After using the extension, it became clear that the right behavior depends on context — sometimes you want to replace the current tab, not stack up new ones. A setting was added to control this, defaulting to `true` (new tab).

---

### Favicons captured on first visit after import (PR #38)

The browser bookmark import feature brought in bookmarks correctly, but the imported bookmarks had no favicons — there is no way to retrieve favicons at import time without visiting each URL.

After running an import and seeing a list of blank icons, the solution became obvious: capture the favicon the first time the user visits a URL that was imported without one. The background service worker listens for tab updates and fills in the favicon when it becomes available.

---

### File System Access API feature-detected for Firefox (PR #53)

The file storage option was shown to all users regardless of browser. On Chromium, it works. On Firefox, clicking the option did nothing — Firefox does not implement `showSaveFilePicker`.

Found by loading the extension in Firefox and trying to select a file. The fix gates the option on `typeof window.showSaveFilePicker === 'function'`, hiding it entirely in browsers that don't support it.

---

### AI tag race condition fixed (PR #26)

Saving bookmarks quickly in succession caused AI-suggested tags to be lost or applied to the wrong bookmark. The async AI tagging call was closing over a stale copy of state and writing back outdated data.

Found through manual testing. Fixed by reading from a ref rather than the stale closure, ensuring the AI write-back always applies to the current state.

---

### Bookmarks sorted alphabetically within tag groups (PR #61)

Bookmark ordering within tag tree nodes was determined by insertion order — the order bookmarks were added to the array, which varies by storage backend. File and browser storage preserve insertion order; the server returns bookmarks by creation timestamp. Importing from the browser produced one order; loading the same bookmarks back from the server produced a different one.

The fix sorts bookmarks alphabetically by title at display time in `buildTagTree` and in the untagged list, and sorts tag nodes alphabetically by name at every level of the tree. This is consistent across all storage backends and predictable for the user regardless of when or how bookmarks were added.

---

## Security and data model changes

### AI API key moved out of the bookmarks data (PR #54)

The API key was stored as part of the `Settings` object, which lived inside `RootData` — meaning it was written to whatever backend the user chose, including a plain-text JSON file on disk.

This is straightforward credential exposure: anyone with access to the bookmarks file (backup software, cloud sync, another user on the machine) would have the API key. The API key was moved to `chrome.storage.local` exclusively, where it is managed by the browser and never written to the file.

---

### All settings moved out of bookmark data (PR #54)

Following the API key change, the same reasoning applied to settings in general: if credentials don't belong in the data file, neither does the rest of the user's configuration.

There was also a structural problem: `storageBackend` — the setting that determines *which* file to write to — was itself stored in that file. This created a chicken-and-egg situation that caused a silent bug: switching to file-backend storage did not persist across extension reloads, because the bootstrap always read from browser storage first to discover the setting.

The fix separated concerns cleanly: all settings live in `chrome.storage.local` under a dedicated key. The bookmarks file (and browser storage data blob) contains only `version` and `bookmarks`. The bootstrap now reads settings first, then creates the correct storage provider.

---

### Right-click context menu added to bookmarks (PR #56)

The original bookmark list had small inline Edit and Delete icon buttons on each item. This worked, but reading back through the iterative design history surfaced the question of whether direct bookmark actions deserved a more natural home.

A right-click context menu was added with the full set of open actions (current tab, new tab, background tab, new window, private window) alongside Edit and Delete. This matches the interaction pattern users already have from their file manager and browser bookmarks bar, and surfaces actions that weren't available at all before (the various open modes).

---

### Tag tree expand/collapse state not persisted (PR #57)

The expand and collapse state of tag tree nodes was stored only in React component state. Switching to the Settings tab and back caused `BookmarksView` to unmount and remount, resetting everything to fully expanded.

Found by using the extension normally — collapsing some branches to reduce noise, then navigating to settings and back. The fix persists expand/collapse state per tag path in `chrome.storage.local`, survives browser restarts, and prunes entries for tag paths that no longer exist when bookmarks change.

---

### Save Settings button removed in favor of auto-save (PR #58)

The Settings form had an explicit Save Settings button. In practice this caused a recurring "forgot to save" problem — settings would be changed but not take effect until the button was clicked.

Selects now save on change, text inputs save on blur, and the file picker saves immediately after a file is selected. The Save Settings button was removed entirely.

---

### File storage split into "New File" and "Open Existing File" (PR #59)

The file storage option had a single "Select File..." button backed by `showSaveFilePicker`. When pointing it at an existing bookmarks file, Chrome shows a "Replace?" confirmation before handing back the handle — and by the time the extension calls `readData()`, the file has already been truncated. JSON.parse fails on the empty content, the catch block fires with an empty bookmark list, and that empty list is written back, destroying the file's contents.

Found by testing the intended workflow: create bookmarks in one browser, export to a file, open in a second browser by selecting the same file. The fix splits the action into two buttons: "New File..." continues to use `showSaveFilePicker` for creating a fresh file, while "Open Existing File..." uses `showOpenFilePicker` followed by `requestPermission({ mode: 'readwrite' })`. The open picker never truncates — it reads first, merges, then writes.

---

## Pushed back on a planned design

### JWT replaced with server-side sessions (PR #47)

JWT was the initial plan for the server authentication layer. Before implementing it, I read about the practical problems with JWT revocation — once issued, a token cannot be invalidated without additional server-side state, which undermines a key security requirement (being able to log out a device or invalidate a compromised token immediately).

This is a case where I applied judgment before a problem became apparent rather than after. The implementation was changed to opaque tokens: the server generates a random token, stores a SHA-256 hash of it, and can revoke access instantly by deleting the session row. The raw token is never persisted.
