---
title: >-
  v0.2.1 Backlog — kg_capture MCP Tool, sync-all/update-graph Refactor, Skill
  Modernization, MCP Auto-Registration
type: meta-issue
parent: v0.2.0-beta-layered-architecture
---

# Meta-Issue: v0.2.1 Backlog

**Local ID:** issue-1
**GitHub ID:** [#39](https://github.com/technomensch/knowledge-graph/issues/39) ✅ confirmed
**Status:** 🟡 OPEN — work items deferred from v0.2.0-beta
**Target version:** 0.2.1-beta

---

## Background

During v0.2.0-beta design, three items were explicitly deferred to v0.2.1:

- **Decision 1C** (`sync-all`/`update-graph` compatibility): Keep existing commands compatible via output contract; refactor into layered pattern in v0.2.1.
- **Decision 2C** (file system writes in agents): Agents use file system writes for v0.2.0-beta; add `kg_capture` MCP write tool in v0.2.1 for true platform portability and data-layer write guard enforcement.
- **Skill modernization**: `adr-guide` and `gov-execute-plan` skills evaluated but deferred.

One item discovered during v0.2.0-beta Phase 7b validation (Gemini platform portability test):

- **MCP auto-registration**: When an agent tries to use a `kg_*` MCP tool and the server is not registered in the current IDE, the system should detect this, offer to register it, test the connection, and retry — rather than silently falling back to file-system tools.

These decisions are recorded in `~/.claude/plans/peppy-napping-wind.md` (parent plan).

---

## Tracked Work Items

### Item A: `kg_capture` MCP Write Tool

**Why deferred:** Agents currently write lessons and session summaries via file system tools (Read/Write/Edit). This works for Claude Code but limits portability — platforms without file system MCP tools (e.g., web-only Gemini) cannot capture lessons.

**What v0.2.1 adds:**
- New `kg_capture` MCP tool in `mcp-server/src/index.ts`
- Accepts: content, type (lesson/session/adr), metadata
- Handles: file naming, frontmatter, index update, FTS5 rebuild
- Moves write guard (active KG ↔ CWD check) from agent instructions to data layer — model-independent enforcement
- `lesson-capture-agent` and `session-summary-agent` updated to use `kg_capture` instead of Write tool

**Acceptance criteria:**
- [ ] `kg_capture(content, type, metadata)` tool registered in MCP server
- [ ] Tool enforces active-KG/CWD alignment at data layer; returns structured error if mismatch
- [ ] `lesson-capture-agent` and `session-summary-agent` use `kg_capture` instead of Write/Edit
- [ ] `core/templates/AGENTS-template.md` references `kg_capture` for non-Claude-Code platforms
- [ ] Platform portability: a platform with only MCP access (no file system tools) can capture a lesson

---

### Item B: `sync-all` and `update-graph` Layered-Pattern Adoption

**Why deferred:** `sync-all` and `update-graph` call `/kmgraph:capture-lesson` by name. The refactored `capture-lesson` command now dispatches to `lesson-capture-agent`, preserving the output contract — so both commands continue working unchanged. Full adoption of the layered pattern (thin command + agent dispatch) is deferred.

**What v0.2.1 adds:**
- Refactor `commands/sync-all.md` to thin dispatcher → `sync-all-agent` (or extend `knowledge-extractor`)
- Refactor `commands/update-graph.md` to thin dispatcher → existing `knowledge-extractor` agent
- Verify output contracts are preserved end-to-end

**Acceptance criteria:**
- [ ] `sync-all.md` ≤ 150 lines, dispatches to an agent
- [ ] `update-graph.md` ≤ 150 lines, dispatches to an agent
- [ ] All callers of these commands still work unchanged
- [ ] No regression in `--auto` flag behavior

---

### Item D: MCP Auto-Registration on First Use

**Why added:** v0.2.0-beta Phase 7b validation (Gemini Flash in Antigravity) confirmed that `AGENTS-template.md` enables the full KMGraph workflow without MCP — but recall fell back to file-reading instead of `kg_search`, and `kg_fts5_rebuild` was skipped. The failure was silent. The MCP server binary exists (`mcp-server/dist/index.js`) but was never registered in `~/.gemini/settings.json`. Each IDE needs the server registered independently; none currently auto-detect it.

**What v0.2.1 adds:**
- When any `kg_*` MCP tool call fails because the server is not registered, agent detects this and offers: "The search index isn't connected — want me to set it up? Takes about 10 seconds."
- If yes: detects current IDE/platform → writes appropriate `mcpServers` config entry → tests connection → retries original operation
- If no: proceeds with file-system fallback, notes search won't be ranked
- Supported registration targets: Gemini CLI / Antigravity (`~/.gemini/settings.json`), Cursor (`.cursor/mcp.json`), Windsurf (`.windsurf/mcp.json`), Continue.dev (`.continue/config.json`), VS Code (`settings.json`)
- Depends on Item A: `kg_capture` returning a structured "server not registered" error makes detection reliable

**Acceptance criteria:**
- [ ] Failed `kg_*` MCP call triggers auto-registration offer (not silent fallback)
- [ ] Agent correctly detects current IDE and writes appropriate config format
- [ ] Connection test runs before retrying; surfaces clear error if registration fails
- [ ] Works for Gemini CLI / Antigravity, Cursor, Windsurf, Continue.dev, VS Code
- [ ] If user declines, file-system fallback is used with an explicit note

---

### Item C: `adr-guide` and `gov-execute-plan` Skill Modernization

**Why deferred:** Both skills are compatible as-is with the v0.2.0-beta architecture. Modernization (direct agent dispatch instead of suggesting commands) is a nice-to-have, not blocking.

**What v0.2.1 adds:**
- `skills/adr-guide/SKILL.md`: dispatch directly to `create-adr` agent (new) or existing flow
- `skills/gov-execute-plan/SKILL.md`: evaluate whether agent dispatch improves the execution protocol
- Possibly a new `plan-execution-agent` for the zero-deviation execution workflow

**Acceptance criteria:**
- [ ] `adr-guide` skill dispatches directly to agent (no command suggestion)
- [ ] `gov-execute-plan` skill evaluated; updated if dispatch pattern improves UX
- [ ] All UX language constraints respected (no internal mechanics exposed)

---

## ID Mapping Note

GitHub issue numbers and local issue numbers are intentionally decoupled. GitHub's issue and PR counters share the same sequence — this project's PRs reach #38, so the first GitHub issue is #39. Local IDs start at `issue-1` for clean file system and branch naming. The mapping is recorded here:

| Local ID | GitHub ID | Title |
|---|---|---|
| issue-1 | #39 | v0.2.1 Backlog meta-issue |

---

## Implementation Sequence (v0.2.1)

Suggested order:
1. **Item A** (`kg_capture`) first — foundational; enables data-layer write guard and structured errors for Item D
2. **Item D** (MCP auto-registration) — depends on Item A's structured errors for reliable detection
3. **Item B** (`sync-all`/`update-graph`) — straightforward refactors once Item A ships
4. **Item C** (skill modernization) — lowest urgency; evaluate after A, B, and D

Each item gets its own branch: `v0.2.1-kg-capture`, `v0.2.1-mcp-auto-register`, `v0.2.1-sync-all-refactor`, `v0.2.1-skill-modernization`.
