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

This is a confirmed platform bug with multiple open issues against Claude Code (#14061, #15642, #19197, #29074). There is no timeline for an upstream fix.

Three mitigation options were considered for the kmgraph plugin:

1. **Do nothing** — rely on users discovering the issue organically
2. **Add a SessionStart hook version check** — detect version mismatch at session start and display a warning prompt
3. **Document the cache-clear workaround prominently** — add instructions to GETTING-STARTED.md with the exact command

A fourth option — patching the cache directory automatically during SessionStart — was considered and rejected as too invasive (writing to `~/.claude/plugins/cache/` from a plugin hook crosses a trust boundary).

## Decision

**Option 3 (documentation) is accepted for v0.1.0-beta.** Option 2 (hook-based version check) is deferred to the next release cycle.

The GETTING-STARTED.md Troubleshooting section will include a prominent `!!! warning` admonition with:
- The exact `rm -rf` command to clear the cache
- Steps to reinstall via `/plugin` UI
- A note to reconnect the MCP server after reinstalling

## Rationale

- **Immediate:** Documentation is deployable now without additional implementation risk
- **Effective:** The `rm -rf` workaround is reliable and confirmed working
- **Conservative:** Avoids writing to Claude Code's internal cache directory from plugin code
- **Traceable:** Links to upstream Claude Code issues so users can monitor for an official fix

## Consequences

- Users who do not read the troubleshooting section may still encounter stale versions
- The hook-based warning (Option 2) should be implemented in the next feature release to catch users who skip documentation
- The upstream Claude Code issues should be upvoted to increase priority for an official fix

## Related

- [Lesson: Claude Code Plugin Cache Stale After Update](../lessons-learned/debugging/claude-code-plugin-cache-stale-after-update.md)
- [GETTING-STARTED.md](../GETTING-STARTED.md) — Implementation of this decision
