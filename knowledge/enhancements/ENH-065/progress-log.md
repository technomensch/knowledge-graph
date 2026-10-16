# ENH-065: Progress Log

## 2026-10-16 — Investigated and tracked (not implemented)

**Trigger.** While reviewing `knowledge/enhancements/` and `knowledge/issues/` after the v0.7.10 pre-push gate cleanup, the owner noticed some issue and enhancement folders do not fulfill the template, and some `issue-N-description.md` files are marked `resolved` while the folder holds only that one file. The owner asked for a root-cause investigation before any fix, then asked to table it as a deferred enhancement with decisions needed.

**Filing.** Created through `/kmgraph:kmg-start-issue-tracking` with explicit user args: silent execution, enhancement (not a bug), Mode 3 track-only, deferred, no branch, no plan. Same shape as ENH-063. Reclassified from "issue" to "enhancement" at the owner's direction because nothing is broken; it is a missing generator, a missing check, and an unsettled policy.

### Investigation steps (in order)

1. **Measured the problem.** Counted files per folder and read `status:` from each main file's frontmatter. Result: 32 of 60 issues and 37 of 58 enhancements are single-file; 21 issues and 20 enhancements with a done-like status are single-file. (An intermediate research summary mis-stated the issue distribution; recounted directly and corrected.)
2. **Read the template.** `commands/kmg-start-issue-tracking.md` Step 3 lists four files in shell comments after a `mkdir -p`. No step writes them. `core/default-templates/issues/` and `enhancements/` contain only `README.md`.
3. **Dated the template.** `git log -S` places the 4-file text in the command's first commit, `4641faab` (2026-02-17). It has never been a generator.
4. **Traced births of the single-file resolved issues.** For 21 issues, compared the status in the first commit that added the file against the current status: 10 born `deferred`, 5 `tracked`, 2 `implemented`, 2 `open`, 1 `fixed`, 1 `resolved` (issue-55, born with its fix). The status was later flipped by frontmatter edit; the folder never grew.
5. **Searched the knowledge graph.** `kg_search` for the folder-structure terms returned nothing; `kg_search "lightweight workflow"` surfaced ADR-068, issue-25, ENH-056, the 2026-08-01 session, and several chat-history files. ADR-068 Half A was the key find.
6. **Delegated a read-only chat-history dig** to one subagent with five questions (origin of the layout, deliberate skipping, the status-flip moment, prior recognition, three sample resolutions). Its report was spot-checked: the 2026-08-24 "Lean single-file docs" line and the 2026-07-28 "deliberately did the lightweight path" line were confirmed verbatim, and the single-file count of 32 of 60 was recomputed independently.
7. **Checked for gates.** Confirmed no check in `skills/kmg-paperwork-audit/SKILL.md`, `scripts/pre-push-gate.sh` (Gate 5 and Gate 6), ADR-068 Half B, ENH-052, or ENH-056 inspects folder completeness at resolution.

### Result

Root cause is three compounding mechanisms, ranked by confidence in the specification: (1) the command documents but never creates the files; (2) the July 2026 lightweight path became the default and ADR-068 never defined its completion rule; (3) no gate catches the deferred/tracked to resolved flip. Precedent drift and resolving-from-a-different-session are secondary. No evidence of user intent to drop the supporting files.

### Open

- Eight owner decisions are listed in the specification under "Decisions Needed." None is answered.
- Suggested first step when scheduled: brainstorm decisions 1 to 3 with the owner, coordinate with ENH-062, then amend ADR-068.

### What was not done

- No template, command, skill, gate, or existing issue/ENH folder was changed.
- No backfill was attempted.
- No branch, no plan file.

### Pointers

- Specification: [ENH-065-specification.md](ENH-065-specification.md) (includes an evidence index with file paths and commits)
- Options and trade-offs: [solution-approach.md](solution-approach.md)
- Acceptance and reproduction cases: [test-cases.md](test-cases.md)
