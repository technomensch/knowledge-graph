# ENH-065: Test Cases / Acceptance Criteria

**Status:** Draft. Written at filing time as a shape for the eventual work. Refine after the [Decisions Needed](ENH-065-specification.md#decisions-needed) are answered; several cases below depend on which policy is chosen.

## Baseline measurements (reproduce before and after)

Run from the repo root. Expected values are from 2026-10-16 and will change as the repo grows.

1. **Single-file issue count.**
   ```bash
   for d in knowledge/issues/issue-*/; do [ "$(ls -p "$d" | grep -vc /)" -eq 1 ] && echo "$d"; done | wc -l
   ```
   Baseline: 32 of 60. Target after backfill or reclassification: depends on Decision 6.

2. **Single-file enhancement count.**
   ```bash
   for d in knowledge/enhancements/ENH-*/; do [ "$(ls -p "$d" | grep -vc /)" -eq 1 ] && echo "$d"; done | wc -l
   ```
   Baseline: 37 of 58.

3. **Done-like docs that are single-file.** Baseline: 21 of 47 issues, 20 of 36 enhancements (`resolved` or `implemented`).

## Functional cases (apply once the corresponding option is chosen)

### Generator (Option B)

4. Running `/kmgraph:kmg-start-issue-tracking` for a new issue creates `issue-N-description.md` plus the other three files from templates, in `knowledge/issues/issue-N/`, not only the directory.
5. The same for an enhancement: `ENH-NNN-specification.md`, `solution-approach.md`, `test-cases.md`, `progress-log.md`.
6. Templates exist at the paths the command copies from; deleting a template produces a clear error, not an empty file.
7. A Mode 3 (track only) run produces the folder state the chosen policy specifies for deferred items (full set, or main file only with the others created on first status change).

### Workflow field (Option C)

8. A new doc carries the workflow-path field (or the chosen equivalent) with a valid value.
9. A doc without the field is treated per the documented default and is not reported as an error by the audit.

### Completeness check (Option D)

10. **Positive:** a done-like doc whose folder meets the policy produces no finding.
11. **Negative — the regression case from this ENH:** create a scratch issue with `status: deferred` and one file, commit it, then in a second commit change only the frontmatter to `status: resolved`. The check must fire on the second commit's branch state, even though the diff contains no supporting-file change.
12. **Lightweight exemption:** a doc marked lightweight (per Decision 3) with one file and a Resolution section does not fire, if policy option (c) from Decision 1 is chosen.
13. **Stub guard:** a folder that contains four empty or heading-only files does not pass (if the stub-inflation mitigation is adopted).
14. **Advisory behavior:** the check never changes the gate's exit code from 0 unless the owner explicitly chose a blocking check (ADR-050 default).
15. **Scope:** the check reads only issue and enhancement folders touched on the branch and does not scan `knowledge/plans/` or `.jsonl` history (project search-scope restriction).
16. **Consumer repos:** if the check is meant to protect consumer knowledge graphs, it is delivered through a shipped skill or `kg_upgrade`, and a test run against a minimal scaffolded graph produces the finding. If it lives only in `pre-push-gate.sh`, the doc states that it is dev-repo-only.

### Backfill (Option E)

17. Each backfilled file cites its sources (commit hashes, chat-history files, session summaries); none contains invented detail.
18. A backfilled doc's `status` and other frontmatter are not changed by the backfill itself.
19. Already-populated folders are not overwritten (reuse ENH-062's skip / auto-backfill / prompt-to-rescan outcomes).

## Documentation cases

20. `commands/kmg-start-issue-tracking.md` no longer lists the supporting files only in comments; its File Naming Conventions section matches what Step 3 actually does.
21. `docs/reference/command-guide.md` describes the final behavior in third-person language.
22. `knowledge/issues/README.md` and `knowledge/enhancements/README.md` state the single-file convention and which path produces it.
23. ADR-068 is amended (or superseded) so Half A states the resolution requirement; `knowledge/decisions/README.md` index count updated.
24. `npm run build` exits 0 with zero broken links or anchors (hard-fail settings are on as of v0.7.10).

## Out of scope

- Redesigning the `status` enum (ENH-062).
- Meta-issue attempts drift (issue-60, ADR-072).
- Handoff and recall file tracing (ENH-056).
