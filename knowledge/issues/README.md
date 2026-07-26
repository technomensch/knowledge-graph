# Issues

**Navigation**: [Home](../../README.md) > [Getting Started](../../docs/GETTING-STARTED.md) > [Manual Workflows](../../docs/WORKFLOWS.md) > Issues

Tracking of investigated bugs, defects, and meta-issues for this project.

**Total Issues:** 28 numbered issues, plus named meta-issues (see below)
**Last Updated:** 2026-07-18

---

## Named Meta-Issues

- [kg-config-silent-overwrite: `~/.claude/kg-config.json` Silently Overwritten With a Test Fixture](kg-config-silent-overwrite/README.md) — **Status:** 🔴 Investigating — Severity: High. Real KG registrations replaced by a lone `test-kg` fixture entry, silently, root cause unknown; could affect any user of this plugin, not just this machine.
- [chat-extraction-reliability-saga](chat-extraction-reliability-saga/README.md) — **Status:** ✅ Resolved — tracked under umbrella [ENH-038](../enhancements/ENH-038/ENH-038-specification.md)
- [sessionstart-hook-path-saga](sessionstart-hook-path-saga/) — see its own README for status

---

## All Issues (Chronological)

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
- [issue-18: `gov-capture-routing` skill referenced by 8+ commands/agents but not invocable](issue-18/issue-18-description.md) — **Status:** 🟡 OPEN
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
