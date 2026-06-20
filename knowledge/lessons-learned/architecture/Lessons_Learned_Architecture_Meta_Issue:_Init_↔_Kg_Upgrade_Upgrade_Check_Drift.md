---
title: "Meta-Issue: init ↔ kg_upgrade upgrade-check drift"
created: 2026-06-20T16:37:22.249Z
updated: 2026-06-20T18:00:00.000Z
git:
  branch: v0.6.4-fix-upgrade-template-paths
tags: [meta-issue, architectural-gap, init, kg_upgrade, ENH-022, ADR-055, v0.6.4, upgrade-detection, drift]
category: architecture
---
# Meta-Issue: init ↔ kg_upgrade Upgrade-Check Drift

**Type:** meta-issue
**Status:** Partially resolved — upgrade.ts bugs fixed in v0.6.4; init drift remains open
**Discovered:** 2026-06-20
**Related:** ENH-022, ADR-055, v0.6.4 branch

---

## Summary

`/kmgraph:kmg-init` slash command runs parallel bash-based upgrade checks instead of calling the `kg_upgrade` MCP tool. ENH-022 checks (starter-relocation, stray-knowledge-dir, version-update sentinel) are invisible to Claude Code users unless they explicitly invoke `kg_upgrade` directly. The two code paths have drifted and will continue to drift as `kg_upgrade` grows.

---

## Root Cause

The init command was built before `kg_upgrade` existed as a comprehensive upgrade tool. It accumulated its own inline bash checks over time. No protocol exists to keep them in sync.

The underlying `upgrade.ts` also had three independent bugs that compounded the init drift problem:

1. **Wrong required directory name** — `checkDirectories` used `"knowledge"` instead of `"templates"`, causing `kg_upgrade` to create a nonsensical `kgPath/knowledge/` nest.
2. **Template checks targeting live dirs** — `checkTemplates`/`applyTemplates` looked in `decisions/`, `lessons-learned/`, `sessions/` instead of `templates/`; 5 content templates (`architecture.md`, `concepts.md`, etc.) were absent from all mappings and never deployed.
3. **Missing migration checks** — no `applyStarterRelocation` (starters left in old live dirs post-upgrade) and no `applyStrayKnowledgeDir` (project-local KGs had stray `knowledge/` dirs).

A string-spread bug in the `apply` switch (spreading a string instead of an array) was a secondary defect.

---

## Attempt History

| Version | What was tried | Why it failed |
|---|---|---|
| v0.6.2 | Corrected `templateSub/kgSub` mapping from `"knowledge"` → `"concepts"` in upgrade.ts (commit `2cfd3a7c`) after running upgrade against test repo and observing wrong output | Surface fix only; ENH-022 spec not read; deeper bugs (directory name, live-dir targeting, missing checks) remained |
| v0.6.3 | Never committed — same June 17 session; after v0.6.2 merged and upgrade still broken, ENH-022 spec was finally read mid-session (line 3888 of 2026-06-17-claude.md); scope immediately expanded to v0.6.4 | N/A — became v0.6.4 |
| v0.6.4 | Read ENH-022 spec; traced full template deployment flow; found all four root-cause bugs; fixed upgrade.ts; added version-sentinel for Codex/Gemini (ADR-055) | **Fixed.** Template bugs resolved; init drift deferred to follow-on. |

**Note:** v0.6.1 (`fix-recommendation-gate-schema`) was a Stop hook schema fix — unrelated to upgrade template paths. Not an upgrade attempt.

**Pattern:** v0.6.2 patched a visible symptom without reading the ENH-022 spec. The spec was read mid-session after v0.6.2 was already merged and still broken. Reading the spec immediately revealed all four bugs.

---

## Impact

- Claude Code users get incomplete upgrade detection (misses all MCP-tool-only checks)
- Every new `kg_upgrade` check must be duplicated in init's bash script or it won't surface in the wizard
- Testing is harder because two code paths exist for the same domain
- ENH-022 prompts took 4 implementation attempts before the init drift gap was identified

---

## Resolution in v0.6.4

The three `upgrade.ts` root-cause bugs are fixed on branch `v0.6.4-fix-upgrade-template-paths` (commits `7d07ed96`, `3d230b2f`, `91dbdcd6`, `325cc560`). The "wire init → kg_upgrade" decision was **deferred**: instead, ADR-055 added a version-sentinel approach to trigger `kg_upgrade` automatically on Codex and Gemini after install, bypassing the init wizard entirely for those platforms.

The init ↔ kg_upgrade drift gap remains open for Claude Code (Claude Code has a proper hook/wizard path that the sentinel approach doesn't cover).

---

## Proposed Fix (Outstanding)

Wire `/kmgraph:kmg-init` to call `kg_upgrade` (no args) as part of its "See what's new" path, and surface the MCP tool's results directly. Remove or deprecate the parallel bash checks over time. Makes `kg_upgrade` the single source of truth for upgrade detection across all platforms.

---

## Discovery Context

Discovered 2026-06-20 during v0.6.4 testing — 4th attempt at surfacing ENH-022 upgrade prompts to Claude Code users. Each prior attempt added checks to the init command's bash path; none reached users because the MCP tool's checks run in a separate code path that init never invokes.

**Key lesson:** Read the ENH spec before diagnosing upgrade failures. v0.6.2 patched a symptom without reading the spec; reading it mid-session immediately revealed all four root causes.

---

## Follow-Up Actions

- [x] Fix three root-cause bugs in upgrade.ts (done in v0.6.4)
- [x] Decide Codex/Gemini upgrade trigger — version sentinel chosen (ADR-055), deferred init wiring
- [ ] Create ENH tracking the init ↔ kg_upgrade drift gap (or add sub-task to ENH-022)
- [ ] Wire init → kg_upgrade for Claude Code in a follow-on branch
- [ ] Update ADR-055 or create new ADR if the fix introduces a dependency on MCP availability at init time
