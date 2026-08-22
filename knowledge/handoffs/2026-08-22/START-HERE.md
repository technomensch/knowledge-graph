# Start Here — Project Handoff

**Branch:** v0.7.4-bug-fixes
**Commit:** 82ff949c
**Continues from:** [knowledge/sessions/2026-08/2026-08-22-main.md](../../sessions/2026-08/2026-08-22-main.md) (see the newest entry in the Accumulated Narrative — this file also carries an earlier, unrelated `main`-branch session from earlier today)

---

For current state, open issues, and in-progress work: read the session summary linked above.

## Quick orientation for this handoff

This handoff is a same-repo continuation to a new session (`kmg-v0.7.4-session-2`), not new-developer onboarding — DOCUMENTATION-MAP.md and ARCHITECTURE-SNAPSHOT.md were intentionally skipped (generic repo-wide reference material, unchanged from any prior handoff; not worth regenerating for a same-user continuation).

**Working plan:** `knowledge/plans/v0.7.4-tracker-fixes-plan.md` — all 5 tasks (issue-26, issue-30, issue-31, issue-36, issue-55) implemented, individually reviewed, and committed. The whole-branch review (pre-issue-55) is clean and its fix wave landed.

**Genuinely open, per the session summary:**
1. Decide whether to run a second whole-branch review now that Task 5/issue-55 was appended after the first one, or rely on Task 5's own clean task-level review.
2. Create the real GitHub issue for issue-55 (currently `github-issue: "#TBD"` in `knowledge/issues/issue-55/issue-55-description.md`).
3. Deferred lesson capture: fixed-name test fixtures colliding with real, non-sandboxed shared state — second occurrence in this project, after the already-resolved `kg-config-silent-overwrite` issue.
4. Finish the branch — merge locally / push+PR / keep-as-is. Not yet decided.

<!-- kmgraph-handoff-manifest
```json
["knowledge/sessions/2026-08/2026-08-22-main.md"]
```
-->
