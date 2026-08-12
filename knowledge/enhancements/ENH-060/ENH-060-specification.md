---
id: ENH-060
type: Enhancement
status: resolved
github-issue: "#219"
branch: v0.7.1.3-ENH-060-profile-approval-gate
created: 2026-08-12
related_enhs: []
related_issues: []
---

# ENH-060: Mandatory Explicit-Approval Gate in `kmg-update-profile` Before Writing Profile Files

## Problem

A user profile (`me.md` + `rules.md` + `triggers.md`, personal `~/.kmgraph/` or
project `knowledge/` level) was modified by a session using the `kmg-update-profile`
skill without the user being asked first or informed until after the write already
happened. The user agreed with the content, but the process was wrong: being told
about a change to your own behavioral profile after it's already live isn't the
same as being asked.

## Root Cause

`skills/kmg-update-profile/SKILL.md`'s Step 4 ("Gate — all three files reviewed")
used ambiguous checklist language ("reviewed; updated if needed or confirmed no
change needed") that doesn't distinguish between *the assistant reviewing its own
draft* and *the user explicitly approving it*. Step 5 ("Write") followed directly
with no mandatory stop-and-wait instruction. By contrast, the sibling mechanism
`agents/rules-capture-agent.md` already has an explicit, unambiguous approval gate
(its own Phase 4: "Approve / Edit / Discard?" — display and wait) and lists "Never
write without user approval (Phase 4 is mandatory)" as a hard constraint.
`kmg-update-profile` was the weaker of the two profile-writing mechanisms.

## Fix (drafted, approved by user, not yet committed)

Split the old Step 4 into:
- **Step 4** — internal coverage check only (all three files considered, not yet
  shown to the user)
- **Step 5** — new, mandatory STOP-and-wait gate: show every file's full drafted
  content in one message, ask literally "Approve these profile changes? (yes / edit
  / no)", and treat anything other than an explicit affirmative (including silence
  or a topic change) as not-yet-approved
- **Step 6** — Write, only reachable after explicit approval in Step 5

Plus a new **Constraints** section making "never write without the Step 5 gate
firing and receiving an explicit affirmative response" a hard rule, matching
`rules-capture-agent.md`'s existing pattern, with an explicit fallback for
non-interactive/automated invocations (draft and report as pending, never write
unconfirmed).

## Defense in Depth

A second, durable reinforcement was added directly to `~/.kmgraph/rules.md` §
Approval Gates (personal file, loaded every session per `CLAUDE.md`'s read order,
independent of whether any particular skill fires correctly): never write to any
profile file, personal or project level, without showing the exact content and
getting explicit approval in the same turn. This is the backstop if `kmg-update-profile`
or `kmg-rules-capture` fire without their own gate working, or if a profile file is
edited directly outside either flow.

## Related

- `agents/rules-capture-agent.md` — the sibling mechanism whose existing approval
  gate (Phase 4) this enhancement's Step 5 is modeled on
- `skills/kmg-rules-capture` — already has its own explicit gate (Phase 4 dispatch
  contract), unaffected by this change
- `~/.kmgraph/rules.md` § Approval Gates — the durable, cross-session backstop rule
  (personal file, not part of this repo)
