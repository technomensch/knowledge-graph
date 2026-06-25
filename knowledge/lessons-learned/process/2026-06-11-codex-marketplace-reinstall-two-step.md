---
title: "Lesson: Codex Plugin Marketplace Registration Persists After Uninstall"
created: 2026-06-11T00:00:00Z
author: technomensch
email: mkitact@gmail.com
git:
  branch: v0.5.10.3-fix-mcp-bundle
  commit: 92b52a99
  pr: "#135"
  issue: "#133"
tags: [process, codex, marketplace, installation, troubleshooting]
category: process
---

# Lesson Learned: Codex Plugin Marketplace Registration Persists After Uninstall

**Date:** 2026-06-11
**Category:** process
**Version:** 1.0

---

## Problem

When reinstalling a Codex plugin after an uninstall, the marketplace registration persists even after running `codex plugin uninstall kmgraph`. A subsequent `codex plugin marketplace add technomensch/knowledge-graph` fails with error:

```
Error: Plugin already exists in marketplace: knowledge-management-graph
```

This leaves the user unable to install an updated version of the plugin.

---

## Root Cause

`codex plugin uninstall` removes the local plugin installation from Codex, but does NOT remove the plugin's entry from the local marketplace registry. The marketplace maintains a separate registry of available plugins (by identifier, not by installed state).

Two separate registrations exist:
1. **Installed plugins**: `codex plugin <command>` (removed by `uninstall`)
2. **Marketplace registry**: `codex plugin marketplace <name>` (NOT removed by `uninstall`)

Without removing the marketplace entry, attempting to re-add the same publisher/repo combination fails because the marketplace believes it's already registered.

---

## Complete Reinstall Sequence

The correct order to reinstall a plugin is:

```bash
# Step 1: Uninstall the plugin
codex plugin uninstall kmgraph

# Step 2: Remove from marketplace registry (required!)
codex plugin marketplace remove knowledge-management-graph

# Step 3: Re-add to marketplace
codex plugin marketplace add technomensch/knowledge-graph

# Step 4: Install the updated version
codex plugin add kmgraph@knowledge-management-graph
```

**Critical:** Step 2 is mandatory. Skipping it causes Step 3 to fail.

---

## Why This Matters

When updating a plugin to fix a critical bug (e.g., missing bundled dependencies, as in v0.5.10.3), users must reinstall to pull the new version. Without this two-step sequence documented, users encounter confusing marketplace errors and cannot complete the update.

---

## Solution Implemented

**Documentation:** Added the full four-command sequence to INSTALL.md troubleshooting section, with explanation of why Step 2 is necessary.

**Implementation:** (deferred in this session)
- [ ] Update `INSTALL.md` with complete Codex reinstall sequence in troubleshooting
- [ ] Include note: "Do not skip `codex plugin marketplace remove` — it is required to clear the prior registration"

---

## Prevention & Best Practices

### For Users

1. **Always use the two-step sequence** when reinstalling: `uninstall` + `marketplace remove`
2. **Use the marketplace identifier**, not the command name (e.g., `knowledge-management-graph`, not `kmgraph`)
3. **Document this locally** or bookmark the troubleshooting section

### For Plugin Developers

1. **Document the full reinstall sequence** in README and INSTALL.md
2. **Explain the distinction** between plugin installation and marketplace registration
3. **Include troubleshooting** for the "already exists" error
4. **When cutting critical bug-fix releases**, include reinstall instructions prominently in release notes

---

## Test Plan

To verify v0.5.10.3 is correctly installed:

1. Uninstall and reinstall using the full four-step sequence
2. Run `codex -v` or `codex status` to confirm the new version is active
3. Verify MCP server is bundled: `codex plugin show kmgraph` should show bundled dist

---

## Related Issues

- GitHub Issue [#133](https://github.com/technomensch/knowledge-graph/issues/133) — MCP server fails on marketplace install (fixed in v0.5.10.3 via bundling)
- GitHub PR [#135](https://github.com/technomensch/knowledge-graph/pull/135) — v0.5.10.3 MCP bundle fix

---

## Related ADRs

- [ADR-009: Three-Tier Installation Architecture](../../decisions/ADR-009-three-tier-installation-architecture.md) — Installation tiers and target platforms
- [ADR-010: Namespace Rename](../../decisions/ADR-010-namespace-rename-knowledge-to-kg-sis.md) — Plugin identifier versioning (marketplace slug)

---

## See Also

- `INSTALL.md` — Troubleshooting section (to be updated)
- `docs/troubleshooting/codex-issues.md` — Codex-specific troubleshooting

---

**Version:** 1.0
**Created:** 2026-06-11
**Last Updated:** 2026-06-11
