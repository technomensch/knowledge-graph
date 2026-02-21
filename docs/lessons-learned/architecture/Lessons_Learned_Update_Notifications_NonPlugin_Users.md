---
title: "Lesson: Update Notifications for Non-Plugin Users — Version Sync and MCP Discovery Gap"
created: 2026-02-21T00:00:00Z
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: main
  commit: 9c9d7dc78eb551f98e542c4244390bdf0918812e
  pr: null
  issue: null
sources: []
tags: [architecture, versioning, mcp, update-notifications, plugin-distribution, tier2, tier3]
category: architecture
---

# Lesson Learned: Update Notifications for Non-Plugin Users — Version Sync and MCP Discovery Gap

**Date:** 2026-02-21
**Category:** architecture
**Version:** 1.0

---

## Problem

Tier 2 (MCP IDEs: Cursor, Windsurf, Continue.dev, JetBrains, VS Code) and Tier 3 (template-only) users have no mechanism to discover that a new version of the plugin is available. When the plugin is updated, these users remain on old versions indefinitely — they only find out if they happen to re-read `INSTALL.md` or check the GitHub repo.

**Context:**
- Plugin supports three installation tiers with different update paths
- Tier 1 (Claude Code marketplace): `claude plugin update` handles updates automatically
- Tier 2/3: Users manually clone the repo and manually rebuild — there is no push notification path
- The MCP server (`mcp-server/src/index.ts`) hardcodes `version: "1.0.0"` — disconnected from the real plugin version in `plugin.json` (`0.0.8.3-alpha`)

**Impact:**
- Tier 2/3 users accumulate version drift without knowing
- Bug fixes, new MCP tools, and schema changes go unnoticed
- No single source of truth for the plugin's version across the codebase

---

## Root Cause

**Analysis:**
1. **No version strategy at plugin inception** — When the MCP server was scaffolded, `version: "1.0.0"` was hardcoded as a placeholder and never connected to the plugin's actual version lifecycle
2. **Three version sources, none authoritative** — `mcp-server/package.json` (`1.0.0`), `plugin.json` (`0.0.8.3-alpha`), and `mcp-server/src/index.ts` (`1.0.0` hardcoded) each track version independently
3. **No notification surface for MCP users** — MCP tools have no convention for surfacing version metadata; the protocol doesn't include a built-in "server version" discovery mechanism beyond the MCP server constructor's `version` field (which is rarely displayed to users)
4. **No update hook for Tier 2/3** — Unlike Claude Code plugins (which have a registry), MCP installations are static git clones with no update subscription mechanism

**Evidence:**
- `mcp-server/src/index.ts` line 10: `version: "1.0.0"` — hardcoded, not read from package.json
- `mcp-server/package.json` version: `"1.0.0"` — out of sync with `plugin.json` `"0.0.8.3-alpha"`
- No `--version` flag on the CLI (`mcp-server/src/cli.ts`)
- No `kg_version` or equivalent MCP tool in the registered tools list

---

## Solution Designed (Deferred)

A four-part solution was designed but deferred to a future release. All four parts are independent and can be shipped incrementally.

### Part 1: Centralize version — single source of truth

Read version from `mcp-server/package.json` at runtime everywhere it's needed:

```typescript
// mcp-server/src/index.ts
import { readFileSync } from "fs";
import * as path from "path";

const pkg = JSON.parse(
  readFileSync(path.join(__dirname, "../package.json"), "utf-8")
);

const server = new McpServer({
  name: "knowledge-graph",
  version: pkg.version,   // was: "1.0.0"
});
```

**Also update:** `mcp-server/package.json` to match `plugin.json` version on every release.

### Part 2: Add `--version` flag to CLI

```typescript
// mcp-server/src/cli.ts
case "--version":
case "-v":
case "version":
  console.log(`knowledge-graph v${pkg.version}`);
  process.exit(0);
```

### Part 3: Add `kg_version` MCP tool

New tool returning version info to MCP IDE users:

```typescript
server.tool("kg_version", "Returns installed plugin version and checks for updates", {}, async () => {
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        installed: pkg.version,
        note: "Check https://github.com/technomensch/knowledge-graph/releases for updates"
      }, null, 2)
    }]
  };
});
```

### Part 4: Update check strategy (decision deferred)

Three options evaluated for checking whether a newer version exists:

| Option | Mechanism | Pros | Cons |
|--------|-----------|------|------|
| **Local-only** | Return installed version only | No network, no latency, no rate limits | User must manually check GitHub |
| **Cached GitHub check** | Check GitHub API once/day, cache in `~/.claude/kg-update-check.json` | Automatic discovery | Network dependency, complexity |
| **On-demand GitHub check** | Check GitHub API on every `kg_version` call | Always current | Latency per call, rate limits |

**Recommendation:** Start with local-only. Add cached GitHub check in a follow-on release once the version infrastructure is stable.

---

## Prevention System

**Immediate (quick win, can be done independently of the full solution):**
- Sync `mcp-server/package.json` version with `plugin.json` as part of every release checklist
- Add version bump as a step in every plan file (this was added to v0.0.8.1 and v0.0.8.2 plans)

**Systematic (for when this is implemented):**
- Single `VERSION` file or `package.json` as the canonical version source — all other references read from it
- Release checklist step: verify all three sources agree before pushing

---

## Replication Pattern

### For Other Projects

**When to Apply:**

Any plugin or tool that supports multiple installation tiers with different update mechanisms.

**Universal Pattern:**

1. **Establish a single version source at project inception** — Don't let version drift happen across multiple files; pick one file as authoritative and read from it everywhere else
2. **Design for the least-capable tier** — If your lowest-tier users have no update mechanism, plan a notification surface (CLI flag, API tool, startup message) before v1.0
3. **Separate version reporting from update checking** — `--version` (always works, no network) is a prerequisite to any update checking; implement it first
4. **Deferred network checks need a cache** — Any mechanism that makes network calls to check for updates should cache results to avoid per-call latency and rate limit exhaustion

**Customization Points:**
- The update check mechanism depends on where your release artifacts live (GitHub, npm, plugin registry, etc.)
- Cache TTL should balance freshness vs. network overhead (24 hours is a reasonable default)

---

## Lessons & Takeaways

**Key Insights:**
1. Version drift across multiple config files is a quiet maintenance burden — it accumulates imperceptibly until something breaks or a user reports a confusing version mismatch
2. MCP protocol doesn't have a built-in update notification surface; any update discovery for MCP users requires adding a dedicated tool
3. The version reporting problem (what version am I running?) and the update check problem (is there a newer version?) are independent and should be solved independently

**What Didn't Work:**
- Hardcoding version strings at scaffold time and hoping they stay in sync manually

**If We Had to Do It Again:**
- Set up the single-source version pattern before writing any version strings anywhere
- Add `--version` to the CLI immediately, not as an afterthought

---

## Related Documentation

**Architecture Decisions:**
- [ADR-002: Defer Update Notifications and Version Sync to v0.0.9](../../decisions/ADR-002-defer-update-notifications.md) — Formal decision record for this deferral

**Other Lessons:**
- [Plugin Example File Management](./Lessons_Learned_Plugin_Example_File_Management.md) — Companion lesson from the same design session

---

**Version:** 1.0
**Created:** 2026-02-21
**Last Updated:** 2026-02-21
