---
id: ENH-051
type: Enhancement
status: deferred
github-issue: null
branch: none
created: 2026-07-18
related_adrs: ["ADR-066", "ADR-067"]
related_enhs: ["ENH-022"]
---

# ENH-051: Stop Hand-Duplicating KG Path Logic Between cli.ts and kmg-init.md

**Local ID:** ENH-051 | **GitHub Issue:** none filed (Track-only mode — deferred)

## Problem Statement

KG storage-location path computation is duplicated by hand in two places:

1. `mcp-server/src/cli.ts` — `resolveInitLocation()`, used by the Codex/Gemini setup wizard.
2. `commands/kmg-init.md` — a bash `case` statement (Step 1.4), used by the Claude Code setup wizard.

Both take the same three location choices (project-local, personal/global-topic, custom) and independently hardcode the same resolved paths. Nothing enforces they stay in sync — this is exactly how the bug fixed in v0.6.20 Task 4 happened: `kmg-init.md`'s copy pointed at the legacy `~/.claude/knowledge-graphs/<name>/` after `cli.ts` had already moved to `~/.kmgraph/knowledge-graphs/<name>/`.

**ADR-066 (line 78, Accepted, resolved 2026-07-17) already names the intended fix:** `kmg-init.md` should delegate path computation to the MCP tool (`kg_config_init`/`kg_scaffold`) instead of duplicating the logic in its own bash case-statement, "so the two surfaces structurally cannot diverge again." But this was never operationalized as a buildable spec, and the capability doesn't exist:

- `kg_config_init` (`mcp-server/src/tools/config.ts`) requires `kgPath` as an **input** parameter — it does not compute one from a location type.
- `kg_scaffold` (`mcp-server/src/tools/scaffold.ts`) requires `outputPath` as an **input** parameter — same gap.

Neither tool can currently answer "given this location choice and KG name, what's the path?" That question is answered independently, by hand, in two different codebases.

## Context That Triggered This

Discovered while executing v0.6.20 Task 4 (branch `v0.6.20-storage-migration-completion`): fixing `kmg-init.md`'s stale path required first confirming whether "delegate to the MCP tool" (per ADR-066) was actually buildable today. It isn't. Task 4 shipped the immediate bug fix instead — hardcoded the corrected path directly in `kmg-init.md`'s case-statement, with a comment cross-referencing `cli.ts:43` as the value to keep in sync. That's a symptom fix; this item tracks the root-cause fix ADR-066 already called for but never spec'd.

## Related

- **ADR-066** — names this exact delegation as the intended root-cause fix (line 78). This spec is the buildable version ADR-066's decision log never got.
- **ADR-067 (Proposed, open)** — mutable `.active` switch vs. context-derived KG resolution. Adjacent, not overlapping: both concern "which layer decides where a KG lives," but ADR-067 is about *identifying the active graph*, this item is about *computing a new graph's storage path*. Must not assume ADR-067's outcome.
- **ENH-022 (folder-structure migration)** — already touches `kg_config_init` and `kg_scaffold` (its spec notes both "still create old layout" issues, fixed incrementally across v0.5.10.7/v0.6.4 plans). Same tool surface, different concern. Cross-referenced so future edits to either tool check both specs.
- **Deferred personal/project restructuring** (noted out-of-scope in the v0.6.20 plan, reopens ADR-028 if pursued, possibly tied to v7/npm-distribution planning) — not a filed item, so not a formal dependency. This item is compatible with and likely reduces the cost of that future restructuring (one server-side path function to change instead of two hand-maintained copies), but does not depend on it landing first.

## Goals

1. Give `kg_config_init` (and/or `kg_scaffold`) the ability to compute a KG storage path from a location-type choice + name, rather than requiring the caller to pre-resolve it.
2. Update `cli.ts` and `commands/kmg-init.md` to call that resolver instead of each maintaining its own copy of the path logic.
3. Preserve `kmg-init.md`'s richer UX (categories, git strategy, upgrade checks) — it stops owning the storage-mode path table, not the wizard flow around it.

## Out of Scope

- Adding new location types beyond the current three (project-local, personal/global-topic, custom).
- Resolving ADR-067 (context-derived vs. mutable `.active` resolution) — proceeds independently of that decision.
- Personal/project restructuring (`~/.kmgraph/personal/` + `~/.kmgraph/project/<name>/`) — deferred separately, not decided here.
