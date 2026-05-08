# Data Model

This document covers both the local data model (used by the extension with file or browser storage) and the server-side database schema.

---

## Local data model (extension)

### Root file structure

The entire data store is a single JSON file the user controls.

```json
{
  "version": "1.0",
  "settings": {
    "aiProvider": "anthropic",
    "aiApiKey": "sk-ant-...",
    "storageBackend": "file"
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
| `storageBackend` | `"file" \| "browser"` | Which storage backend to use |
| `openInNewTab` | boolean | Whether clicking a bookmark opens it in a new tab (default: `true`) |

The AI API key is stored separately in `chrome.storage.local` (never in the bookmarks file) to avoid exposing credentials in plain text when file storage is used. Azure OpenAI additionally requires `azureEndpoint` and `azureDeployment`. OpenRouter additionally requires `openRouterModel`.

### Bookmark object

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

### Tag model

Tags are plain strings stored on each bookmark. The `/` character is reserved as a hierarchy separator and is not valid within a tag segment.

```
programming           ← top-level tag
programming/rust      ← child of "programming"
programming/rust/async ← grandchild
```

The tag tree is **derived at runtime** by scanning all bookmarks — there is no separate tag registry. This keeps mutations simple: adding or removing a tag is a single bookmark update.

The one operation that requires a full sweep is **tag rename**, which is handled by a dedicated `renameTag(oldName, newName)` function that iterates all bookmarks and rewrites matching tag strings (including prefix matches for child tags).

#### Tag validity rules

- Cannot be empty
- Cannot contain `/` as anything other than a hierarchy separator (i.e., cannot start or end with `/`, cannot contain `//`)
- Segments are case-sensitive (`Rust` and `rust` are different tags)

### Versioning and migration

The `version` field enables forward-compatible schema changes. On load:

1. Read the file and parse JSON.
2. Check `data.version`.
3. If the version is unknown or ahead of the current schema version, surface an error — do not silently overwrite data from a newer version of the extension.
4. If the version is behind the current schema, run the appropriate migration function and write the result back to the file before continuing.

Migration functions live in `packages/extension/src/storage/migrations.ts` and are indexed by the version string they upgrade from. Each migration is a pure function `(data: unknown) => RootData`.

#### Version history

| Version | Changes |
|---|---|
| `1.0` | Initial schema |

---

## Server-side data model (PostgreSQL)

The backend service uses PostgreSQL with Prisma. The schema is defined in `packages/server/prisma/schema.prisma`.

### Tables

#### `User`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | string | Unique |
| `passwordHash` | string | Argon2 hash |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | Auto-updated |

#### `Session`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `tokenHash` | string | SHA-256 hash of the opaque session token; unique |
| `userId` | UUID | Foreign key → `User` |
| `expiresAt` | timestamp | 30 days from creation |
| `createdAt` | timestamp | |

#### `Organization`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | string | |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | Auto-updated |

#### `OrgMembership`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key → `User` |
| `orgId` | UUID | Foreign key → `Organization` |
| `role` | enum | `MEMBER`, `EDITOR`, or `ADMIN` |

Unique constraint on `(userId, orgId)` — a user can only have one role per org.

#### `Bookmark`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `url` | string | |
| `title` | string | |
| `description` | string | Default empty string |
| `tags` | string[] | PostgreSQL array with GIN index |
| `faviconUrl` | string? | Nullable |
| `userId` | UUID? | Nullable foreign key → `User` |
| `orgId` | UUID? | Nullable foreign key → `Organization` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | Auto-updated |

A CHECK constraint enforces that exactly one of `userId` or `orgId` is non-null — every bookmark belongs to either a user or an organization, never both and never neither.
