# Implementation Log

Chronological record of all investigative attempts.

**Total Attempts:** 0 (discovery only so far)
**Last Updated:** 2026-07-10

---

## Attempt 000: Discovery (2026-07-10)

**Status:** Not an investigative attempt — initial discovery during unrelated work.

**Context:**
While wrapping up a chat-extraction-reliability session, ran `/kmgraph:kmg-switch knowledge-graph` to fix what was assumed to be a stale `active` pointer (flagged earlier in that session's own saga notes). The switch failed: no KG named `knowledge-graph` was registered at all. Inspecting `~/.claude/kg-config.json` directly found only one entry, `test-kg`, pointing at a temp scratch directory with placeholder timestamps.

**What was checked:**
- `~/.claude/kg-config.json` contents and mtime
- Git history for `~/.claude` (none — not a repo)
- Time Machine snapshots (only one, too old to help)
- Shell history for `kg-config` references (none found)

**What was NOT done:**
- No attempt made yet to locate/audit the kmgraph MCP server's actual source for `kg-config.json` write paths.
- No re-registration of this project's KG (`/kmgraph:kmg-init` was started but stopped before any write, correctly, pending root-cause understanding).

**Key Learning (so far):**
A tool description claiming "read-only" behavior (`kg_fts5_status`) is not itself proof of actual behavior — this issue exists precisely because something wrote to a config file with no user-visible signal, so descriptions should be verified against source before being trusted as a safety guarantee.

**Next Steps:**
Locate the actual kmgraph MCP server source and audit its `kg-config.json` write paths, starting with anything that references `test-kg` as a fixture name.

---

## Statistics

**By Outcome:**
- Discovery: 1
- Root-caused: 0
- Fixed: 0

---

## Pattern Analysis

**What's been tried:**
- Direct inspection of the config file and machine-level recovery sources (git, Time Machine, shell history) — all came up empty or unhelpful.

**What hasn't been tried:**
- Reading the actual MCP server source code for kg-config.json write paths.
- Checking whether "test-kg" is a name used in that server's own test suite.
