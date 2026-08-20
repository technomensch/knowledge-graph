---
title: "ADR-006: Document Cache-Clear as Official Upgrade Path for Claude Code Plugin"
status: Accepted
date: 2026-03-03
deciders: technomensch, Claude Haiku 4.5
---

# ADR-006: Document Cache-Clear as Official Upgrade Path for Claude Code Plugin

## Status

**Accepted** — 2026-03-03

## Context

Claude Code's plugin update mechanism does not invalidate the plugin cache when a version changes. Running `claude plugin update` or using "Update Now" updates metadata but leaves the physical cache directory unchanged. Users who update the plugin continue running stale files until they manually clear the cache.

This is a confirmed platform bug with multiple open issues against Claude Code ([#14061](https://github.com/technomensch/knowledge-graph/issues/14061), [#15642](https://github.com/technomensch/knowledge-graph/issues/15642), [#19197](https://github.com/technomensch/knowledge-graph/issues/19197), [#29074](https://github.com/technomensch/knowledge-graph/issues/29074)). There is no timeline for an upstream fix.

The same stale-cache issue exists in Codex CLI, where versioned plugins are cached at `~/.codex/plugins/cache/$MARKETPLACE/$PLUGIN/$VERSION/` and do not clear on update (GitHub issue openai/codex#21138). Codex has been tested as a second full-automation tier with identical cache behavior.

Three mitigation options were considered for the kmgraph plugin:

1. **Do nothing** — rely on users discovering the issue organically
2. **Add a SessionStart hook version check** — detect version mismatch at session start and display a warning prompt
3. **Document the cache-clear workaround prominently** — add instructions to GETTING-STARTED.md with the exact command

A fourth option — patching the cache directory automatically during SessionStart — was considered and rejected as too invasive (writing to `~/.claude/plugins/cache/` from a plugin hook crosses a trust boundary).

## Decision

**Option 3 (documentation) is accepted for v0.1.0-beta.** Option 2 (hook-based version check) is deferred to the next release cycle.

The GETTING-STARTED.md Troubleshooting section will include a prominent `!!! warning` admonition with cache-clear workarounds for both Claude Code and Codex CLI (both full-automation tier platforms).

**Claude Code:**
```bash
rm -rf ~/.claude/plugins/cache/stayinginsync-knowledge-graph/
```
Then reinstall via `/plugin` UI: uninstall kmgraph, reinstall from marketplace, and reconnect the MCP server.

**Codex CLI:**
```bash
rm -rf ~/.codex/plugins/cache/knowledge-management-graph/kmgraph/
codex plugin uninstall kmgraph
codex plugin marketplace add technomensch/knowledge-graph
codex plugin add kmgraph@knowledge-management-graph
```

## Rationale

- **Immediate:** Documentation is deployable now without additional implementation risk
- **Effective:** The `rm -rf` workaround is reliable and confirmed working across both full-automation platforms (Claude Code and Codex CLI)
- **Conservative:** Avoids writing to either platform's internal cache directory from plugin code
- **Traceable:** Links to upstream issues (Claude Code [#29074](https://github.com/technomensch/knowledge-graph/issues/29074), Codex [#21138](https://github.com/technomensch/knowledge-graph/issues/21138)) so users can monitor for official fixes
- **Equivalent tiers:** Both Claude Code and Codex CLI provide full automation with identical cache behavior

## Consequences

- Users who do not read the troubleshooting section may still encounter stale versions
- The hook-based warning (Option 2) should be implemented in the next feature release to catch users who skip documentation
- The upstream Claude Code issues should be upvoted to increase priority for an official fix

## Related

- [Lesson: Claude Code Plugin Cache Stale After Update](../lessons-learned/process/claude-code-plugin-cache-stale-after-update.md)
- [GETTING-STARTED.md](../GETTING-STARTED.md) — Implementation of this decision
