# Data Model

## Root file structure

The entire data store is a single JSON file the user controls.

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

| Field | Type | Notes |
|---|---|---|
| `version` | string | Schema version. Checked on load to trigger migrations. Current: `"1.0"` |
| `settings` | object | User configuration. Stored in the same file for portability |
| `bookmarks` | array | Array of bookmark objects |

### Settings fields

| Field | Type | Notes |
|---|---|---|
| `aiProvider` | `"anthropic" \| "openai" \| "azure-openai" \| "openrouter"` | Selected AI provider |
| `aiApiKey` | string | User's API key for the selected provider. Stored locally only — never transmitted except to the chosen provider |
| `dataFilePath` | string | Display-only. The actual file handle is stored separately in IndexedDB. This field is for the user's reference |

## Bookmark object

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

| Field | Type | Notes |
|---|---|---|
| `id` | string | UUID v4, generated at save time |
| `url` | string | Full URL including scheme |
| `title` | string | Pre-populated from the page `<title>`; user-editable |
| `description` | string | Optional user note. Empty string when not set |
| `tags` | string[] | Applied tags, including hierarchy via `/` separator |
| `faviconUrl` | string | Stored at save time. Rendered via `chrome://favicon/` for MVP |
| `faviconCache` | null | Reserved for future base64 favicon caching. Always `null` in v1 |
| `createdAt` | string | ISO 8601 UTC timestamp |
| `aiSuggestedTags` | string[] | The raw tags the AI returned, preserved for analysis |
| `userModifiedTags` | boolean | `true` if the user changed the AI suggestions before saving |

## Tag model

Tags are plain strings stored on each bookmark. The `/` character is reserved as a hierarchy separator and is not valid within a tag segment.

```
programming           ← top-level tag
programming/rust      ← child of "programming"
programming/rust/async ← grandchild
```

The tag tree is **derived at runtime** by scanning all bookmarks — there is no separate tag registry. This keeps mutations simple: adding or removing a tag is a single bookmark update.

The one operation that requires a full sweep is **tag rename**, which is handled by a dedicated `renameTag(oldName, newName)` function that iterates all bookmarks and rewrites matching tag strings (including prefix matches for child tags).

### Tag validity rules

- Cannot be empty
- Cannot contain `/` as anything other than a hierarchy separator (i.e., cannot start or end with `/`, cannot contain `//`)
- Segments are case-sensitive (`Rust` and `rust` are different tags)

## Versioning and migration

The `version` field enables forward-compatible schema changes. On load:

1. Read the file and parse JSON.
2. Check `data.version`.
3. If the version is unknown or ahead of the current schema version, surface an error — do not silently overwrite data from a newer version of the extension.
4. If the version is behind the current schema, run the appropriate migration function and write the result back to the file before continuing.

Migration functions live in `src/shared/storage/migrations.ts` and are indexed by the version string they upgrade from. Each migration is a pure function `(data: unknown) => RootData`.

### Version history

| Version | Changes |
|---|---|
| `1.0` | Initial schema |
