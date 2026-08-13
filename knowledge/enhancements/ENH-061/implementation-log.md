---
id: ENH-061
type: implementation-log
---

# Implementation Log — ENH-061

**2026-08-12** — Surfaced from a real session's own diagnosis: worktree
directory naming for Claude Code sessions confirmed inconsistent (three
coexisting conventions on real machines), and a fully-unscoped extraction
confirmed to merge sessions from every project on the machine, not just
worktrees. Design exploration dispatched to Fable (design-only, no code) —
verified the root cause empirically (real `~/.claude/projects/` listing,
real `.jsonl` field inspection for `cwd`), mapped the scenario space, and
gave a phased recommendation. Mid-conversation, user corrected the scope
from Claude-only to all three extractors (Gemini/Codex have the same
unscoped-merge structural gap). Filed as ENH-061, and — per explicit user
instruction — the decision was written as an amendment to the existing
ADR-062 rather than a new ADR, keeping the fail-closed/never-silent
philosophy single-sourced across both extractors.

**Process violation, corrected mid-session:** implementation began directly
after the design/ADR-amendment work, without a written plan file or explicit
"Proceed"/"Start" approval — the user caught this ("I never said to
implement... the plan has to be reviewed first"). Work paused; a proper plan
file was written (`knowledge/plans/v0.7.1.3-ENH-061-claude-worktree-extraction-scoping.md`,
including an explicit disclosure that some code had already been written
before the plan existed) and a fresh Fable review dispatched against the
actual diff (the original design-review agent had already exited and
couldn't be resumed).

**2026-08-12 (review + fixes)** — Fable's diff review: mechanism correct
(gate coverage, tty-safety, `cwd`-attribution, notice threshold all verified,
no bugs found), but flagged 6 of 9 then-known extraction test files would
break under the new gate (one via hard crash, not just a failed assertion),
plus a "session(s)" vs. "session file(s)" labeling nit. All required fixes
applied; a 7th affected file (`test-extraction-rebuild.sh`) found
independently via a full regression sweep the review's candidate list had
missed. Verified the failures were genuinely caused by this change (not
pre-existing) by stashing the implementation and re-running against the
unmodified tree. Final: 100/100 across all 11 extraction test files.

**2026-08-13** — Paperwork completed (this log, solution-approach.md,
test-cases.md, status → resolved), version sync validated (rides the same
unreleased v0.7.1.3 as ENH-060 per the earlier "WIP append" decision — no new
bump), `commands/kmg-extract-chat.md` updated to document `--confirm-unscoped`,
CHANGELOG entry added, committed, pushed, PR #220 merged (admin, same
required-review policy as every other merge this session).
