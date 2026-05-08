# Bookmark Manager

An AI-powered browser bookmark manager built as a WebExtension (Manifest V3). Tag-based organization with AI-assisted auto-tagging. Your data stays under your control — works entirely locally with no accounts required, with an optional backend service coming later for sync and team use.

## Purpose

The purpose and goals of this project are:
- To practice coding with TypeScript and React and, as a secondary goal, to learn browser extension development.
- To use AI differently than other projects I've done. Claude guides the process and suggests tasks, I write the code, and Claude reviews my work.
- To demonstrate iterative design in practice. Initial design decisions are made with incomplete information — you can't fully evaluate a design until you're actually using it. This project tracks those decisions and the changes that follow from real use.

This is a learning project. It is not initially intended as something that will be put into production but it's possible it will get to that point.

## Features

- **Tag-based organization** — tags are properties, not folders; a bookmark can carry multiple tags simultaneously
- **Hierarchical tags** — use `/` as a separator (`programming/rust/async`); the tree is derived at runtime
- **AI auto-tagging** — pluggable providers (Anthropic, OpenAI, Azure OpenAI, OpenRouter); you supply your own API key
- **Your data, your choice** — pick your storage backend:
  - **Local file** — a single JSON file you control; place it in Dropbox/OneDrive/iCloud for free sync across machines
  - **Browser storage** — stored in your browser profile, no file picker required
  - **Backend service** *(coming later)* — self-hostable or managed; removes the need for your own AI API key
- **Cross-browser** — standard WebExtensions API targeting Chromium (Chrome, Edge, Brave, Vivaldi, Opera)

## Tech stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| UI | React 18 |
| Extension API | WebExtensions API, Manifest V3 |
| Build | Vite 6 |
| Data | Local JSON file or browser storage (pluggable `StorageProvider`) |
| AI | REST calls to provider of choice |

## Development

### Prerequisites

- Node.js 22+
- npm

### Setup

```bash
npm install
```

### Build

```bash
npm run build        # production build → dist/
npm run dev          # watch mode
```

### Quality gates

```bash
npm run check
```

This wraps the following commands:
```bash
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run build        # Vite build
```

### Load in Chrome

1. Run `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `dist/` folder
5. Click the extension icon in the toolbar to open the sidebar

After making changes, run `npm run build` again and click the reload button on the extension card in `chrome://extensions`.

## Project structure

```
src/
  background/     service worker (MV3 background context)
  sidebar/        React app — main extension UI
  content/        content scripts (page interaction)
  shared/
    types/        shared TypeScript types and data model
    providers/    AI provider abstraction and implementations
    storage/      StorageProvider abstraction and implementations
public/
  manifest.json   MV3 extension manifest
  sidebar/        static HTML shell for the sidebar
```

## Data model

Bookmark data is stored as JSON (structure is the same regardless of storage backend):

```json
{
  "version": "1.0",
  "settings": {
    "aiProvider": "anthropic",
    "aiApiKey": "sk-ant-...",
    "storageBackend": "file"
  },
  "bookmarks": [
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
  ]
}
```

Azure OpenAI additionally requires `azureEndpoint` and `azureDeployment` in settings. OpenRouter additionally requires `openRouterModel`.

## CI

GitHub Actions runs lint → typecheck → build on every push and pull request to `main`.
