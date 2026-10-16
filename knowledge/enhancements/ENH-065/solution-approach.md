# ENH-065: Solution Approach

**Status:** Not decided. This document lays out options and trade-offs so the owner decisions in [the specification](ENH-065-specification.md#decisions-needed) can be made quickly. Nothing here is a commitment.

## Goal

Make an issue or enhancement folder's contents match what its `status` claims, without forcing a heavy four-file ceremony onto small items that do not need one, and without relying on a model remembering prose.

## Design constraint inherited from the repo

[ADR-043](../../decisions/ADR-043-pretooluse-hook-injection-superpowers-rule-enforcement.md) and [ADR-050](../../decisions/ADR-050-pre-push-composite-gate-inline-recommendation-gate.md) record that phrase-triggered or prose-only enforcement failed twice in this project and was replaced by a deterministic hook keyed on an observable event (a `git push` command, a completion-flag file). Any enforcement here should follow that pattern. A new standalone skill with no gate would repeat a known failure.

## Option space

### A. Policy only (smallest)

Amend ADR-068 Half A to say what each path must contain at resolution and that single-file is (or is not) a valid end state. No code.

- Pro: cheap; settles the argument that produced the drift.
- Con: alone, it changes nothing mechanically. This is exactly the "documented rule, no enforcement" gap ENH-042 and ENH-052 describe.

### B. Generator (make the template real)

Add file templates under `core/default-templates/issues/` and `enhancements/` (PROTECTED, needs permission) and change Step 3 to copy them. `kmg-meta-issue --add-attempt` already does this for attempt folders (`cp` from `core/default-templates/meta-issue/attempt-template/`), so there is an in-repo pattern.

- Pro: removes the "model must remember" step; the folder is born complete.
- Con: creates empty stubs. An empty `test-cases.md` is arguably worse than a missing one (it looks complete). The generator would need to either fill from conversation context or mark stubs clearly as `TODO`.
- Variant B2: generate on demand, only when status moves past `deferred` (a lazy backfill at the moment it matters).

### C. Record the workflow path in frontmatter

Add `workflow: lightweight | full` (name open). A gate can then tell a legitimate lightweight doc from a skipped full one. This is the missing signal ADR-068 Half B itself says it needs.

- Pro: makes the distinction machine-checkable; also lets the audit stop flagging legitimate single-file docs.
- Con: schema change; must be coordinated with [ENH-062](../ENH-062/ENH-062-specification.md), which is already redesigning `status` (literal value plus a fixed `status_category` layer) and would absorb or conflict with a new field. Existing 92 folders would need a default.
- Possible no-new-field variant: infer lightweight from `branch: none` plus `github-issue` absent or `pending`. The 2026-10-16 gate output already reports "AWAITING SYNC" for `github_issue: pending` drafts, so a convention partly exists. It is weaker because issue-55 shows a single file with a real branch and GitHub number.

### D. Enforcement at the status flip

Three candidate points, increasing in strength:

1. **Gate 5 extension** in `scripts/pre-push-gate.sh`: for every issue/ENH doc changed on the branch whose frontmatter is done-like, count files in its folder and compare against the policy. Mechanical, cheap, advisory (exit 0), consistent with ADR-050. Weakness: only sees docs changed on the branch, which is fine because the status flip is itself a change.
2. **paperwork-audit new step** (as ENH-062 proposes for relationship checks): the audit already runs under Gate 6's completion flag, so a new step inherits enforcement. Allows judgment (is this single file really sufficient?). Cost: longer skill; ENH-062's analysis concluded to grow the existing skill rather than split it unless a run-cadence mismatch appears.
3. **Blocking check** à la ADR-068 Half B: only justified if the definition is purely mechanical and fail-open. A file-count rule might qualify; "is the content sufficient" would not.

Recommended starting point if scheduled: D1 plus C, because both are mechanical, both match existing patterns, and together they separate "lightweight by choice" from "full but skipped."

### E. Backfill of history

- **E1 — leave as-is, mark `workflow: lightweight`:** zero content work; honest about what each doc is.
- **E2 — backfill the resolved ones:** 21 issues and 20 done-like ENHs. The sources exist: commits, the extracted chat history (`knowledge/chat-history/`), session summaries, and the specs' own Resolution sections. Cost is real; value is mostly archival.
- **E3 — risk-ranked partial:** backfill only docs with code changes (issues like 15, 32, 55, 56), skip documentation-only items.

## Interaction with other open work

| Item | Interaction |
|---|---|
| ENH-062 (status schema, relationship fields, kg_upgrade backfill behavior) | Shares the schema surface and the `kg_upgrade` backfill mechanism (skip / auto-backfill / prompt-to-rescan). A `workflow` field and any folder-completeness backfill should reuse that three-outcome pattern rather than invent another. Design them together or sequence this after ENH-062. |
| ENH-056 / ADR-068 Half B (command-completion check) | Same failure class (documented steps inconsistently executed). If a general completion-criteria framework ever replaces the single pilot, this ENH's check becomes a second consumer. Today ADR-068 explicitly forbids generalizing. |
| issue-60 / ADR-072 | Same shape for meta-issue attempts; a shared "artifact exists for what the summary claims" check might serve both. Keep separate until one of them is built. |
| ENH-052 (paperwork umbrella) | This ENH is another instance of its "trigger, not verdict" principle; the check raises a flag and the user confirms or dismisses. |
| consumer repos | Scripts in `scripts/` are dev-only and never shipped. A check that should protect consumer knowledge graphs belongs in a shipped skill (as the paperwork-audit SKILL.md already notes for its Steps 5 and 6) or in `kg_upgrade`/`kg_scaffold`, not only in `pre-push-gate.sh`. |

## Risks

- **Stub inflation.** A generator that writes empty files can raise file counts without raising information. Any completeness check based on file count alone can be satisfied by stubs. Mitigation: compare against minimum content (a heading plus one line) or require provenance (each backfilled file cites its sources).
- **Retroactive ceremony.** Forcing 4 files on tiny deferred items would reproduce the overhead the lightweight path was created to avoid (ENH-051 was filed lightweight precisely because the full flow felt heavy for the item).
- **Gate fatigue.** The pre-push gate already surfaces several advisory messages per push; adding more raises the chance they are skimmed. Prefer folding into an existing gate step.
- **PROTECTED paths.** `core/default-templates/` and `commands/` need explicit user permission to edit.
- **Frontmatter-only edits are invisible to evidence checks.** The resolving commits (`cfbbd762`, `c3081d5a`) touched only the status line. Any check keyed on "files changed" misses them; it must key on the resulting folder state.

## Suggested sequencing (if and when scheduled)

1. Brainstorm the Decisions Needed with the owner; produce an ADR amendment (Option A).
2. Coordinate with ENH-062 on the `workflow` field (Option C).
3. Build the templates and Step 3 generator (Option B), with the lazy variant if stub inflation is a concern.
4. Add the Gate 5 folder-completeness check (Option D1).
5. Run the backfill decision (Option E) last, using the new check's output as the work list.

## Research method (for anyone re-checking this)

- Counts: `ls -p` per folder under `knowledge/issues` and `knowledge/enhancements`, with `status:` read from each main file's frontmatter.
- Born-status: `git log --diff-filter=A --format=%h -- <description file>`, then `git show <commit>:<path>`.
- Origin of the layout: `git log -S'solution-approach.md (proposed fixes)' -- commands/kmg-start-issue-tracking.md`.
- Conversation evidence: search of `knowledge/chat-history/` (extracted logs, not raw `.jsonl`), ADR-068, ENH-052, ENH-056, issue-25, and the lessons-learned set.
- Correction recorded: an early research summary reported issue file-count distribution as 32/10/3/14/1; direct recount gives 32 one-file, 10 two-file, 3 three-file, 15 four-file.
