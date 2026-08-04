# Issues

**Navigation**: [Home](../../README.md) > [Getting Started](../../docs/GETTING-STARTED.md) > [Manual Workflows](../../docs/WORKFLOWS.md) > Issues

Tracking of investigated bugs, defects, and meta-issues for this project.

**Total Issues:** 36 numbered issues, plus named meta-issues (see below)
**Last Updated:** 2026-08-04

---

## Named Meta-Issues

- [kg-config-silent-overwrite: `~/.claude/kg-config.json` Silently Overwritten With a Test Fixture](kg-config-silent-overwrite/README.md) — **Status:** 🔴 Investigating — Severity: High. Real KG registrations replaced by a lone `test-kg` fixture entry, silently, root cause unknown; could affect any user of this plugin, not just this machine.
- [chat-extraction-reliability-saga](chat-extraction-reliability-saga/README.md) — **Status:** ✅ Resolved — tracked under umbrella [ENH-038](../enhancements/ENH-038/ENH-038-specification.md)
- [sessionstart-hook-path-saga](sessionstart-hook-path-saga/) — see its own README for status

---

## All Issues (Chronological)

- [issue-40: Capture-level flag naming/targeting consistency across commands+agents (`--named` vs `--project` vs `--graph`)](issue-40/issue-40-description.md) — **Status:** 🟡 OPEN — found during ADR-067 Phase 7.1 verification, split out from [issue-18](issue-18/issue-18-description.md)
- [issue-39: `kg_capture` Prepends a Second, Differently-Shaped Frontmatter Block When Updating a File via `existingFile`](issue-39/issue-39-description.md) — **Status:** 🟡 Deferred — `kg_capture` called with `metadata.existingFile` pointing at an existing session-summary file prepends a second, differently-shaped frontmatter block instead of merging into the existing one.
- [issue-38: Multiple `tests/` Suites Reference Pre-`kmg-`-Prefix Command/Skill Names — Silently Broken Since the Rename Migration](issue-38/issue-38-description.md) — **Status:** 🟡 Deferred — Several suites under `tests/` assert against command/skill filenames using the naming convention that predates the `kmg-` prefix rename, so they've been silently broken since the rename migration.
- [issue-35: `kg_search`/FTS5's `"knowledge"` Directory Entry Is a Dead Pre-Migration Path Literal — Recurrence of issue-31's Pattern](issue-35/issue-35-description.md) — **Status:** ✅ Fixed — Found 2026-07-30 in the same code read that surfaced issue-34; a dead pre-migration path literal in the FTS5 index config, same pattern as issue-31.
- [issue-34: `kg_search`/FTS5 Index Never Cover `knowledge/issues/` or `knowledge/enhancements/`](issue-34/issue-34-description.md) — **Status:** ✅ Fixed — Found 2026-07-30 while validating whether `kmg-auto-recall`/`kg_search` can surface prior issues and enhancements for a candidate meta-issue attempt-loop prompt (ENH-056); confirmed live that the FTS5 index never covered those directories.
- [issue-33: Handoff/Recall Commands Don't Require Tracing Linked Files — Sessions Read Only the Pointer Layer](issue-33/issue-33-description.md) — **Status:** 🟡 Deferred — Observed live 2026-07-29 in a `docs-readme-poc` handoff/recall flow: the session read only the top-level package files and never traced back into the linked source files the package pointed to.
- [issue-31: `kmg-handoff` Writes to Stale Pre-Migration Path `./handoff-packages/` Instead of `knowledge/handoffs/`](issue-31/issue-31-description.md) — **Status:** 🟡 Tracked — `commands/kmg-handoff.md` Step 1 hardcodes its default output directory as the stale pre-migration `./handoff-packages/` path instead of `knowledge/handoffs/`.
- [issue-30: `kmg-handoff` and `kmg-session-wrap` only reference session-summary — neither generates one](issue-30/issue-30-description.md) — **Status:** 🟡 Deferred (Track only) — found live running `/kmgraph:kmg-handoff` with no session summary for the day; `kmg-handoff`'s own package is incomplete without one by its own stated purpose
- [issue-29: `/kmgraph:kmg-extract-chat` bleeds cross-project content into `knowledge/chat-history/` (no default project scoping)](issue-29/issue-29-description.md) — **Status:** 🟡 Tracked (GitHub #197) — found live while working on [ADR-067](../decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md); same root failure class (cross-project KG bleed), different surface; historical archive contamination confirmed across 42 of 118 chat-history files, Feb–Jul 2026 — cleanup tracked as separate required follow-up
- [issue-28: No Dev-Loop Mechanism Between a Locally Rebuilt `mcp-server/dist/` and Live `kg_*` Tool Calls](issue-28/issue-28-description.md) — **Status:** 🟡 Deferred (Track only) — found live while verifying [issue-27](issue-27/issue-27-description.md)'s fix; companion lesson: [Lessons_Learned_Debugging_MCP_Server_Rebuild_Not_Reflected_In_Live_Plugin_Tool_Calls](../lessons-learned/debugging/Lessons_Learned_Debugging_MCP_Server_Rebuild_Not_Reflected_In_Live_Plugin_Tool_Calls.md)
- [issue-27: applyStrayKnowledgeDir Silently Overwrote Real KG Content — Actually Happened, Not Hypothetical](issue-27/issue-27-description.md) — **Status:** ✅ Resolved — same session, found live, fixed same day, regression test added
- [issue-26: `commands/kmg-start-issue-tracking.md` References `docs/issue-tracker.md`, Which Does Not Exist](issue-26/issue-26-description.md) — **Status:** 🟡 Deferred (Track only) — same pattern as [issue-13](issue-13/issue-13-description.md), different surface
- [issue-25: No Documented Authority for ENH-Spec vs. Issue-Tracking-Workflow (Enhancement Scope Overlap)](issue-25/issue-25-description.md) — **Status:** 🟡 Deferred (Track only) — surfaced while filing [ENH-051](../enhancements/ENH-051/ENH-051-specification.md)
- [issue-24: `kg_capture` produces a malformed double-frontmatter file when content already includes its own YAML frontmatter](issue-24/issue-24-description.md) — **Status:** 🟡 Deferred (Track only)
- [issue-23: `kg_config_switch` reports false success while leaving the config file completely unchanged](issue-23/issue-23-description.md) — **Status:** 🟡 Deferred (Track only)
- [issue-22: Init wizard's "selective" git strategy is misleading about what it actually excludes](issue-22/issue-22-description.md) — **Status:** 🟡 Deferred (Track only)
- [issue-21: Stop hook fails with "invalid stop hook JSON output" during Codex CLI init](issue-21/issue-21-description.md) — **Status:** 🟡 Deferred (Track only)
- [issue-20: Session skipped its own Bug/Enhancement Triage rule for 4 filings](issue-20/issue-20-description.md) — **Status:** 🟡 OPEN
- [issue-19: No hook-level enforcement for issue-creation discipline (prior-art check, provenance docs)](issue-19/issue-19-description.md) — **Status:** 🟡 OPEN
- [issue-18: `gov-capture-routing` skill referenced by 8+ commands/agents but not invocable](issue-18/issue-18-description.md) — **Status:** ✅ Resolved — Phase 7.1 landed 2026-08-03; follow-up naming question split into [issue-40](issue-40/issue-40-description.md)
- [issue-17: No recall trigger when the assistant itself needs clarification mid-task](issue-17/issue-17-description.md) — **Status:** 🟡 OPEN
- [issue-16: mcp-server kg_version / MCP handshake reports stale hardcoded 0.3.10](issue-16/issue-16-description.md) — **Status:** ✅ Fixed
- [issue-15: Personal-KG FTS5 search index built in the wrong bucket — `rebuildIndex` never receives `kgType`](issue-15/issue-15-description.md) — **Status:** 🟡 Tracked
- [issue-14: kg-config.json write-path split-brain — 37 files still hardcode the pre-migration `~/.claude/kg-config.json` path](issue-14/issue-14-description.md) — **Status:** ✅ Resolved
- [issue-13: No automated broken-link detection anywhere in the docs pipeline](issue-13/issue-13-description.md) — **Status:** 🟡 Deferred (Track only)
- [issue-12: `kmg-execute-plan` fires in Claude Code sessions despite being a Gemini/Antigravity-only guardrail](issue-12/issue-12-description.md) — **Status:** 🟡 Tracked
- [issue-11: Two distinct, undiagnosed causes behind ENH specs missing a real GitHub issue link](issue-11/issue-11-description.md) — **Status:** 🟡 Tracked
- [issue-10: kg_capture KG_MISMATCH false positive when KG path doesn't end in /docs](issue-10/issue-10-description.md) — **Status:** ✅ Resolved
- [issue-9: Issue-9: Inline Recommendation Protocol Gap](issue-9/issue-9-description.md) — **Status:** (status not set) — graduated to [ADR-049](../decisions/ADR-049-review-audit-protocol-post-plan-pre-push-review-governance.md), [ADR-043](../decisions/ADR-043-pretooluse-hook-injection-superpowers-rule-enforcement.md), [ENH-021](../enhancements/ENH-021/ENH-021-specification.md)
- [issue-8: Issue-8: Docs Update Enforcement 3-Gate Fix](issue-8/issue-8-description.md) — **Status:** (status not set) — graduated to [ADR-013](../decisions/ADR-013-documentation-update-protocol.md), [ADR-021](../decisions/ADR-021-single-source-of-truth-dry-documentation.md), [ADR-036](../decisions/ADR-036-docs-impact-scan.md), [ENH-015](../enhancements/ENH-015/ENH-015-specification.md)
- [issue-7: Issue-7: Bash Permission Prompt Provides No Context — Indistinguishable from Review Audit HALT](issue-7/issue-7-description.md) — **Status:** (status not set) — graduated to [ADR-049](../decisions/ADR-049-review-audit-protocol-post-plan-pre-push-review-governance.md), [ENH-020](../enhancements/ENH-020/ENH-020-specification.md)
- [issue-6: Issue-6: Post-Plan Validation Checklist Not Enforced — Advisory-Only Hook, Static Stub](issue-6/issue-6-description.md) — **Status:** (status not set) — graduated to [ADR-043](../decisions/ADR-043-pretooluse-hook-injection-superpowers-rule-enforcement.md), [ADR-049](../decisions/ADR-049-review-audit-protocol-post-plan-pre-push-review-governance.md), [ENH-015](../enhancements/ENH-015/ENH-015-specification.md)
- [issue-5: Issue-5: `start-issue-tracking` Never Calls `gh issue create`](issue-5/issue-5-description.md) — **Status:** (status not set) — graduated to [ADR-024](../decisions/ADR-024-decouple-issue-tracking-decisions-sequential-prompts.md), [ENH-017](../enhancements/ENH-017/ENH-017-specification.md)
- [issue-4: Issue-4: Stop Hook /tmp Flag Accumulates Per-Subprocess Instead of Per-Session](issue-4/issue-4-description.md) — **Status:** (status not set) — graduated to [ADR-020](../decisions/ADR-020-lifecycle-hooks-suite-automated-capture.md)
- [issue-3: issue-3: update-issue-plan — enforce version sync after CHANGELOG entry](issue-3/issue-3-description.md) — **Status:** (status not set) — graduated to [ENH-004](../enhancements/ENH-004/ENH-004-specification.md)
- [issue-2: issue-2: start-issue-tracking — Git steps must be conditional on repo presence](issue-2/issue-2-description.md) — **Status:** (status not set) — graduated to [ENH-004](../enhancements/ENH-004/ENH-004-specification.md)
- [issue-1: Meta-Issue: v0.2.1 Backlog](issue-1/issue-1-description.md) — **Status:** 🟡 OPEN — work items deferred from v0.2.0-beta (no confirmed ENH/ADR graduation found)

> Note: issue-2 through issue-9 predate a consistent `**Status:**` field in their description files — shown as "(status not set)" above. Backfilling those is a small follow-up, not part of this task (avoid inventing a status not present in the source file).

---

## See Also

- [Enhancements Index](../enhancements/README.md)
- [Decisions Index](../decisions/README.md)
