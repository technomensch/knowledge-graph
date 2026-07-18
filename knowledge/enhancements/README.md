# Enhancements (ENH)

**Navigation**: [Home](../../README.md) > [Getting Started](../../docs/GETTING-STARTED.md) > [Manual Workflows](../../docs/WORKFLOWS.md) > Enhancements

Formal tracking of proposed and resolved enhancements for this project.

**Total ENHs:** 46
**Last Updated:** 2026-07-18

---

## Open ENHs

- [ENH-041: Broken nav breadcrumb (GETTING-STARTED.md / WORKFLOWS.md) baked into every index README scaffold](ENH-041/ENH-041-specification.md) — **Status:** 🟡 Proposed
- [ENH-040: Remove chat-history/*.md from kg_search / kg_fts5_rebuild indexing scope](ENH-040/ENH-040-specification.md) — **Status:** 🟡 Proposed — Governed by [ADR-060](../decisions/ADR-060-narrow-kg-search-scope-away-from-raw-chat-history.md)
- [ENH-039: Rule-injection scripts hardcode personal split-file names instead of discovering them](ENH-039/ENH-039-specification.md) — **Status:** 🟡 Proposed
- [ENH-037: README indexes for enhancements/ and issues/, cross-referenced with decisions/](ENH-037/ENH-037-specification.md) — **Status:** 🟡 Proposed
- [ENH-035: Chat-history-to-KG backfill extractor (standalone)](ENH-035/ENH-035-specification.md) — **Status:** 🟡 Proposed — Governed by [ADR-058](../decisions/ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings.md)
- [ENH-034: Capture-pipeline command naming and grouping](ENH-034/ENH-034-specification.md) — **Status:** 🟡 Proposed — Governed by [ADR-058](../decisions/ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings.md)
- [ENH-033: Repo-context auto-detection for `kmg-update-doc` / `kmg-create-doc`](ENH-033/ENH-033-specification.md) — **Status:** 🟡 Proposed — Governed by [ADR-056](../decisions/ADR-056-reject-plugin-split-for-contributor-only-doc-commands.md)
- [ENH-030: KG Remove / Unregister Command](ENH-030/ENH-030-specification.md) — **Status:** 🟡 Proposed

---

## All ENHs (Chronological)

- [ENH-052: No pre-PR consistency check for the knowledge graph's own internal paperwork (README indexes, status frontmatter, backlinks, changelog/summary currency)](ENH-052/ENH-052-specification.md) — **Status:** 🟡 Deferred (Track only) — same underlying pattern as [issue-13](../issues/issue-13/issue-13-description.md), [ENH-042](ENH-042/ENH-042-specification.md), [issue-26](../issues/issue-26/issue-26-description.md)
- [ENH-051: Stop Hand-Duplicating KG Path Logic Between cli.ts and kmg-init.md](ENH-051/ENH-051-specification.md) — **Status:** 🟡 Deferred (Track only) — Governed by [ADR-066](../decisions/ADR-066-kg-content-storage-location-for-global-and-cowork-modes.md), [ADR-067](../decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md)
- [ENH-041: Broken nav breadcrumb (GETTING-STARTED.md / WORKFLOWS.md) baked into every index README scaffold](ENH-041/ENH-041-specification.md) — **Status:** 🟡 Proposed
- [ENH-040: Remove chat-history/*.md from kg_search / kg_fts5_rebuild indexing scope](ENH-040/ENH-040-specification.md) — **Status:** 🟡 Proposed — Governed by [ADR-060](../decisions/ADR-060-narrow-kg-search-scope-away-from-raw-chat-history.md)
- [ENH-039: Rule-injection scripts hardcode personal split-file names instead of discovering them](ENH-039/ENH-039-specification.md) — **Status:** 🟡 Proposed
- [ENH-038: Extract-chat-history reliability (umbrella)](ENH-038/ENH-038-specification.md) — **Status:** ✅ Resolved in v0.6.17 — consolidates the former ENH-043/044/045/046/047, all 6 tracked bugs fixed; full detail in [chat-extraction-reliability-saga](../issues/chat-extraction-reliability-saga/README.md)
- [ENH-037: README indexes for enhancements/ and issues/, cross-referenced with decisions/](ENH-037/ENH-037-specification.md) — **Status:** 🟡 Proposed
- [ENH-036: `kmg-capture-router` as the sole detection engine — 5 detection skills consolidated to 2](ENH-036/ENH-036-specification.md) — **Status:** ⚪ Withdrawn — Governed by [ADR-057](../decisions/ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md), [ADR-058](../decisions/ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings.md)
- [ENH-035: Chat-history-to-KG backfill extractor (standalone)](ENH-035/ENH-035-specification.md) — **Status:** 🟡 Proposed — Governed by [ADR-058](../decisions/ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings.md)
- [ENH-034: Capture-pipeline command naming and grouping](ENH-034/ENH-034-specification.md) — **Status:** 🟡 Proposed — Governed by [ADR-058](../decisions/ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings.md)
- [ENH-033: Repo-context auto-detection for `kmg-update-doc` / `kmg-create-doc`](ENH-033/ENH-033-specification.md) — **Status:** 🟡 Proposed — Governed by [ADR-056](../decisions/ADR-056-reject-plugin-split-for-contributor-only-doc-commands.md)
- [ENH-032: Knowledge-Extractor Approval Gate Blocks Coordinator Relay](ENH-032/ENH-032-specification.md) — **Status:** ✅ Resolved in v0.6.15
- [ENH-031: Init Completeness — Backfill, triggers.md, and CLAUDE.md Gaps](ENH-031/ENH-031-specification.md) — **Status:** ✅ Resolved in v0.6.15
- [ENH-030: KG Remove / Unregister Command](ENH-030/ENH-030-specification.md) — **Status:** 🟡 Proposed
- [ENH-029: Upgrade Inspector Preview Correctness](ENH-029/ENH-029-specification.md) — **Status:** ✅ Resolved in v0.6.7
- [ENH-028: Mandatory STOP Gate for Existing-KG Branch in kmg-init](ENH-028/ENH-028-specification.md) — **Status:** ✅ Resolved in v0.6.6
- [ENH-027: Superpowers Brainstorming Spec → KG Linkage](ENH-027/ENH-027-specification.md) — **Status:** Proposed
- [ENH-026: KG Write Guard — Unguarded Command Class](ENH-026/ENH-026-specification.md) — **Status:** Proposed
- [ENH-025: Cross-Platform Knowledge Extractor (Backfill from Chat History)](ENH-025/ENH-025-specification.md) — **Status:** (status not set)
- [ENH-024: Add Codex CLI Chat History Extraction Support](ENH-024/ENH-024-specification.md) — **Status:** (status not set)
- [ENH-023: Extend pre-skill-rules-inject.sh to Cover Official Marketplace Skills](ENH-023/ENH-023-specification.md) — **Status:** (status not set)
- [ENH-022: Template Directory Disambiguation](ENH-022/ENH-022-specification.md) — **Status:** Proposed — brainstorm complete 2026-06-12, ready for implementation plan
- [ENH-021: Session Summary + Handoff Asymmetric Coupling via `continues_from`](ENH-021/ENH-021-specification.md) — **Status:** (status not set)
- [ENH-020: Preventive Cascade Template + Profile Ecosystem Docs](ENH-020/ENH-020-specification.md) — **Status:** (status not set)
- [ENH-019: kmgraph Usage Analytics & Stats Dashboard](ENH-019/ENH-019-specification.md) — **Status:** (status not set)
- [ENH-018: Rules File H2 Structure Hardening](ENH-018/ENH-018-specification.md) — **Status:** (status not set)
- [ENH-017: Improve start-issue-tracking Step 1.2 Version Impact UX](ENH-017/ENH-017-specification.md) — **Status:** (status not set)
- [ENH-016: Rules File Auto-Split Recommendation](ENH-016/ENH-016-specification.md) — **Status:** (status not set)
- [ENH-015: Decision Governance Protocol](ENH-015/ENH-015-specification.md) — **Status:** Deferred
- [ENH-014: Audit and fix MEMORY.md cascade](ENH-014/ENH-014-specification.md) — **Status:** (status not set)
- [ENH-013: Rename kg-recall Skill to Reduce Slash Command UI Confusion](ENH-013/ENH-013-specification.md) — **Status:** (status not set)
- [ENH-012: Rules and Identity File Hardening — Platform Split for Tool Directives](ENH-012/ENH-012-specification.md) — **Status:** (status not set)
- [ENH-011: Duplicate Check in capture-lesson Before Creating New Entry](ENH-011/ENH-011-specification.md) — **Status:** (status not set)
- [ENH-010: v0.3.0-beta — Default KG Path Change, Migration Step, and me.md/rules.md Scaffold](ENH-010/ENH-010-specification.md) — **Status:** (status not set)
- [ENH-009: start-issue-tracking — mode gate + pre-flight working-tree check](ENH-009/ENH-009-specification.md) — **Status:** (status not set)
- [ENH-008: capture-router Skill](ENH-008/ENH-008-specification.md) — **Status:** (status not set)
- [ENH-006: Sequential Prompts, Decoupled Decisions, and Skill Trigger Gaps](ENH-006/ENH-006-specification.md) — **Status:** (status not set)
- [ENH-005: FTS5 Database Relocation to User-Level Cache](ENH-005/ENH-005-specification.md) — **Status:** (status not set)
- [ENH-004: session-summary — Optional context-mode Event DB Integration](ENH-004/ENH-004-specification.md) — **Status:** 🔴 PROPOSED
- [ENH-003: doc-update-router — Extensible Routing Skill for Doc Updates](ENH-003/ENH-003-specification.md) — **Status:** 🔴 PROPOSED
- [ENH-002: Session Snapshot on Capture](ENH-002/ENH-002-specification.md) — **Status:** (status not set)
- [ENH-001: User-Level Global Knowledge Graphs](ENH-001/ENH-001-specification.md) — **Status:** (status not set)

---

## ENH Statuses

- **🟡 Proposed:** Under consideration, not yet implemented
- **✅ Resolved:** Implemented and shipped
- **⚪ Withdrawn:** Superseded or no longer applicable

---

## See Also

- [Decisions Index](../decisions/README.md)
- [Issues Index](../issues/README.md)
