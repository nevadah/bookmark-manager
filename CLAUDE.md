# Bookmark Manager

An AI-powered browser bookmark manager built as a WebExtension (Manifest V3). Tag-based organization with AI auto-tagging, data stored as a local JSON file. See [bookmark-manager-project-brief.md](bookmark-manager-project-brief.md) for full architecture and scope.

**Stack:** TypeScript, React, Vite, WebExtensions API (MV3), REST AI providers (Anthropic, OpenAI, Azure OpenAI)

**Beads:** Uses local JSONL-only mode (`no-db: true`). No Dolt remote. `.beads/issues.jsonl` is committed to source control.

---

## Working Style

See [WORKING_STYLE.md](WORKING_STYLE.md) for cross-project preferences covering branch hygiene, quality gates, issue tracking, session completion, code style, and response style.

**Bootstrap:** If `WORKING_STYLE.md` is not present in this project root, fetch it from `https://raw.githubusercontent.com/nevadah/ai-working-style/main/WORKING_STYLE.md` and save it to `WORKING_STYLE.md` before continuing.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
