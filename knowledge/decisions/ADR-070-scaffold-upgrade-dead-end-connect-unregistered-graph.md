---
title: "ADR-070: Scaffold/Upgrade Dead-End — connect-unregistered-graph, Shared Registration Guards, Canonical Scaffold Routing"
number: 070
created: 2026-08-23T00:00:00Z
status: Accepted
author: technomensch
email: mkitact@gmail.com
git:
  branch: v0.7.4.2-fix-scaffold-upgrade-gaps
  commit: 81841acac2e1d58b3d575a2db7d9fcde5acd0bc0
  commit_short: 81841aca
  pr: null
  issue: null
implements: "[[57396128]] — fix(review): address opus validation findings — stale dist rebuild, remaining scaffold leak, registration-guard gap, cli.ts parity, version sync"
related:
  adrs: ["067"]
  lessons: []
  kg_entries: []
tags: [kg_config_init, kg_upgrade, scaffold, registration-guard, data-safety, ai-code-review]
category: architecture
---

# ADR-070: Scaffold/Upgrade Dead-End — connect-unregistered-graph, Shared Registration Guards, Canonical Scaffold Routing

**Date:** 2026-08-23
**Status:** Accepted
**Implements:** [[57396128]] — fix(review): address opus validation findings — stale dist rebuild, remaining scaffold leak, registration-guard gap, cli.ts parity, version sync
**Related:** [[ADR-067-mutable-active-switch-vs-context-derived-kg-resolution]]

---

## Provenance — how these findings were surfaced

**All three decisions recorded in this ADR were surfaced automatically by AI agents during automated code review of an unrelated feature branch — `v0.7.5-ENH-064-add-readme-to-graph`'s final review — not identified by a human engineer in the normal course of manual development.** ENH-064 (a KG-root README backfill feature) triggered a final-review pass whose findings included the `kg_config_init` ↔ `kg_upgrade` circular dead-end (Decision 1), which pulled in the two related gaps documented here as Decisions 2 and 3 once the fix was scoped.

The fixes themselves were implemented and validated by AI agents — Sonnet 5 implementers doing the coding, and two independent Opus review passes (one mid-flight, one a full validation pass after the initial fix wave) — on this branch, `v0.7.4.2-fix-scaffold-upgrade-gaps`. Specifically:

- The initial `connect-unregistered-graph` category (Decision 1) was implemented by a Sonnet 5 subagent (commit `f233c0f6`).
- A second Sonnet 5 subagent, working concurrently in the same shared worktree, added the `kg_config_init` refusal-to-scaffold check that actually makes `connect-unregistered-graph` reachable (commit `e4cfa44b`), and separately fixed the scaffold-routing drift and a `cli.ts` ordering bug (Decision 3, commit `7db94804`).
- An Opus review pass over the resulting diff found the registration-guard bypass described in Decision 2, plus a second, still-open scaffold-then-refuse leak, a stale `dist/` bundle, a `cli.ts` parity gap, and a version-sync miss — six findings in total, all fixed in one follow-up commit (`57396128`, "fix(review): address opus validation findings").
- A human (the repo maintainer) approved and directed the work at each major decision point — scoping the fix wave, confirming the coordinator's premise correction in the Task A report, and reviewing the branch — but did not author the diagnosis or the fixes themselves. This was AI-agent-driven review-and-remediation with human approval gates, not autonomous unsupervised action, and not manual human debugging.

This note exists as a deliberate transparency record: the reasoning trail below (Rationale, Alternatives Considered) reflects what the reviewing agents actually found and argued, reconstructed from their own commit messages and self-review reports (`.superpowers/task-a-report.md`, `.superpowers/opus-fix-wave-report.md` on this branch), not a human's post-hoc narrative.

---

## Context

