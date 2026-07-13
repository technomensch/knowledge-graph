---
title: "Cross-platform upgrade triggering: version sentinel over startup notification"
status: Accepted
date: 2026-06-19
tags: [codex, upgrade, kg_upgrade, version-sentinel, cross-platform, ENH-022, v0.6.4]
---
## Status

Accepted — implemented in v0.6.4 (Task 6)

## Context

Claude Code triggers `kg_upgrade` via re-running initialization (wizard flow). Codex has no wizard, no hook system, and no session-start automation. When a user installs a new kmgraph version on Codex, upgrades are silently skipped unless called manually.

Three options were considered:

1. **AGENTS.md instruction only** — tell Codex to call `kg_upgrade` at session start. No version tracking; agent has no signal for *when* upgrades are needed. Relies entirely on agent compliance.

2. **Version sentinel in config + AGENTS.md instruction** — store `lastAppliedVersion` per graph in config. `kg_upgrade` inspect surfaces a `version-update` item when installed version > stored version. AGENTS.md instruction gives Codex the trigger to check.

3. **MCP startup notification** — prepend an upgrade notice to every `kg_*` tool response when version mismatch detected. No AGENTS.md instruction needed.

## Decision

**Option 2: version sentinel + AGENTS.md instruction.**

## Rationale

- Version tracking in config is the correct source of truth — it's explicit, inspectable, and aligns with the existing `kg_upgrade` inspect pattern (check → report → apply)
- Option 3 adds noise to every tool call response, even when users have no pending upgrades; leaks upgrade state into unrelated tool outputs
- Option 1 alone has no signal — agent would call `kg_upgrade` every session indefinitely even when nothing needs upgrading
- Sentinel allows future tooling (dashboards, diagnostics) to query upgrade state without a live MCP call

## Key Design Choices

- **`absent lastAppliedVersion` = first install, not mismatch.** No `version-update` item shown on first install. Clean installs don't need migration prompts.
- **`lastAppliedVersion` written after any `apply` run**, not only after full upgrade. Partial applies update the sentinel to avoid re-prompting for categories already applied.
- **`core/default-templates/AGENTS-template.md` is canonical** for the session-start instruction. Direct `AGENTS.md` edit is upgrade-path only for existing installs.

## Consequences

- New config field `lastAppliedVersion` per graph entry (optional, backward-compatible)
- `kg_upgrade` inspect adds one more check function (`checkVersionMismatch`)
- Codex users on first install see no upgrade prompt (acceptable — clean install has correct structure)
- Existing Codex users upgrading from pre-v0.6.4 see `version-update` item on first session after install (desired behavior)
