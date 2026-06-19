# Iterative Design

This document records design decisions that changed as a direct result of using the extension — cases where the original design looked reasonable on paper but turned out to be wrong in practice. It also includes a few cases where I applied independent judgment to push back on or extend a design before a problem became apparent.

Bugs discovered through use are tracked separately in [bugs-found-in-testing.md](bugs-found-in-testing.md).

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

### Existing tag suggestions added to edit panel (PR #70)

The original tag input required typing a tag name exactly to reuse an existing tag. In practice this created friction: with a growing tag set, it was easy to mis-spell a tag or use a slight variation, gradually fragmenting the taxonomy.

After using the extension with a reasonable number of bookmarks, it became clear that discoverability of existing tags was the missing piece. The fix adds a scrollable row of outlined chips below the tag input showing all tags already in use that aren't yet applied to the bookmark being edited. The chips filter as you type, so the input doubles as a search filter on existing tags. Clicking a chip adds the tag immediately.

The chip area has a fixed height with scroll so a large tag set doesn't push the edit panel header off screen.

---

### Bookmark and tag hover behavior changed to full-row highlight (PR #68)

The original hover behavior on bookmark links was a text underline — the standard browser convention for inline body text links. Tag tree labels highlighted by changing the text color to the accent color.

Both of these are text-only signals. After using the extension, it became clear that the interaction model is closer to a file explorer or sidebar nav than to body text — the whole row is the target, not just the text. Modern sidebar UIs (VS Code, Arc, Chrome's own bookmark manager) use full-row background highlights instead of text decoration.

The fix removes the underline on bookmark hover and adds a full-width background tint (`--btn-hover`) to the entire `.bookmark-leaf` row using a negative margin / matching padding technique so the highlight extends edge-to-edge. A 0.1s ease transition removes the snap. Tag tree labels get the same row highlight while keeping the accent color change on the text, which visually distinguishes "expands a group" from "opens a URL."

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

### Save Settings button removed in favor of auto-save (PR #58)

The Settings form had an explicit Save Settings button. In practice this caused a recurring "forgot to save" problem — settings would be changed but not take effect until the button was clicked.

Selects now save on change, text inputs save on blur, and the file picker saves immediately after a file is selected. The Save Settings button was removed entirely.

---

---

## Pushed back on a planned design

### JWT replaced with server-side sessions (PR #47)

JWT was the initial plan for the server authentication layer. Before implementing it, I read about the practical problems with JWT revocation — once issued, a token cannot be invalidated without additional server-side state, which undermines a key security requirement (being able to log out a device or invalidate a compromised token immediately).

This is a case where I applied judgment before a problem became apparent rather than after. The implementation was changed to opaque tokens: the server generates a random token, stores a SHA-256 hash of it, and can revoke access instantly by deleting the session row. The raw token is never persisted.