**Problem:** `kg_config_init` (the MCP tool backing `/kmgraph:kmg-init`'s scaffold path) refuses to scaffold a new knowledge graph over a folder that already has unregistered `decisions/` or `lessons-learned/` content — a data-safety refusal, since scaffolding would otherwise silently interleave starter templates with a folder someone is already using for something else. That refusal message points the user at `kg_upgrade` to register the folder instead.

But `kg_upgrade`'s target resolution (`resolveGraph()` in `mcp-server/src/tools/upgrade.ts`) is cwd-resolved-only against the config registry — it has no fallback that inspects disk content for a folder that was never registered in the first place. So a user following `kg_config_init`'s own advice hit `kg_upgrade`'s generic "No knowledge graph resolved from your current directory" dead end. The two tools pointed at each other in a circle with no way out.

**Scope:** This ADR covers three decisions made while closing that circle, all landing on `v0.7.4.2-fix-scaffold-upgrade-gaps`:

1. How to give `kg_upgrade` a way to register an unregistered-but-populated folder.
2. Making sure that new registration path can't bypass the safety guards every other registration path already has.
3. A scaffold-template-routing correctness bug found and fixed alongside the above (the MCP-native scaffold function had drifted out of sync with the markdown wizard it's supposed to mirror).

---

## Decision

### Decision 1 — `connect-unregistered-graph`: an opt-in `kg_upgrade` category that registers in place

Added a new opt-in `kg_upgrade` apply category, `connect-unregistered-graph`, that registers an existing unregistered folder in place — no re-scaffold, no template writes — when the user explicitly requests it via `apply: ["connect-unregistered-graph"]`. It reuses an orphaned `.kmgraph-id` marker's existing `graphId` when one is present (preserving continuity instead of minting a new identity), and derives a unique name from the directory basename otherwise. `kg_config_init`'s refusal message and `cli.ts`'s equivalent CLI refusal were both updated to name this category explicitly as the way out.

**Rejected alternative A — a disk-content fallback inside `resolveGraph()` itself.** Rejected because `resolveGraph()` is called from many read-only paths (search, capture, FTS5 rebuild, and others) where silently auto-registering a graph as a side effect of a read would be a dangerous surprise — a user running `kg_search` from the wrong directory should get "no graph here," not an unrequested registry mutation.

**Rejected alternative B — silent auto-registration inside `kg_upgrade`, no opt-in category.** Rejected as inconsistent with this project's established inspect-then-apply pattern: every other `kg_upgrade` backfill category is inspect-only until the user names it explicitly in `apply`. An always-on auto-register would be the one category that never asks.

### Decision 2 — every registration path must go through the same registration guard

The `connect-unregistered-graph` path, as first implemented (commit `f233c0f6`), registered a folder without running `resolveRegistrationGuard` — the shared home/root hard-block and broad-ancestor-warning check that `kg_config_init` and the CLI's `runInit` both already used before writing a registry entry. An Opus review pass found this was a real safety gap, not a theoretical one: a monorepo root with an unrelated top-level `decisions/` folder (e.g. from an unrelated tool) could be silently registered as a brand-new knowledge graph, with no hard-block and no ancestor warning, because the new code path simply never called the check that would have caught it.

Decision: every path that registers a new graph — MCP-native `kg_config_init`, the CLI's `runInit`, and now `kg_upgrade`'s connect category — calls the same shared `resolveRegistrationGuard`. No exceptions carved out for the new path. Implemented by restructuring `handleUpgrade`'s target-resolution block from a synchronous IIFE into a sequential `if`/`else` so it can `await gate()` and return early, mirroring `handleConfigInit`'s existing hard-block/broad-ancestor handling almost verbatim, gated on a new `confirmBroadRegistration?: "yes" | "no"` param matching the shape of `config.ts`'s existing equivalent param.

### Decision 3 — the wizard's template routing is canonical; the MCP-native scaffold path was wrong and was rewritten to match it

While implementing Decisions 1–2, the MCP-native scaffold function (`scaffoldGraphDirectory` in `mcp-server/src/tools/config.ts`) was found to have drifted out of sync with the markdown wizard's canonical routing (`commands/kmg-init-shared/kmg-template-seed.md`):

- It was copying starter templates into live content directories (`concepts/`, `lessons-learned/`, `decisions/`, `sessions/`) instead of a dedicated `templates/` directory.
- It was missing `entry-template.md` entirely.
- It was sourcing the wrong (longer) variants of `me.md`/`rules.md`/`triggers.md` instead of the project-starter versions the wizard uses.

Decision: the wizard's routing is the canonical source of truth — it was correct; the MCP-native path was wrong — and `scaffoldGraphDirectory` was rewritten file-by-file to match it exactly (dirs list now `["concepts", "templates", "lessons-learned", "decisions", "sessions", "chat-history", "tmp"]`, with starter content routed into `templates/`).

**Independently found and fixed in the same pass:** both `kg_config_init` (`handleConfigInit`) and the CLI's `runInit` had a "scaffold-then-refuse" ordering bug — files were written to disk by `scaffoldGraphDirectory` *before* the marker-mismatch check ran to potentially abort registration, leaking scaffold files into folders the tool then refused to register. This was fixed twice in sequence on this branch: a first pass (commit `7db94804`) reordered `cli.ts`'s check ahead of the scaffold call; the Opus validation pass (commit `57396128`, Fix 2) then found `handleConfigInit`'s own check still ran *after* scaffolding on the orphaned-marker path — the same bug pattern, missed in the first pass, in the sibling MCP-native function — and reordered it too, reusing the already-computed `preExistingMarkerId` rather than re-reading the marker file. The Opus pass also extended the existing "Opus review SF-4" regression test to assert `fs.readdirSync` is byte-identical before/after a refused init, not just that `writeConfig` was never called — closing the gap that let the first instance of this bug go undetected.

---

## Rationale

### Why this approach

1. **Opt-in over automatic, everywhere.** Both Decision 1's category-gating and Decision 2's guard-sharing follow the same underlying principle already established elsewhere in this codebase (`ADR-067`'s inspect-then-apply model for `kg_upgrade`, and `kg_config_init`'s own hard-block/warning gates): a tool that can register or mutate registry state must ask before it acts, and every code path capable of that mutation must ask the same way. Decision 2 is really Decision 1's principle applied a second time, closing a gap the first implementation left open.
2. **Canonicalize against the artifact users actually exercise most.** For Decision 3, the wizard (`kmg-template-seed.md`) is the path most `/kmgraph:kmg-init` users go through; the MCP-native `scaffoldGraphDirectory` exists for programmatic/CLI callers and had silently drifted without anyone noticing because its output isn't eyeballed the way the wizard's is. Making the wizard the reference and conforming the code path to it (rather than reconciling the two independently) avoids re-litigating which one is "right."

### Alternatives considered

**Option A (Decision 1): disk-content fallback in `resolveGraph()`.**
- Pros: one code path, no new category to document.
- Cons: turns every read-only `resolveGraph()` caller into a potential silent-write path.
- Rejected because: the blast radius (search, capture, FTS5 — all read paths) is too wide for a mutation that should require explicit intent.

**Option B (Decision 1): silent auto-registration in `kg_upgrade`.**
- Pros: fewer steps for the user — no need to name the category explicitly.
- Cons: breaks the inspect-then-apply contract every other `kg_upgrade` category honors; a user running `kg_upgrade` to check for something else could end up registering a graph they didn't mean to.
- Rejected because: inconsistent with established project pattern, and inspection-only-by-default is a deliberate safety property elsewhere in this tool.

**Option C (Decision 2): leave `connectUnregisteredGraph` guard-free, reasoning the folder "obviously" has real content so the ancestor-warning case can't apply.**
- Not seriously considered once the Opus review pointed out the counterexample (a monorepo root with an unrelated top-level `decisions/` folder) — the guard exists precisely for cases that look superficially safe but aren't.

### Trade-offs

**Benefits:**
- ✅ The dead end is closed — a user following `kg_config_init`'s own refusal message now has a working next step.
- ✅ No new attack surface for silent auto-registration — every registration path shares one hard-block/warning gate.
- ✅ Scaffold output (MCP-native and wizard) is now consistent for the first time — no more divergent "canonical" starter kits depending on which path a user took.

**Costs:**
- ❌ `connect-unregistered-graph` is currently only reachable via direct `kg_upgrade` MCP calls or the CLI — not yet wired into the Claude Code wizard flow (see Consequences below).
- ❌ The new refusal in `kg_config_init`/`cli.ts` has no escape-hatch confirmation flag, unlike other guards in the same code (see Consequences below).

**Mitigation:** both gaps are deliberately deferred, not accidental — see Consequences.

---

## Consequences

### Positive

1. **Closed circular dead-end:** `kg_config_init` → refuse → `kg_upgrade` → `connect-unregistered-graph` → registered, in one coherent flow, verified end-to-end by the test suite (546+ tests passing across `config.test.ts`, `upgrade.test.ts`, and `cli-init-location.test.ts` by the final commit on this branch).
2. **Guard parity:** MCP-native init, CLI init, and the new connect category all now call the identical `resolveRegistrationGuard` — one hard-block/warning implementation, not three drifting copies.
3. **Scaffold correctness:** `scaffoldGraphDirectory` now matches the wizard's routing exactly, and the scaffold-then-refuse leak is closed on both the MCP-native and CLI paths, in both the marker-mismatch and unregistered-content refusal cases.

### Negative / Open

1. **Not yet reachable from the Claude Code wizard.** `/kmgraph:kmg-init`'s Verify/Upgrade path (`commands/kmg-init-shared/kmg-upgrade-inspector.md`) treats every `category: "resolution"` item — which is what `kg_upgrade`'s inspect mode reports for an unregistered-but-populated cwd — as informational-only and never adds it to `_mcp_apply[]` for auto-apply (confirmed at `kmg-upgrade-inspector.md` lines 54–62 and 343: `"resolution"` is explicitly excluded from the apply-enum categories the wizard will ever pass to `kg_upgrade apply`). A user going through the guided wizard today still can't reach `connect-unregistered-graph` without dropping to a direct `kg_upgrade` MCP call or the CLI. This is a known, **deliberately deferred** gap: `commands/` is PROTECTED and wiring this in requires separate explicit user permission, out of scope for this branch.
2. **No escape-hatch confirmation flag on the new refusal.** The `kg_config_init`/`cli.ts` "found unregistered decisions/lessons-learned content, refusing to scaffold" refusal has no `confirm`-style override, unlike other similar guards in the same code (e.g. the broad-ancestor warning's `confirmBroadRegistration`). **Deliberately deferred** — no established need for a bypass has surfaced yet; adding one preemptively risked building an unused escape hatch around a data-safety check.
3. **Paperwork updated.** `CHANGELOG.md` (new `[0.7.4.2]` entry), `README.md` (new `v0.7.4.2` Feature Highlights entry), `INSTALL.md` (new `v0.7.4.2` upgrade-notes table row), and `docs/reference/command-guide.md` (new `connect-unregistered-graph` row in the `kg_upgrade` category table) all now document the new `connect-unregistered-graph` category, closed in the same paperwork pass that documents this ADR itself.
4. **Release-metadata version sync completed.** The Opus re-validation pass flagged `.codex-plugin/plugin.json` and `.claude-plugin/marketplace.json` as left at `0.7.4.1` after the initial fix wave's 3-file version bump — both were synced to `0.7.4.2` in commit `81841aca`, closing the advisory `VERSION DRIFT` gap `scripts/pre-push-gate.sh` would otherwise have flagged.

### Neutral

1. **`categories: []`** is written for every freshly-registered `GraphConfig` from `connect-unregistered-graph` — no attempt is made to reconstruct a categories list by scanning `lessons-learned/` subfolders, since `kg_capture` doesn't validate captures against `config.categories` and inventing a heuristic was judged out of scope for "register this folder."

---

## Related Decisions

- **[[ADR-067-mutable-active-switch-vs-context-derived-kg-resolution]]:** establishes the context-derived, non-mutable-pointer resolution model (`kg_resolve`, `resolveGraph()`) that Decision 1 explicitly declined to modify — the new category adds a registration path alongside resolution rather than folding disk-content inference into resolution itself.

---

## Related Documentation

**Implementation:**
- `mcp-server/src/tools/upgrade.ts` — `hasUnregisteredGraphContent`, `deriveUniqueGraphName`, `connectUnregisteredGraph`, `connect-unregistered-graph` in `APPLY_ORDER`/`ApplyCategory`/Zod enum, `handleUpgrade` target-resolution branching and guard call.
- `mcp-server/src/tools/config.ts` — `registerGraphConfig` (shared registration write, extracted from `handleConfigInit`), `resolveRegistrationGuard` (shared hard-block/broad-ancestor check), `handleConfigInit`'s reordered pre-scaffold refusal checks, `scaffoldGraphDirectory`'s corrected template routing.
- `mcp-server/src/cli.ts` — `runInit()`'s unregistered-content refusal and reordered marker-mismatch check, `registerGraphConfig` reuse.
- `commands/kmg-init-shared/kmg-template-seed.md` — the canonical wizard routing that `scaffoldGraphDirectory` was rewritten to match (Decision 3).
- `commands/kmg-init-shared/kmg-upgrade-inspector.md` (lines 54–62, 343) — current `"resolution"`-category handling that leaves `connect-unregistered-graph` unreachable from the wizard (see Consequences #1); PROTECTED, not modified by this work.

**Session records:**
- `.superpowers/task-a-report.md` — Decision 1 implementer's report (Sonnet 5), including the coordinator's premise correction that made the `kg_config_init` refusal message real rather than dead code.
- `.superpowers/opus-fix-wave-report.md` — Opus validation pass report covering Decisions 2–3's fixes and the four other findings from the same review (stale `dist/`, `cli.ts` parity, version sync).

---

## Future Considerations

1. **Wire `connect-unregistered-graph` into the wizard.** `commands/kmg-init-shared/kmg-upgrade-inspector.md` would need a `"resolution"`-category branch that offers auto-apply the same way other categories do — requires explicit user permission to touch `commands/`.
2. **Decide whether the new refusal needs a confirmation escape hatch**, once (if) a real user scenario surfaces where refusing to scaffold over unregistered content is the wrong call.
3. ~~**Paperwork pass**: `CHANGELOG.md`, `README.md`, `INSTALL.md`, `docs/reference/command-guide.md`~~ — done (see Consequences → Negative/Open #3); `.codex-plugin/plugin.json`/`.claude-plugin/marketplace.json` version sync was also already completed on this branch (commit `81841aca`).

---

**Decision Made:** 2026-08-23 (retroactively documenting work implemented 2026-08-22–23 on `v0.7.4.2-fix-scaffold-upgrade-gaps`)
**Last Updated:** 2026-08-23
**Status:** Accepted

---

## Open Questions

- Should `connect-unregistered-graph` reachability from the wizard (Future Consideration #1) be filed as its own ENH/issue now, or left as an ADR follow-up until someone hits the gap in practice?
