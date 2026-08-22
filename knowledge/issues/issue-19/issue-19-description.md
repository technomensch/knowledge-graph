---
id: issue-19
type: Gap
status: open
github-issue: "#177"
created: 2026-07-17
related-issues: [issue-17, issue-18]
target-release: null
---

# Issue-19: No hook-level enforcement for issue-creation discipline (prior-art check, provenance docs)

## Problem

This session filed several GitHub issues (issue-16 through issue-18) via ad-hoc,
manually-dispatched documentation agents, NOT through this project's own formal
issue-creation mechanism: `commands/kmg-start-issue-tracking.md` (a 683-line command that
handles branch creation, session-summary integration, and lesson-capture reminders for
issue tracking).

Investigation found: `commands/kmg-start-issue-tracking.md` has no step requiring a
prior-art/recall check (`kg_search`) before finalizing an issue doc, and no requirement
that issue docs include a "Provenance / Historical Context" section.

The first fix proposed was to just add these as prose steps/template sections to that
command file — but this has the exact same structural weakness as issue-17 and issue-18:
it's still just instructions in a markdown file that an assistant has to remember to read
and follow. Nothing in `hooks/hooks.json` mechanically enforces it. Compare to the
existing `post-tool-lesson-check.sh` hook (registered in `hooks/hooks.json` under
`PostToolUse`, matcher `"Write|Edit|Bash"`) which DOES mechanically fire after certain
tool uses to check for lesson-worthy signals — that's the right SHAPE of fix (a hook),
not another paragraph in a command file.

## Confirmed via

`kg_search` was run twice this session, with different query framings, before filing this
issue:

- "hook enforcement issue creation prior art check governance PostToolUse"
- "skills vs hooks reliability enforcement prose instruction not enforced by harness"

Both returned zero results. This confirms the gap described here is genuinely new — it
does not overlap with issue-17's or issue-18's specific mechanisms, even though all three
belong to the same broader family (see Related, below).

## Related

Same broader class as [issue-17](../issue-17/issue-17-description.md) (GH #175) and
[issue-18](../issue-18/issue-18-description.md) (GH #176): documented behaviors that rely
on an assistant remembering to follow prose instead of being mechanically enforced by the
harness.

- Issue-17: `kmg-auto-recall`'s reactive trigger only fires on specific user-phrased
  keywords; `pre-skill-rules-inject.sh`'s hard-block only covers 5 skill types
  (brainstorming, planning, execution, debugging, review-request, finishing) — neither
  covers general recall-before-asking-clarification.
- Issue-18: `gov-capture-routing` is referenced by 8+ commands/agents as an auto-invoked
  skill but doesn't exist in any registered/discoverable location — a real file exists in
  the author's personal `~/.claude/skills/` but is invisible to the Skill tool's
  resolution.
- Issue-19 (this issue): `commands/kmg-start-issue-tracking.md` has no step requiring a
  prior-art check or provenance documentation, and nothing in `hooks/hooks.json`
  mechanically enforces either — the same reliance on prose-that-can-be-skipped, just in
  the issue-creation workflow rather than recall-triggering or skill-invocation.

All three are instances of one structural pattern: a documented behavior that depends
entirely on an assistant session reading and following markdown instructions, with no
corresponding mechanical check in `hooks/hooks.json` (or elsewhere in the harness) that
would catch a session that skips it.

`commands/kmg-start-issue-tracking.md` hotspot: also touched by
[issue-13](../issue-13/issue-13-description.md), [issue-26](../issue-26/issue-26-description.md),
[issue-52](../issue-52/issue-52-description.md), and
[ENH-052](../../enhancements/ENH-052/ENH-052-specification.md) — same command surface as
this issue's prior-art-check gap, FYI.

## Proposed shape of fix (not a commitment — direction only)

Floated direction: a new `PostToolUse` hook, mirroring `post-tool-lesson-check.sh`'s
registration pattern in `hooks/hooks.json`, that fires when issue-related work is
detected. Candidate triggers to evaluate (not yet decided between):

- `Write` to `knowledge/issues/**/*.md`
- a `Bash` command matching `gh issue create`
- both, matched independently or in combination

The hook would remind/verify that a prior-art check (`kg_search`) happened and that
provenance/historical-context was considered before the issue doc was finalized.

This needs its own scoped plan before implementation — open design questions include:

- The exact trigger condition (Write-only, Bash-only, both, or something else)
- What the hook actually checks or prompts (e.g., can it detect whether `kg_search` was
  actually invoked earlier in the session, or can it only remind unconditionally?)
- Whether it should be a hard block (fails the tool call until addressed) or an advisory
  reminder (surfaces a message but doesn't stop anything)
- **Related, adjacent question (2026-07-17):** should an issue *update* (not just creation)
  re-trigger a session-summary refresh? Answer worked out in conversation: NOT on every
  issue-doc edit — `## Open Issues` in the session-summary format is a pointer/index (issue
  number, title, status) that points at the doc for full context, not a duplicate of its
  content, so routine content edits don't need to force a re-summarize. It SHOULD trigger
  specifically when an update changes something the summary itself asserts directly —
  concretely, a status or priority change (e.g. issue-18/#176 going from an implied
  "broken, needs fixing" framing to an explicit "low-priority, non-destructive, no demand
  signal" reassessment on the same day). Any future hook/trigger design for issue-tracking
  should carry this distinction: fire on status/priority-assertion changes, not on every
  touch to an issue file.

None of these design questions are resolved here. This issue documents the gap only.

## Status

Open — gap confirmed, no fix designed or implemented yet. Needs its own scoped plan
before implementation (trigger design, hook script, hooks.json wiring) — deliberately not
bundled into a quick prose edit, since that would repeat the same enforcement weakness
this issue is about.
