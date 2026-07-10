# Meta-Issue: `~/.claude/kg-config.json` Silently Overwritten With a Test Fixture

**Domain:** data-loss / tooling / mcp-server
**Severity:** High — silent, undetected data loss in a file the whole plugin depends on for KG routing; unknown root cause; unknown blast radius (could affect any user/machine running this plugin, not just this one)
**Created:** 2026-07-10
**Status:** Investigating

---

## Navigation

- [Problem Description](description.md) — Living document (updated as understanding evolves)
- [Implementation Log](implementation-log.md) — All investigative attempts chronologically
- [Attempts](attempts/) — Numbered folders with detailed results
- [Analysis](analysis/) — Root cause evolution, timeline, lessons
- [Related Issues](related-issues/github-links.md) — ENH / PR / GitHub references

---

## Quick Summary

**Problem:**
Discovered 2026-07-10 while investigating why `kg_search`/`kg_recall` weren't finding content in this project: `~/.claude/kg-config.json` — the global config every kmgraph MCP tool call reads to resolve the "active" knowledge graph — contains only one registered graph, `test-kg`, pointing at a temp scratch path (`/var/folders/.../tmp.aNi6rlXFnx/test-kg`). The user confirms other KGs were previously registered (this project among them) and that recall had been working before. The real registrations are gone, replaced by what looks like a test fixture: `test-kg`'s `createdAt`/`lastUsed` fields are both the literal placeholder `2026-01-01T00:00:00.000Z`, not real activity timestamps.

**Why this matters beyond one user's inconvenience:**
- The overwrite was **silent** — no error, no warning, nothing surfaced to the user before this session's manual investigation caught it via `kg_fts5_status` returning an unexpected `test-kg` path.
- The file's **mtime is recent** (2026-07-10, same day as discovery) — this is not old, long-standing drift; something wrote to this file recently.
- If the root cause is in the kmgraph plugin or its MCP server (not something local/one-off to this machine), **any user who has this plugin installed could have their real KG registrations silently clobbered** the same way, with no indication anything went wrong until they notice search/recall isn't finding content.

**Current Status:**
- Root cause: **unknown**. Not yet established whether this is a kmgraph MCP server bug (e.g., a test harness writing to the real config path instead of a sandboxed one), a Claude Code session side-effect, or something else on this machine.
- User's own registrations are not a priority to recover (locally recreatable) — the priority is finding and closing the root cause before it silently repeats, here or for other users.

---

## Initial Hypothesis

Some MCP kmgraph tool call made during this session (`kg_fts5_status`, `kg_fts5_rebuild`) may have triggered a write to `~/.claude/kg-config.json`, possibly via a test/fixture code path that doesn't correctly sandbox its target path.

**Confidence:** Low — `kg_fts5_status` is documented as read-only, and `kg_fts5_rebuild`'s documented behavior is to rebuild the FTS5 index db, not rewrite `kg-config.json`. This hypothesis is unconfirmed and needs verification against the actual MCP server source, not assumed from tool descriptions alone.

**Alternative hypotheses not yet ruled out:**
- A test suite (in this repo, the kmgraph plugin repo, or the MCP server repo) writes a `test-kg` fixture to the real `~/.claude/kg-config.json` path instead of a temp/mocked config path — a real bug in that test harness's isolation, not in normal runtime tool use.
- A plugin auto-update or reinstall reset the config as part of some migration/repair logic.
- Something entirely unrelated to kmgraph — another tool or process on this machine touched the file.

---

## Evidence Gathered So Far (2026-07-10)

- `~/.claude/kg-config.json` current contents: single entry `test-kg`, path `/var/folders/6j/q97zrwg916ddkqn23_jyy76c0000gp/T/tmp.aNi6rlXFnx/test-kg`, `createdAt`/`lastUsed` both `2026-01-01T00:00:00.000Z` (placeholder-looking, not real activity).
- File mtime: `2026-07-10 13:14:45` — same day as discovery, not stale.
- No git history available for `~/.claude/kg-config.json` (`~/.claude` is not a git repo).
- No usable Time Machine snapshot (only one found, dated 2025-12-15 — too old to help, and not attempted for recovery given the user's low priority on recovering the data itself).
- No shell-history hits for `kg-config` around the relevant time window.
- This session's actual MCP kmgraph tool calls, in order: `kg_fts5_status` (returned `exists: false`, `db_path` pointing at the `test-kg` path — first sign something was wrong), then `kg_fts5_rebuild` called with an explicit `kgPath` override (to work around the bad active pointer) — this succeeded and correctly rebuilt this project's real index at `~/.kmgraph/index/projects/knowledge.db`, unaffected by `kg-config.json`'s bad state.
- `/kmgraph:kmg-switch knowledge-graph` failed because no KG named `knowledge-graph` was registered — this is what surfaced the missing-registrations problem to the user.
- `/kmgraph:kmg-init` was invoked to re-register this project, but the user interrupted before any write happened (correctly — recovery/re-registration should wait until the root cause is understood, not proceed and potentially compound the problem or destroy evidence).

---

## Scope

**Included:**
- Root-causing why/when/how `~/.claude/kg-config.json` lost its real registrations and gained a lone `test-kg` fixture entry.
- Assessing whether this is a bug in the kmgraph plugin/MCP server that could affect other installations.
- Any fix needed in the plugin/MCP server to prevent recurrence (e.g., proper test-path sandboxing, write-guards, backup-before-write).

**Explicitly out of scope (for now, per user instruction):**
- Recovering this specific user's lost KG registrations — locally recreatable, not a priority.
- This is unrelated to the chat-extraction-reliability-saga issue (different subsystem: kmgraph's own config/MCP server, not the chat-history extractors) — do not conflate the two.

---

## Next Steps

1. Locate the kmgraph MCP server's source (not just the cached plugin commands) and audit every code path that writes to `kg-config.json`, specifically test/fixture setup and teardown code, for any that could target the real user config path instead of an isolated one.
2. Check whether `kg_fts5_status`/`kg_fts5_rebuild`'s actual implementation (not just their tool descriptions) touch `kg-config.json` under any condition.
3. Determine exact time window: is there any log (MCP server logs, plugin logs) narrowing down when the overwrite happened today, versus just "sometime before 13:14:45"?
4. If the root cause is confirmed to be in shipped plugin/MCP-server code (not a one-off local fluke), treat as a release-blocking bug — assess how many installed users could be silently affected and what remediation (patch + user-facing advisory) is needed.
5. Once root cause is understood and fixed (or confirmed to be a local one-off), re-register this project's KG via `/kmgraph:kmg-init`.

---

## How to Use This Meta-Issue

1. **Add attempt:** Create new `attempts/NNN-name/` folder as investigation proceeds.
2. **Update understanding:** Edit `analysis/root-cause-evolution.md` when beliefs shift.
3. **Log progress:** Update `implementation-log.md` with each attempt.
4. **Extract lessons:** Record reusable insights in `analysis/lessons-learned.md` once resolved.
