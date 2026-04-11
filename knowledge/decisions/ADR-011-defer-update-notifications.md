---
title: "ADR-011: Defer Update Notifications and Version Sync to v0.0.9"
status: Accepted
date: 2026-02-21
deciders: technomensch, Claude Opus 4.6
---

# ADR-011: Defer Update Notifications and Version Sync to v0.0.9

## Status

**Accepted** - 2026-02-21

## Context

After merging v0.0.8.4-alpha, a design session identified that Tier 2 (MCP IDEs) and Tier 3 (template-only) users have no mechanism to discover when a new plugin version is available. Additionally, the plugin's version is tracked in three separate locations that are currently out of sync:

- `mcp-server/src/index.ts`: hardcoded `"1.0.0"`
- `mcp-server/package.json`: `"1.0.0"`
- `plugin.json`: `"0.0.8.3-alpha"`

Tier 1 (Claude Code marketplace) users can run `claude plugin update` for updates. Tiers 2 and 3 have no equivalent — they only receive updates by manually re-cloning or pulling the repo, and only know to do so if they happen to check the GitHub repository.

### The Two Problems

**Problem 1: Version sync (bug, low complexity)**
Three version sources disagree. This causes confusion and makes version reporting inaccurate. Quick fix: read version from `package.json` at runtime everywhere.

**Problem 2: Update notifications (feature, medium complexity)**
No update discovery mechanism exists for MCP/template users. Requires designing a notification surface (CLI flag, MCP tool, startup message) and optionally a remote check mechanism.

### Options Considered

#### Option 1: Local-only version reporting

**Scope:**
- Single source of truth: `mcp-server/package.json` (synced to `plugin.json` on each release)
- `--version` / `-v` flag on CLI: `node dist/cli.js --version` → `knowledge-graph v0.0.9-alpha`
- `kg_version` MCP tool: returns installed version + link to GitHub releases
- No network calls

**Pros:**
- Zero latency, zero network dependency
- No rate limit risk (GitHub API: 60 req/hr unauthenticated)
- Simple, predictable, debuggable
- Users who want to check can call `kg_version` explicitly

**Cons:**
- No automatic discovery — user must actively ask
- Doesn't solve the "don't know what they don't know" problem

**Timeline:** 1-2 days

#### Option 2: Cached GitHub check

**Scope:**
- All of Option 1, plus:
- On `kg_version` call: check `~/.claude/kg-update-check.json` cache
- If cache is >24 hours old: hit GitHub releases API, update cache
- Report: `{ installed: "0.0.9-alpha", latest: "0.0.10-alpha", updateAvailable: true }`

**Pros:**
- Automatic update discovery
- Cache limits network overhead to once per day
- Users see update notice in their normal workflow

**Cons:**
- Network dependency (fails gracefully if offline, but adds surface area)
- Cache management adds complexity
- GitHub API rate limits (60/hr unauthenticated) could be a problem for automated environments

**Timeline:** 3-4 days

#### Option 3: On-demand GitHub check

**Scope:**
- All of Option 1, plus:
- Every `kg_version` call hits GitHub releases API live

**Pros:**
- Always current

**Cons:**
- Per-call latency (typically 200-500ms)
- Rate limit risk in automated/CI environments
- No benefit over Option 2 for human users

**Timeline:** 2-3 days

## Decision

**Selected: Defer to v0.0.9. When implemented, start with Option 1 (local-only), then add Option 2 (cached check) in a follow-on release.**

Two-phase approach:
- **v0.0.9-alpha:** Option 1 — version sync + `--version` flag + `kg_version` tool (no network calls)
- **v0.0.10-alpha or later:** Option 2 — add cached GitHub release check on top of Option 1

## Rationale

1. **Version sync is a bug, not a feature** — The three-source mismatch should be fixed promptly as part of the next meaningful release. It's low-complexity and high-value.

2. **Local-only is sufficient for alpha** — During alpha, users are early adopters who are engaged enough to check GitHub periodically. Automatic update discovery is more important for stable/v1.0 releases.

3. **Network calls need design** — The cache strategy, error handling, and rate limit behavior for remote checks deserve dedicated scope, not bolted onto another release's plan.

4. **Incremental approach aligns with existing pattern** — See ADR-005 (defer rules engine to v0.0.5 after gathering usage data). Same principle: ship the simple version, observe usage, then add automation.

5. **MCP tool is the right surface** — A `kg_version` MCP tool is visible to all Tier 2 users in their IDE's tool list. A CLI flag covers Tier 3. Both are better than an opaque startup log message.

## Consequences

### Positive

- ✅ Fixes the version sync bug (three sources → one)
- ✅ Gives Tier 2/3 users a version reporting tool (`kg_version`)
- ✅ Gives Tier 3 users a CLI version flag (`--version`)
- ✅ Low risk — no network calls in v0.0.9
- ✅ Sets foundation for cached check in v0.0.10

### Negative

- ❌ No automatic update discovery in v0.0.9 — users still must actively check
- ❌ "Don't know what they don't know" problem persists until v0.0.10

### Neutral

- Tier 1 (Claude Code) users unaffected — marketplace handles updates
- The `kg_version` tool doubles as a health check for MCP server connectivity

## Implementation Notes

### v0.0.9-alpha Scope

**1. Version sync:**
```typescript
// mcp-server/src/index.ts — read from package.json
import { readFileSync } from "fs";
const pkg = JSON.parse(readFileSync(path.join(__dirname, "../package.json"), "utf-8"));
const server = new McpServer({ name: "knowledge-graph", version: pkg.version });
```

**2. Release checklist addition:**
- Sync `mcp-server/package.json` version to match `plugin.json` before every push

**3. CLI `--version` flag:**
```typescript
// mcp-server/src/cli.ts
case "--version":
case "-v":
  console.log(`knowledge-graph v${pkg.version}`);
  process.exit(0);
```

**4. `kg_version` MCP tool:**
- New tool in `mcp-server/src/tools/config.ts` (or new file)
- Returns: installed version, repo URL, GitHub releases link
- No network calls in v0.0.9

### v0.0.10-alpha Scope (Deferred)

**Cached GitHub release check:**
- Cache file: `~/.claude/kg-update-check.json`
- TTL: 24 hours
- Endpoint: `GET https://api.github.com/repos/technomensch/knowledge-graph/releases/latest`
- Failure mode: return `{ latest: "unknown" }` if offline or rate-limited

## References

- [ROADMAP.md](../../ROADMAP.md) — v0.0.9 planning
- [Lessons Learned: Update Notifications for Non-Plugin Users](../lessons-learned/architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users.md)
- [Lessons Learned: Plugin Example File Management](../lessons-learned/architecture/Lessons_Learned_Plugin_Example_File_Management.md)
- ADR-001 — Pattern: defer automation until simple version ships and gathers feedback

## Review History

- **2026-02-21**: Initial decision (technomensch + Claude Opus 4.6)
- **Status**: Accepted
- **Next Review**: When v0.0.9 planning begins
