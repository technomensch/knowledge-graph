---
id: issue-40
type: Gap
status: open
github-issue: "#207"
branch: v0.7.0-adr-067-c1
created: 2026-08-03
related_issues: ["issue-18"]
---

# issue-40: Capture-level flag naming/targeting consistency across commands+agents (`--named` vs `--project` vs `--graph`)

## Problem

`--named=<kg>` is used across `commands/kmg-session-summary.md`, `commands/kmg-recall.md`,
`commands/kmg-capture-lesson.md`, `commands/kmg-create-adr.md`, `commands/kmg-sync-all.md`,
and the 3 agents they dispatch to (`create-adr-agent.md`, `lesson-capture-agent.md`,
`session-summary-agent.md`) — this is the flag vocabulary that survived Phase 7.1 of
ADR-067 (see [issue-18](../issue-18/issue-18-description.md)'s "Resolved" section) once
`gov-capture-routing` was retired in favor of direct NL-to-scope/targetKg detection.

`--named` may not be the clearest name for what it does, and there is a real naming
collision risk: `commands/kmg-extract-chat.md` already uses `--project=<fragment>` for an
unrelated purpose (filtering chat sessions by project name/path fragment). If `--named`
were renamed to `--project` naively, it would collide in meaning with that existing flag
— these 5 commands already have a separate bare `--project` flag meaning "current repo's
own KG, no value", so a third, different `--project` semantic would be actively
confusing. Candidates to evaluate instead: keep `--named`, rename to `--graph=<kg>`,
rename to `--kg=<name>`, or something else — this needs a deliberate decision, not a
mechanical find-replace.

## Secondary finding

At least `agents/session-summary-agent.md` has an explicit "Targeting for `--project`"
section spelling out that `targetKg` is what's actually passed to `kg_capture`, but no
equivalent explicit "Targeting for `--named`" section — it's ambiguous from the doc alone
whether `--named=<kg>` resolves to `kg_capture`'s `targetKg` param the same way
`--project` does, or whether it needs different handling. Worth auditing all 3 agents
(`create-adr-agent.md`, `lesson-capture-agent.md`, `session-summary-agent.md`) for this
gap, not just the one spot-checked.

## Scope

Touches 5 commands + 3 agents (the Phase 7.1 files) + potentially
`commands/kmg-extract-chat.md` (naming precedent only, not necessarily code) + any other
command using similar flag vocabulary. Worth a `grep -rn "\-\-named=" commands/ agents/`
sweep to confirm the full file list before scoping a fix.

## Origin

Found during Phase 7.1 of ADR-067 (`knowledge/plans/v0.7.0-adr-067-p7.1.md`,
`gov-capture-routing` retirement) verification — specifically a manual trace-through of
the new Level Routing Detection logic in `kmg-recall.md`, done because the real slash
command couldn't be live-tested (it resolves from the installed plugin cache at
`~/.claude/plugins/cache/`, not this git worktree). That same trace-through also caught a
real, separate bug in `kmg-recall.md`'s `--active` wording, fixed directly (commit
`96c8f901`) rather than filed here — see
[issue-18](../issue-18/issue-18-description.md)'s "Resolved" section for that fix.

## Priority

Not urgent. `--named` works correctly today — this is a naming-clarity and
documentation-completeness question, not a functional bug.

## Status

Open — no fix designed yet. This issue exists to not lose the finding, not to prescribe
the answer.

## Related

- [issue-18](../issue-18/issue-18-description.md) — Phase 7.1 that introduced/retained the
  `--named` vocabulary this issue questions; also where this finding was first logged
  before being split out here.
- [issue-41](../issue-41/issue-41-description.md) — cites this issue as a live example of the
  worktree-KG numbering-collision risk it describes. Backlinked 2026-08-19.
