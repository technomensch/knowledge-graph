# Solution Approach: Issue-11 — Two causes behind missing ENH GitHub-issue links

## Summary

This issue is primarily a **diagnostic finding**, not a ready-to-implement fix. It
documents two previously-conflated root causes for why most `knowledge/enhancements/`
specs lack a real `github_issue` link:

1. **Cause 1 (already resolved):** a code bug in `start-issue-tracking` (GitHub #124 /
   local `issue-5`, fixed 2026-05-30 on branch `v0.5.9.2-fix-gh-issue-create`) meant
   `gh issue create` was never actually called — only `gh pr create --draft`. Casualties:
   ENH-013 through ENH-022. No further action needed on the tooling itself; already fixed.

2. **Cause 2 (still open):** ENH-024 onward likely bypass `start-issue-tracking` entirely
   via an ad hoc/`superpowers:brainstorming` capture path, which never invokes GH-issue
   creation or the Step 6.4 ROADMAP/CHANGELOG sync gate.

## Decided approach (2026-07-11/12)

A deeper question was raised and resolved before finalizing this approach: should the dual
local taxonomy (`issues/issue-N/` vs `enhancements/ENH-NNN/`) be unified into one scheme,
since GitHub itself only has one Issue object with labels? **Decision: no — keep the dual
taxonomy, do not touch history, fix the actual bypass instead.** Full reasoning in
`issue-11-description.md`'s "Decision" section. Independent second opinion (Claude Fable)
concurred and additionally recommended the gate be structural/scannable rather than
command-flow-only — adopted below.

**The fix is a scan-based structural invariant, not a command-flow gate:**

1. A standalone check (session hook and/or CI-runnable script) scans every folder under
   `knowledge/issues/` and `knowledge/enhancements/` for a populated `github_issue`
   frontmatter field (non-null, non-placeholder). Flags any folder missing one.
2. This check does NOT depend on which command created the folder — it catches
   `kmg-start-issue-tracking` output, `superpowers:brainstorming` bypass output, and any
   future capture path not yet invented, because it inspects the resulting file state, not
   the command that produced it. Reasoning: a gate embedded in one command's flow only
   fires when that exact command runs — exactly what got bypassed here (Cause 2), and
   would be bypassed again by the next lightweight path someone builds.
3. Draft/in-flight specs get an explicit `github_issue: pending` marker so the scan can
   distinguish "legitimately still being drafted" from "should have synced, silently
   didn't" (a leak).
4. The scan must distinguish pre-existing historical gaps (ENH-013 through the point this
   check ships) from new leaks going forward — do not flag the entire existing backlog on
   first run; baseline against the current state at ship time.
5. `ENH-027`'s recall-based parent-linkage fix proceeds independently/unchanged — it solves
   a different problem (KG cross-linking) and is complementary to this scan, not overlapping.

## Out of scope for this issue

- Unifying the issue/enhancement taxonomy — explicitly considered and rejected (see
  Decision section in the description). Not to be revisited here; would need its own
  future ADR/brainstorm if the dual-branching code itself becomes a maintenance burden
  later (per Fable's framing) — not currently the case.
- Retroactive GH issue backfill for ENH-013–022 — deferred to implementation-planning time
  as a scoping call, not decided here.
- Fixing ENH-027 itself — cross-linked, not merged; ENH-027's own scope (KG linkage) is
  unchanged by this issue.
- Actually implementing the scan mechanism — this issue documents the decided approach;
  implementation is planned separately (see the spec this feeds into).
