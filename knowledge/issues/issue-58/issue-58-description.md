---
id: issue-58
type: Bug
status: implemented
github-issue: "#249"
branch: v0.7.4.2-fix-scaffold-upgrade-gaps
created: 2026-08-23
related_adrs: ["ADR-070"]
---

# issue-58: `scaffoldGraphDirectory` drifted from the wizard's canonical template routing, and scaffold files leaked to disk before registration refusal checks could abort

## Problem

Found 2026-08-23 during the same automated review pass as issue-57 (see [ADR-070](../../decisions/ADR-070-scaffold-upgrade-dead-end-connect-unregistered-graph.md) Provenance), while implementing the fix for that issue's `kg_config_init` ↔ `kg_upgrade` dead end. Two distinct correctness bugs surfaced in the MCP-native scaffold path, both affecting `mcp-server/src/tools/config.ts`'s `scaffoldGraphDirectory` and its callers.

### Bug A — template-routing drift

`scaffoldGraphDirectory` (the MCP-native scaffold function used by `kg_config_init` and the CLI) had drifted out of sync with the markdown wizard's canonical routing (`commands/kmg-init-shared/kmg-template-seed.md`):
- It was copying starter templates into live content directories (`concepts/`, `lessons-learned/`, `decisions/`, `sessions/`) instead of a dedicated `templates/` directory.
- It was missing `entry-template.md` entirely.
- It was sourcing the wrong (longer) variants of `me.md`/`rules.md`/`triggers.md` instead of the project-starter versions the wizard uses.

### Bug B — scaffold-then-refuse file leak

Both `kg_config_init` (`handleConfigInit`) and the CLI's `runInit` wrote scaffold files to disk via `scaffoldGraphDirectory` **before** the marker-mismatch check ran to potentially abort registration — so a refused registration could still leave scaffold files behind in a folder the tool then declared it would not register.

## Root Cause

Bug A: no automated parity check existed between the wizard's template routing and the MCP-native scaffold function's routing, so the two diverged silently over time — nobody eyeballs the MCP-native path's output the way the wizard's output gets eyeballed by users going through `/kmgraph:kmg-init`.

Bug B: ordering bug — the scaffold write and the marker-mismatch abort check were not sequenced so the check ran first.

## Fix

**Bug A (commit `7db94804`):** `scaffoldGraphDirectory` rewritten file-by-file to match the wizard's routing exactly — directory list now `["concepts", "templates", "lessons-learned", "decisions", "sessions", "chat-history", "tmp"]`, with starter content routed into `templates/`, `entry-template.md` added, and the correct project-starter source variants of `me.md`/`rules.md`/`triggers.md` wired in.

**Bug B, first pass (commit `7db94804`):** reordered the CLI's `runInit` so its marker-mismatch check runs ahead of the scaffold call.

**Bug B, remaining instance (commit `57396128`):** an Opus review validation pass found that `handleConfigInit`'s own equivalent check — on the orphaned-marker code path specifically — still ran *after* scaffolding, the same bug pattern missed in the first pass, in the sibling MCP-native function. Reordered to check first, reusing the already-computed `preExistingMarkerId` rather than re-reading the marker file. The same commit also extended the existing "Opus review SF-4" regression test to assert `fs.readdirSync` is byte-identical before/after a refused init (not just that `writeConfig` was never called), closing the gap that let the first instance of this leak go undetected.

**Commits:**
- `7db94804` — fix(scaffold): align scaffoldGraphDirectory with wizard template routing; fix cli.ts scaffold-then-refuse leak
- `57396128` — fix(review): address opus validation findings — stale dist rebuild, remaining scaffold leak (handleConfigInit), registration-guard gap (see issue-57), cli.ts parity, version sync

## Design Rationale

Full rationale — why the wizard's routing is treated as canonical, and the reasoning that led to catching the second (handleConfigInit) leak instance — is recorded in [ADR-070](../../decisions/ADR-070-scaffold-upgrade-dead-end-connect-unregistered-graph.md), Decision 3.

## Verification

Covered by the expanded regression test suite referenced in ADR-070 (546+ tests passing across `config.test.ts`, `upgrade.test.ts`, and `cli-init-location.test.ts` by the final commit), including the extended byte-identical-directory-listing assertion added in `57396128`.

## See Also

- [ADR-070: Scaffold/Upgrade Dead-End](../../decisions/ADR-070-scaffold-upgrade-dead-end-connect-unregistered-graph.md)
- [issue-57: kg_config_init ↔ kg_upgrade circular dead-end](../issue-57/issue-57-description.md) — related fix on the same branch, distinct root cause
