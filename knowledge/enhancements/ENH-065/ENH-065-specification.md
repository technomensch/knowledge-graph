---
id: ENH-065
type: Enhancement
status: deferred
status_category: backlog
github_issue: "#262"
branch: none
created: 2026-10-16
related_issues: ["[[issue-25-description|issue-25]]", "[[issue-30-description|issue-30]]", "[[issue-33-description|issue-33]]", "[[issue-60-description|issue-60]]", "[[issue-61-description|issue-61]]"]
related_enhs: ["[[ENH-051-specification|ENH-051]]", "[[ENH-052-specification|ENH-052]]", "[[ENH-056-specification|ENH-056]]", "[[ENH-062-specification|ENH-062]]", "[[ENH-063-specification|ENH-063]]"]
related_adrs: ["[[ADR-043-pretooluse-hook-injection-superpowers-rule-enforcement|ADR-043]]", "[[ADR-050-pre-push-composite-gate-inline-recommendation-gate|ADR-050]]", "[[ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check|ADR-068]]", "[[ADR-072-meta-issue-tracking-pattern|ADR-072]]"]
---

# ENH-065: Issue and enhancement folders routinely fall short of the documented template; nothing generates the supporting files or checks them at resolution

**Local ID:** ENH-065 | **GitHub Issue:** [#262](https://github.com/technomensch/knowledge-graph/issues/262) (filed via `/kmgraph:kmg-start-issue-tracking`, Mode 3, track only, silent)

**Status:** 🟡 Deferred — decisions needed before implementation (see [Decisions Needed](#decisions-needed))
**Discovered:** 2026-10-16
**Governed by:** [ADR-068](../../decisions/ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md) Half A (lightweight-vs-full rule) is the nearest existing governance; this ENH proposes to extend it, which would need an ADR amendment or a new ADR. ADR-058's naming/scope check applies if a new command or skill is introduced.
**Classification note:** filed as an enhancement, not an issue. Nothing is broken: the commands do what they say. The gap is a missing capability (a generator and a completeness check) plus an unresolved policy question (when is a single file acceptable?).

## Summary

`commands/kmg-start-issue-tracking.md` documents a four-file layout for every issue and enhancement folder. In practice, 32 of 60 issue folders and 37 of 58 enhancement folders contain only the main description or specification file. Many of those are marked `resolved` or `implemented`. The reader opening such a folder finds a status claiming completion with no solution record, no test record, and no work log.

The root cause is not one mistake. Three mechanisms compound: (1) the command describes the supporting files in shell comments but no step creates them, and no file templates exist; (2) a "lightweight" single-file shortcut was adopted in July 2026 and formalized by ADR-068 without defining what must happen when a lightweight doc later becomes resolved; and (3) no gate or audit step checks folder completeness when `status` flips to `resolved`. The sections below record the measurements and the evidence trail so a later session does not have to re-derive them.

## Problem

### What the template says

`commands/kmg-start-issue-tracking.md`, Step 3 and "File Naming Conventions":

- **Issues** (`knowledge/issues/issue-N/`): `issue-N-description.md`, `solution-approach.md`, `test-cases.md`, `implementation-log.md`.
- **Enhancements** (`knowledge/enhancements/ENH-NNN/`): `ENH-NNN-specification.md`, `solution-approach.md`, `test-cases.md`, `progress-log.md`.

### What exists (measured 2026-10-16, `ls` on `knowledge/issues` and `knowledge/enhancements`)

| Area | Folders | 1 file | 2 files | 3 files | 4 files |
|---|---|---|---|---|---|
| Issues | 60 | 32 | 10 | 3 | 15 |
| Enhancements | 58 | 37 | 6 | 2 | 13 |

Single-file folders by status:

- **Issues (32):** 21 `resolved`, 6 `deferred`, 4 `open`, 1 `in-progress`.
- **Enhancements (37):** 11 `implemented`, 9 `resolved`, 15 `proposed`, 1 `deferred`, 1 `withdrawn`.

Of the 47 issues with a done-like status (`resolved`, `implemented`), 21 are single-file. Of the 36 enhancements with a done-like status, 20 are single-file.

Single-file `resolved` issues: 1, 4, 6, 15, 16, 18, 23, 24, 30, 32, 34, 35, 36, 37, 38, 39, 53, 55, 56, 57, 58.

Enhancement folders are mostly 4-file for the earliest items (ENH 001 to ENH 010) and mostly 1-file from ENH 011 onward. Issues follow a similar curve: full folders cluster at issue 7 to issue 9, issue 14, issue-25 to issue 29, and issue 42 to issue 48, with single files dominating the stretches between.

### Where the single-file `resolved` issues came from

Born-status of 21 single-file resolved issues, from the first commit that added each description file (`git show <first-commit>:<path>`):

- `deferred` at birth: issues 4, 23, 24, 30, 34, 35, 37, 38, 39, 53 (10)
- `tracked` at birth: issues 6, 15, 32, 36, 56 (5)
- `implemented` at birth: issues 57, 58 (2)
- `open` at birth: issues 1, 18 (2)
- `fixed` at birth: issue 16 (1)
- `resolved` at birth: issue 55 (1; a single file created with its fix, with branch `v0.7.4-bug-fixes` and GitHub #242, so not a deferred stub)

Roughly two thirds began as small deferred or tracked items and later had their `status:` frontmatter edited to `resolved` without the folder growing.

## Root Cause Analysis

Method: measurement of the repo, `git log -S` archaeology on the command file, and a read-only search of the extracted chat history (`knowledge/chat-history/`), ADRs, ENHs, and lessons. Items marked **(V)** were verified directly; **(I)** are inferences.

### Finding 1 — The command describes the files but never creates them (V)

- Step 3.1 and 3.2 run only `mkdir -p`. The supporting files appear in bash comments: `# Issue will contain: ... solution-approach.md (proposed fixes) ...`.
- Step 4 generates an implementation plan template, not the supporting docs.
- `core/default-templates/issues/` and `core/default-templates/enhancements/` contain only `README.md`. No file templates exist for `solution-approach.md`, `test-cases.md`, `implementation-log.md`, or `progress-log.md`.
- The layout has been in the command since its first commit, `4641faab` (2026-02-17, "feat(v0.0.5-alpha): validation fixes + start-issue-tracking command"). It was never turned into a generator.
- The earliest `solution-approach.md` files in the repo are hand-written: ENH 001 (2026-04-11), ENH 020 and issue 7 (2026-05-28), issue 5 (2026-05-30), each arriving in a docs or tracking commit.
- (I) The layout appears to have been ported from the author's earlier `optimize-my-resume` project. `knowledge/chat-history/2026-02/2026-02-17-claude.md` shows the "Remove project-specific references (docs/issues/... optimize-my-resume paths)" cleanup on the day the command was written.
- Consequence: whether the supporting files exist depends entirely on a model following prose. This repo's own ADR-043 and ADR-050 record that prose-only enforcement was unreliable twice and had to be replaced with deterministic hooks.

### Finding 2 — The lightweight path became the default without a completion rule (V)

- **2026-07-28** (`knowledge/chat-history/2026-07-28/2026-07-28-claude-part-01.md`): an assistant wrote issue-30 as one file and stated, "No — I deliberately did the lightweight path, not the full `kmg-start-issue-tracking` workflow." It added that no documented rule existed, so "every session makes its own judgment call" (this is issue-25).
- **2026-08-01** (`knowledge/chat-history/2026-08-01/2026-08-01-claude-part-01.md`): the assistant observed that issue-30, ENH 053/054/055, and issue-33 "were explicitly captured as 'small, deferred, write it down'... That's already the de facto rule; it just isn't documented." This became ADR-068 Half A.
- **ADR-068 Half A** defines the lightweight path as: no branch, no GitHub issue; use it when no code change is planned, no outside visibility is needed, and the write-up fits "a paragraph or two"; use the full workflow when code will change, outside visibility is needed, or the write-up "would need to sprawl across multiple files anyway." It says nothing about (a) whether supporting files are optional on the lightweight path, or (b) what must happen when a lightweight doc is later resolved. The phrase "no branch, no GitHub issue" was read by later sessions as "single file."
- **2026-08-18** (`knowledge/chat-history/2026-08/2026-08-18-claude.md`, line ~928): for issues 49 to 51: "Each dir has exactly one file... No solution-approach/implementation-log/test-cases files yet." The word "yet" shows the gap was seen and treated as normal.
- **2026-08-24** (`knowledge/chat-history/2026-08/2026-08-24-claude.md`, line 123): "Lean single-file docs, no solution-approach.md/test-cases.md/implementation-log.md — recent precedent (issue 53 through issue 56) has moved to a single issue-N-description.md file rather than the command's older 4-file template." This is an assistant decision justified by precedent, applied to issue 57 and issue 58, and it calls the command's own template "older."
- No user instruction was found that says supporting files are unnecessary. Precedent drift is self-reinforcing: each session cites the previous session's single-file output as the live convention.

### Finding 3 — Nothing checks folder completeness when status flips to resolved (V)

- `commands/kmg-start-issue-tracking.md` Step 7 sets `status` only (`tracked-not-implemented`, `implemented`, `deferred`). It does not check or backfill supporting files on any later transition.
- `skills/kmg-paperwork-audit/SKILL.md` Step 2 checks `status: resolved` docs for *supporting evidence in the branch diff* (a matching file change, a test, a verification note). It does not check that `solution-approach.md`, `test-cases.md`, or a log exists. Step 5 checks attempt folders against log headers, for meta-issues only.
- `scripts/pre-push-gate.sh` Gate 5 checks index counts and backlink symmetry; no gate inspects issue or ENH folder contents.
- ADR-068 Half B / ENH-056 is a command-completion check piloted on handoff and recall file tracing. It is not a status-flip backfill gate. Its own text depends on issue-25's rule so it can tell "legitimately lightweight" from "silently abbreviated," and that distinction is not recorded anywhere in a doc.
- Sampled resolutions confirm the mechanism:
  - **issue 15:** created 2026-07-16 in `b2645ca3`; marked resolved 2026-08-03 in `cfbbd762` ("mark resolved — PR #203 merged, GH #172 already closed"), a frontmatter edit. No supporting docs added or mentioned.
  - **issue 34:** created 2026-08-01 in `a0baa67a` (the ADR-068 commit); marked resolved the same day in `c3081d5a`. Later commits were backlink and GitHub-link housekeeping only.
  - **issue 55:** created in `3274ff89` (2026-08-22) with its fix on branch `v0.7.4-bug-fixes`; never expanded.

### Finding 4 — Prior recognition, but not of this exact gap (V)

- **issue-25** names the ambiguity between the lightweight file and the full workflow.
- **ENH-051** was filed lightweight, then redone through the full workflow after the user caught it (ADR-068, problem statement).
- The 2026-07-28 session tied the pattern to the ADR-043/050/ENH-052 lesson: multi-step prose in a markdown command is not reliably followed, and a deterministic hook is what worked.
- `knowledge/chat-history/2026-07/2026-07-12-claude.md` (lines ~83 and ~4040) warns that a gate placed inside the command flow gets bypassed by the next lightweight path.
- A search for "missing solution-approach", "incomplete folder", and similar found nothing that treats a single-file folder being marked resolved as a defect in its own right.

### Ranked root causes

1. **High (~80%):** the command documents the supporting files in comments only; nothing generates or enforces them, so creation relies on model attention to prose.
2. **High (~75%):** the lightweight path produces a stub by design, and no flip-to-resolved gate or audit step exists. The paperwork audit validates diff evidence, not folder completeness, so the stub just gets its frontmatter edited.
3. **Medium (~60%):** precedent drift. Sessions cite the last single-file issue as the live convention and call the 4-file layout "older." ADR-068's "de facto practice" wording ratified it.
4. **Medium-low (~40%):** resolving commits often come from housekeeping or pre-merge passes rather than the implementing session, so the context to write `solution-approach` and `test-cases` is gone by the time `status` flips (issue 15 and issue 34).
5. **Low (~20%):** deliberate user intent that supporting files are unnecessary. No user quote supports this.

## Proposal (not decided — see Decisions Needed)

This ENH tracks the gap. It does not prescribe the fix. The candidate directions, in the order they build on each other:

1. **Policy.** Decide what a resolved issue or ENH must contain, and whether "single-file is valid" is a recognized end state. Record it in an ADR amendment to ADR-068 (or a new ADR).
2. **Templates and generator.** Add real file templates for `solution-approach.md`, `test-cases.md`, `implementation-log.md`, and `progress-log.md`, and make Step 3 copy them (the way `kmg-meta-issue --add-attempt` copies its attempt template) instead of listing them in comments.
3. **Record the workflow choice.** Add a frontmatter field (for example `workflow: lightweight | full`) so a doc declares which path it took. This is the signal a gate needs to tell "legitimately lightweight" from "silently skipped." It couples to ENH-062's `status` schema work.
4. **Enforcement.** Add a deterministic check on status flip. The repo's proven pattern is a gate in `pre-push-gate.sh` plus a completion-flag file (Gates 3 and 6), not prose in a skill, per ADR-043.
5. **Backfill.** Decide what to do with the existing 32 single-file issues and 37 single-file ENHs: leave them, mark them `workflow: lightweight`, or backfill content for the resolved ones.

## Decisions Needed

These need an owner decision before implementation. No code, template, or doc changes were made when this ENH was filed.

1. **What does "resolved" require?** Options: (a) full 4-file folder always; (b) full folder only when code changed (matches ADR-068's own full-workflow criteria); (c) single file allowed if it contains a Resolution section naming the fix commits (several single-file issues already do this, e.g. issue 4).
2. **Is a single-file doc a valid permanent state?** If yes, the audit needs a way to recognize it; if no, lightweight becomes a staging state that must be promoted.
3. **Where is the workflow choice recorded?** A new `workflow:` field, reuse of the existing `status`/`branch`/`github-issue` signals (a `branch: none` plus `github-issue: pending` combination already marks drafts), or something else. Check against ENH-062 first, because it already plans to formalize the `status` schema and a `status_category` layer.
4. **Generator scope.** Should Step 3 create all four files empty, create only the main file and add others on demand, or create files filled from the conversation? Filling from the conversation matches how the full workflow is meant to work but costs more per issue.
5. **Enforcement point and strength.** Gate 5 style check (cheap, advisory, repo-wide) versus a Gate 6 style flag from a skill step (judgment allowed). ADR-050 keeps the local gates advisory; ADR-068 Half B shows the project will make one specific check blocking when it has a mechanical definition. Which applies here?
6. **Backfill.** Do nothing for historical single-file docs, tag them, or backfill the 21 resolved issues and 20 done-like ENHs (cost: reconstructing solution and test records from commits and chat history, which the chat-history extraction now makes feasible).
7. **Template location and protection.** `core/default-templates/` is PROTECTED. New templates and any change to `commands/kmg-start-issue-tracking.md` require explicit permission, and a consumer-repo question: do shipped templates change what `kg_scaffold` and `kg_upgrade` offer to existing installs?
8. **Dual-ID and GitHub mapping.** ADR-068's full path includes a GitHub issue. Should a lightweight doc that is later resolved be required to gain a GitHub mapping, or is `github-issue: pending` an acceptable end state?

## Scope Notes

- **In scope when scheduled:** folder-completeness policy, file templates, generator step, workflow-choice field, a completeness check at status flip.
- **Out of scope:** the `status` enum redesign itself (ENH-062 owns it); meta-issue attempts drift (issue-60 and ADR-072); the handoff file-tracing check (ENH-056).
- **Do not merge into ENH-062.** The two interact (a `workflow` field and a `status_category` layer) but have different risk profiles: ENH-062 is schema design, this ENH is a generator plus a gate. Cross-link, keep separate, same reasoning ENH 042 used against ENH 034.
- **Related drift class:** issue-60 / ADR-072 describe the same shape of failure for meta-issue attempts: a documented sync that only fires when a specific command is invoked, so hand-made artifacts drift silently. This ENH is the issue/ENH-folder counterpart.

## Acceptance Criteria (to be refined once Decisions Needed 1-5 are answered)

- [ ] An ADR (or ADR-068 amendment) states what a resolved issue or ENH folder must contain and whether single-file is a valid end state.
- [ ] File templates for the four supporting docs exist under `core/default-templates/` and `kmg-start-issue-tracking` Step 3 creates the files from them, not only `mkdir -p`.
- [ ] Each issue/ENH records its workflow path in frontmatter, or the chosen equivalent signal.
- [ ] A deterministic check flags a done-like doc whose folder does not meet the policy, and it fires on the status flip path that housekeeping commits use (frontmatter-only edits).
- [ ] The decision on backfilling historical single-file folders is recorded and, if backfill is chosen, executed with each backfilled doc citing its sources.
- [ ] Documentation updated: `kmg-start-issue-tracking` command reference, `docs/reference/command-guide.md`, `knowledge/issues/README.md` and `knowledge/enhancements/README.md` conventions.

## Related

- [issue-61](../../issues/issue-61/issue-61-description.md) — this spec's evidence lists triggered the 33-finding Gate 5 report that issue documents.
- [issue-25](../../issues/issue-25/issue-25-description.md) — the lightweight-vs-full ambiguity; ADR-068 Half A resolved the *choice* but not the *completion* rule.
- [issue-30](../../issues/issue-30/issue-30-description.md) — the 2026-07-28 "deliberately lightweight" single-file issue that started the pattern.
- [issue-33](../../issues/issue-33/issue-33-description.md) and [ENH-056](../ENH-056/ENH-056-specification.md) — the command-completion check pilot; the same "documented multi-step prose is inconsistently executed" class.
- [issue-60](../../issues/issue-60/issue-60-description.md) and [ADR-072](../../decisions/ADR-072-meta-issue-tracking-pattern.md) — same failure shape for meta-issue attempts.
- [ENH-051](../ENH-051/ENH-051-specification.md) — filed lightweight, redone through the full workflow after the user caught it.
- [ENH-052](../ENH-052/ENH-052-specification.md) — the "internal paperwork drifts silently, nothing catches it" umbrella and the Gate 5/6 lineage this ENH would extend.
- [ENH-062](../ENH-062/ENH-062-specification.md) — owns the `status` schema; a `workflow` field must be designed with it.
- [ENH-063](../ENH-063/ENH-063-specification.md) — precedent for filing a deferred, track-only ENH silently with the full four-file folder.
- [ADR-043](../../decisions/ADR-043-pretooluse-hook-injection-superpowers-rule-enforcement.md), [ADR-050](../../decisions/ADR-050-pre-push-composite-gate-inline-recommendation-gate.md) — why deterministic gates replaced prose-only enforcement.
- [ADR-068](../../decisions/ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md) — the lightweight-vs-full rule this ENH proposes to extend.

## Evidence Index

All paths relative to the repo root. Chat-history files are extracted logs and may be split into part files.

| Evidence | Location |
|---|---|
| Original 4-file layout (comments only) | `commands/kmg-start-issue-tracking.md` Step 3, commit `4641faab` (2026-02-17) |
| Command's own file-naming section | `commands/kmg-start-issue-tracking.md`, "File Naming Conventions" |
| No file templates | `core/default-templates/issues/README.md`, `core/default-templates/enhancements/README.md` (only files present) |
| issue-30 "deliberately lightweight" | `knowledge/chat-history/2026-07-28/2026-07-28-claude-part-01.md` |
| De facto rule noticed, became ADR-068 | `knowledge/chat-history/2026-08-01/2026-08-01-claude-part-01.md` |
| "No solution-approach ... yet" for issues 49-51 | `knowledge/chat-history/2026-08/2026-08-18-claude.md` |
| Single-file chosen by precedent for issues 57-58 | `knowledge/chat-history/2026-08/2026-08-24-claude.md` line 123 |
| Gate warned against being bypassed by next lightweight path | `knowledge/chat-history/2026-07/2026-07-12-claude.md` |
| Resolve-by-frontmatter-edit samples | commits `cfbbd762` (issue 15), `c3081d5a` (issue 34) |
| Audit checks diff evidence, not folder contents | `skills/kmg-paperwork-audit/SKILL.md` Steps 2 and 5 |
| Gates check counts and backlinks only | `scripts/pre-push-gate.sh` Gate 5 |
