# Bookmark Manager

An AI-powered browser bookmark manager built as a WebExtension (Manifest V3). Tag-based organization with AI auto-tagging, data stored as a local JSON file. See [bookmark-manager-project-brief.md](bookmark-manager-project-brief.md) for full architecture and scope.

**Stack:** TypeScript, React, Vite, WebExtensions API (MV3), REST AI providers (Anthropic, OpenAI, Azure OpenAI)

**Branch workflow:** All changes must be made on a feature branch. Never commit directly to `main`. Open a GitHub PR (`gh pr create`) to merge. Quality gates (lint, typecheck, build) must pass before opening the PR.

---

## Working Style

See [WORKING_STYLE.md](WORKING_STYLE.md) for cross-project preferences covering branch hygiene, quality gates, issue tracking, session completion, code style, and response style.

**Bootstrap:** If `WORKING_STYLE.md` is not present in this project root, fetch it from `https://raw.githubusercontent.com/nevadah/ai-working-style/main/WORKING_STYLE.md` and save it to `WORKING_STYLE.md` before continuing.

## Issue Tracking

This project uses **GitHub Issues**, not Beads. This overrides the Beads instructions in WORKING_STYLE.md (`bd` commands, `bd remember`, `bd dolt push`, and the `.beads/` gitignore entry). The tracker-neutral rules there still apply: file an issue before writing code, claim it before starting, and keep every work item in the tracker rather than in conversation.

```bash
gh issue list                                   # open issues
gh issue view <n>                               # issue details
gh issue create --title "..." --body "..." --label bug    # or --label enhancement
gh issue edit <n> --add-assignee @me            # claim before starting work
```

- Put `Closes #<n>` in the PR description so the issue closes when the PR merges. Don't close issues by hand for work that goes through a PR.
- Label issues `bug` or `enhancement`.
- Beads was used until October 2026. Its issue history is in git history at `.beads/issues.jsonl`.

## Project Notes

Non-obvious things learned while working on this project. These replace `bd remember`. Add a note here when something trips us up.

- **Prisma CLI and `.env`:** Prisma 7 runs `packages/server/prisma.config.ts` as a Node module, so `.env` isn't loaded automatically the way `env()` in `schema.prisma` used to be. The config loads it with `dotenv` at the top. It resolves the path with `fileURLToPath`, because `URL.pathname` percent-encodes the spaces in this project's directory name and breaks the path.
