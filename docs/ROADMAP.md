# Knowledge Graph Plugin — Roadmap

This document tracks planned features, deferred decisions, and future release scope. Items move from here into plan files when a release begins.

---

## Current Release

**v0.0.8.4-alpha** — merged 2026-02-21

- `extract-chat`: date range filtering (`--after`, `--before`), project scoping (`--project`)
- Namespace refactor: `/knowledge:` → `/kg-sis:` across all commands
- `update-doc --user-facing`: wizard for maintaining plugin documentation

---

## Upcoming Releases

### v0.0.9-alpha — Version Sync and Update Notifications (Tier 2/3)

**Context:** ADR-002 (2026-02-21)

**Scope:**

- **Version sync** — establish `mcp-server/package.json` as single source of truth; read at runtime in `mcp-server/src/index.ts` instead of hardcoding `"1.0.0"`
- **Release checklist** — add version sync step to every plan file going forward
- **`--version` / `-v` CLI flag** — `node dist/cli.js --version` returns installed version
- **`kg_version` MCP tool** — new tool returning installed version + GitHub releases link; no network calls in this release
- **Release checklist** — sync `mcp-server/package.json` version to `plugin.json` as a release gate

**Out of scope (v0.0.9):**
- Remote update check (see v0.0.10 below)
- Example file management changes (see Deferred section)

---

### v0.0.10-alpha — Cached Update Check (Tier 2/3)

**Prerequisite:** v0.0.9 (version sync + `kg_version` tool must exist)

**Scope:**

- **Cached GitHub release check** — when `kg_version` is called, check `~/.claude/kg-update-check.json`; if cache is >24 hours old, hit GitHub releases API and update cache
- **Failure modes** — graceful degradation: if offline or rate-limited, return `{ latest: "unknown" }` without error
- **Output** — `{ installed: "0.0.10-alpha", latest: "0.0.10-alpha", updateAvailable: false, checkedAt: "..." }`

---

## Deferred / Under Discussion

### Plugin Example File Management

**Context:** Design session 2026-02-21. Lesson: [Lessons_Learned_Plugin_Example_File_Management.md](lessons-learned/architecture/Lessons_Learned_Plugin_Example_File_Management.md)

**Problem:** `core/examples/` ships in the repo and is downloaded by all installation tiers, even users who don't want example content. Deleting locally is possible but `git pull` restores examples from upstream.

**Options on the table:**
1. Move examples out of the tracked repo entirely (GitHub wiki / release artifact / docs site)
2. Post-clone cleanup step in `INSTALL.md` with `.git/info/exclude` (doesn't survive `git pull`)
3. Git submodule (clean separation, higher maintenance overhead)

**Status:** Postponed. No blocking issue — examples are small, harmless markdown files. Revisit when installation UX becomes a higher priority.

---

### MEMORY.md Rules Engine (v0.0.5)

**Context:** ADR-001 (2026-02-16)

Deferred YAML-based pattern matching to automate what gets synced to MEMORY.md. Needs real-world usage data from v0.0.3/v0.0.4 archive/restore workflows before implementation.

---

### Smart Summarization (v0.0.6+)

**Context:** ADR-001 (2026-02-16)

LLM-powered consolidation of similar MEMORY.md entries. Deferred until usage patterns from rules engine are observed.

---

## Completed Releases

| Version | Key Feature | Date |
|---------|-------------|------|
| v0.0.8.4-alpha | extract-chat date/project filtering | 2026-02-21 |
| v0.0.8.3-alpha | Namespace refactor (knowledge → kg-sis) | 2026-02-21 |
| v0.0.8.2-alpha | update-doc --user-facing command | 2026-02-21 |
| v0.0.8-alpha | Universal installer (INSTALL.md, 3-tier) | 2026-02-21 |
| v0.0.4-alpha | restore-memory command | 2026-02-16 |
| v0.0.3-alpha | MEMORY.md token limits, archive-memory | 2026-02-16 |

---

*Last updated: 2026-02-21*
