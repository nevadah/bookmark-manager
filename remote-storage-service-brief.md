# Remote Storage Service — Feature Brief

This document captures the planned feature set for the backend service that will serve as an optional storage backend for the bookmark manager extension. It supplements the top-level [project brief](bookmark-manager-project-brief.md).

---

## Purpose

The remote storage service removes the limitations of local-only storage:
- Multi-device sync without relying on cloud folder placement
- Organizational/team bookmark sharing
- AI API proxying (users don't need their own API keys when using a hosted service)

It will be implemented as a `RemoteStorageProvider` behind the existing `StorageProvider` abstraction, so the extension's application code does not change when the backend is in use.

---

## Core Data

- **Bookmarks** — full bookmark objects (title, URL, description, tags, favicon, etc.)
- **Tags** — derived from bookmark data server-side, consistent with the existing tag model

---

## Authentication

### Account Management
- Account creation (sign up)
- Email/username + password login
- Update account credentials (email, password)
- Account deletion

### Additional Auth Methods (planned, not MVP)
- **SSO** — Google and Microsoft as initial providers; enables organizational identity federation
- **Passkeys** — WebAuthn-based passwordless login

---

## Multi-Tenancy: Personal and Organizational Bookmarks

### The Problem
An organization wants to maintain a set of shared bookmarks — internal tools, approved resources, documentation links — that all members can access. But each member also has their own personal bookmarks. Both sets should be accessible through the same extension UI.

### Two Bookmark Sources

| Source | Writable by | Readable by |
|---|---|---|
| **Organizational store** | Users with admin/editor role | All organization members |
| **Personal store** | The individual user | Only that user |

### Roles (Organizational)
- **Member** — read-only access to the org's bookmarks; full control of their own personal bookmarks
- **Editor** (or similar) — can add, edit, and delete organizational bookmarks
- **Admin** — editor permissions plus user management (invite, remove members, assign roles)

### UI Presentation (Extension Side)

Two display modes to consider — the extension should support both, configurable by the user or org admin:

1. **Merged view** — org and personal bookmarks appear together in the tag tree as a single unified list; no visible distinction between sources
2. **Separated view** — org and personal bookmarks appear in distinct sections (e.g., "Company Bookmarks" and "My Bookmarks"); makes the source of each bookmark explicit

In both modes, the user's ability to edit a bookmark reflects its source — org bookmarks are read-only unless the user has an editor/admin role.

---

## AI Proxying

When using the remote backend, the service proxies AI tag suggestion requests on behalf of the user. Users do not need to supply their own AI API keys — the service handles it. The AI provider and configuration are managed server-side.

---

## Deployment Model

- **Self-hostable** — organizations can run their own instance
- **Managed SaaS** — a hosted option for individuals and organizations that don't want to self-host

---

## Open Questions

- **Org discovery / invitation flow** — how does a user join an org? Invite link, email domain matching, admin approval?
- **Conflict resolution** — if a user edits a personal bookmark while offline and the server has a newer version, how is the conflict resolved?
- **Bookmark visibility in merged mode** — should users be able to tell which source a bookmark came from (e.g., a small icon indicator), even in merged mode?
- **Per-org AI configuration** — can org admins choose a different AI provider or model than the service default?

---

*This document is a living spec. Add decisions to the table below as they are made.*

## Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| — | — | — |
