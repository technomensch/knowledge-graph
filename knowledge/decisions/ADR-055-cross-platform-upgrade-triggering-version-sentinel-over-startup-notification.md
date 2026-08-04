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

## Known Gap — found 2026-07-28, not yet resolved

**Tracked as `issue-32`** (`knowledge/issues/issue-32/issue-32-description.md`), filed 2026-07-28 so this gap has a real ID for release-grouping purposes alongside ADR-067.

This ADR's sentinel model covers *"the installed plugin version is ahead of what this graph last applied"* — a disk-state comparison, checked at session start. It does not cover a **different, narrower case surfaced live during ADR-067's brainstorm**: an *already-running* MCP server process, spawned before an upgrade landed on disk, keeps executing its old in-memory code indefinitely — Node doesn't hot-reload — even after the upgrade completes and `lastAppliedVersion` is current. The sentinel check itself is correct and unaffected; the gap is that nothing tells a **live, already-open session** that the process serving it is now stale relative to what's installed.

**Live evidence:** at the time of writing, all 5 real MCP server processes running on this machine were on v0.6.16 code, two of them 2+ days old, while the installed plugin was newer — confirmed the more plausible root cause of a live config split-brain incident caught mid-session during ADR-067's research (see `knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md`, § Fable Review Findings, item 9), independently validated by Opus.

**Not designed here — recorded as a genuine open gap this ADR's own mechanism doesn't reach.** A fix would need the running process to detect its own code version is behind what's on disk and surface that mid-session (distinct from this ADR's inspect-time check, which only runs when explicitly invoked).

**Clean repro, same day, before/after `/reload-plugins`:** `kg_version` reported `installed: "0.3.10"` before a plugin update+reload (itself reading the stale legacy `~/.claude/kg-config.json` — the exact split-brain § Live Split-Brain Caught Mid-Session already documents). After running `/plugin` update then `/reload-plugins`, the same tool call in the same session correctly reported `installed: "0.6.20"` — confirming a session's own process *does* pick up new code on reload. But a process listing taken at that same instant showed **6 of 8 live `mcp-server/dist/index.js` processes still running from `.../kmgraph/0.6.16/...`**, unaffected by the reload — only the two sessions that actually ran `/plugin` + `/reload-plugins` got new processes (PIDs `43105`, `41761`, both `.../kmgraph/0.6.20/...`). Every other open session, across other terminals/IDEs, keeps serving 0.6.16 indefinitely with no signal that it's now behind. This is the exact mechanism gap stated above, caught mid-repro rather than inferred.
