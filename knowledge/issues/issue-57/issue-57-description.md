---
id: issue-57
type: Bug
status: resolved
github-issue: "#248"
branch: v0.7.4.2-fix-scaffold-upgrade-gaps
created: 2026-08-23
related_adrs: ["ADR-070"]
---

# issue-57: `kg_config_init` and `kg_upgrade` form a circular dead end over unregistered `decisions/`/`lessons-learned/` content

## Problem

Found 2026-08-23 during automated review of an unrelated feature branch (`v0.7.5-ENH-064-add-readme-to-graph`'s final review), not by a human in the normal course of manual development — see the Provenance section of [ADR-070](../../decisions/ADR-070-scaffold-upgrade-dead-end-connect-unregistered-graph.md) for the full trail.

`kg_config_init` (backing `/kmgraph:kmg-init`'s scaffold path) refuses to scaffold a new knowledge graph over a folder that already has unregistered `decisions/` or `lessons-learned/` content — a correct data-safety refusal, since scaffolding would otherwise silently interleave starter templates into a folder someone is already using for something else. The refusal message points the user at `kg_upgrade` as the next step.

But `kg_upgrade`'s target resolution (`resolveGraph()` in `mcp-server/src/tools/upgrade.ts`) is cwd-resolved-only against the config registry — it has no fallback path that inspects disk content for a folder that was never registered in the first place. A user following `kg_config_init`'s own advice hit `kg_upgrade`'s generic "No knowledge graph resolved from your current directory" dead end instead. The two tools pointed at each other in a circle with no way out for the user.

## Root Cause

No `kg_upgrade` apply category existed that could register an already-populated-but-unregistered folder in place. Every existing `kg_upgrade` category assumed the target folder was already a registered graph; none covered "this folder has real content but was never registered."

## Fix

Added a new opt-in `kg_upgrade` apply category, `connect-unregistered-graph` (commit `f233c0f6`), that registers an existing unregistered folder in place — no re-scaffold, no template writes — when the user explicitly requests it via `apply: ["connect-unregistered-graph"]`. It reuses an orphaned `.kmgraph-id` marker's existing `graphId` when one is present (preserving continuity instead of minting a new identity), and derives a unique name from the directory basename otherwise. `kg_config_init`'s refusal message was updated to name this category explicitly as the way out (commit `e4cfa44b`, which also added the refusal-to-scaffold check that makes the category reachable in the first place).

A follow-on Opus review pass over the resulting diff found that this new registration path bypassed `resolveRegistrationGuard` — the shared home/root hard-block and broad-ancestor-warning check every other registration path (`kg_config_init`, the CLI's `runInit`) already ran before writing a registry entry. That gap was closed as part of commit `57396128`, so `connect-unregistered-graph` now goes through the identical shared guard as every other registration path — no path exempted.

**Commits:**
- `f233c0f6` — feat(upgrade): add connect-unregistered-graph category to close kg_config_init<->kg_upgrade dead end
- `e4cfa44b` — fix(config): refuse to scaffold over unregistered decisions/lessons-learned content
- `57396128` — fix(review): address opus validation findings (registration-guard gap closed here, among other findings — see issue-58 for the scaffold-routing/leak findings in this same commit)

## Design Rationale

Full rationale, rejected alternatives (a `resolveGraph()` disk-content fallback; silent auto-registration with no opt-in category), and consequences are recorded in [ADR-070](../../decisions/ADR-070-scaffold-upgrade-dead-end-connect-unregistered-graph.md), Decisions 1 and 2.

## Known Open Gap (deliberately deferred, not part of this fix)

`connect-unregistered-graph` is reachable via direct `kg_upgrade` MCP calls or the CLI, but is **not yet wired into the Claude Code wizard flow** (`commands/kmg-init-shared/kmg-upgrade-inspector.md` treats the relevant inspect-mode category as informational-only and never auto-applies it). Wiring this in requires touching `commands/`, which is PROTECTED and needs separate explicit user permission — tracked as a Future Consideration in ADR-070, not resolved by this issue.

## Verification

Covered by the test suite referenced in ADR-070 (546+ tests passing across `config.test.ts`, `upgrade.test.ts`, and `cli-init-location.test.ts` by the final commit on this branch), exercising the closed-loop flow: `kg_config_init` → refuse → `kg_upgrade` → `connect-unregistered-graph` → registered.

## See Also

- [ADR-070: Scaffold/Upgrade Dead-End](../../decisions/ADR-070-scaffold-upgrade-dead-end-connect-unregistered-graph.md)
- [issue-58: scaffoldGraphDirectory template-routing drift and scaffold-then-refuse file leak](../issue-58/issue-58-description.md) — related fix on the same branch, distinct root cause
