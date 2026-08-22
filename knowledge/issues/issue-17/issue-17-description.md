---
id: issue-17
type: Gap
status: open
github-issue: "#175"
created: 2026-07-17
related-issues: []
target-release: null
---

# Issue-17: No recall trigger when the assistant itself needs clarification mid-task

## Problem

Recall enforcement in this project covers two cases, and only two:

1. **Reactive user-phrased triggers** — `skills/kmg-auto-recall/SKILL.md` fires when the
   USER asks the assistant something using one of six specific keyword phrases: "have we
   done this before", "what did we decide about", "did we figure out", "is there a lesson
   on", "what do we know about", "have I seen this before".
2. **Hard-block skill-type injection** — `scripts/pre-skill-rules-inject.sh` force-injects
   a recall requirement, but only for exactly five hard-coded skill types matched off
   `tool_input.skill`/`tool_input.name`: `brainstorming`, `planning`, `execution`,
   `debugging`, `review-request`, and `finishing` (the PR-gate-only variant).

Neither mechanism covers the case where the **ASSISTANT itself** needs clarification from
the user mid-task — e.g. investigating an ambiguous file or folder and needing to ask
"what do you mean by X" — and should check the knowledge graph / chat history for prior
context **before** asking, rather than asking cold. There is no trigger condition, in
either file, keyed on "the assistant is about to ask the user a clarifying question."

## How this was found

Confirmed live during a session (not hypothetical, not inferred from reading code): the
assistant was investigating ambiguous repo content, needed clarification, and asked the
user directly without checking recall first. The user pointed out that per their own
expectation, recall should have fired automatically before the assistant asked — the
assistant should not have needed to be told this by judgment alone, because no existing
trigger definition covers this case.

A `kg_search` run to check for prior art on this exact expectation (recall firing before
an assistant-initiated clarifying question) returned zero relevant results, confirming
this specific gap had never been discussed or decided before in this project's knowledge
graph.

## Verification against live repo (2026-07-17)

Both files were re-read in full to confirm the gap still matches this description as of
today:

- `skills/kmg-auto-recall/SKILL.md` — trigger keyword list is unchanged, still exactly the
  six phrases listed above. The file explicitly scopes itself to "reactive ('have we?')
  recall only" and defers hard-block enforcement to `pre-skill-rules-inject.sh`.
- `scripts/pre-skill-rules-inject.sh` — the `case "$SKILL_NAME"` block (lines 32–62) still
  matches only the same five `SKILL_TYPE` values (`brainstorming`, `planning`, `execution`,
  `debugging`, `review-request`, `finishing`); anything else falls through to `exit 0`
  with no injection at all.

No drift from the original description. The gap is real and current.

## Scope (not yet decided)

This is a documentation-only filing. No fix has been implemented or designed yet. Possible
directions, not yet chosen between:

- A new reactive trigger condition in `kmg-auto-recall`'s `SKILL.md` for "assistant is
  about to ask a clarifying question."
- Extending `pre-skill-rules-inject.sh`'s hard-block list to cover general
  conversational/investigation contexts, not just the five existing skill types — though
  this hook only fires on `PreToolUse` for the `Skill` tool, so it may not be reachable
  from an ad-hoc mid-task clarification that isn't itself wrapped in a skill invocation.
- A new, lightweight mechanism entirely (e.g. a general behavioral rule in
  `knowledge/rules.md` / `~/.kmgraph/rules.md` rather than a hook or skill).

Needs its own scoping pass before any implementation work begins.

## Status

Open — gap confirmed, no fix implemented yet. Needs its own scoping (likely: a new trigger
condition in `kg-auto-recall`'s `SKILL.md`, or an extension to
`pre-skill-rules-inject.sh`'s hard-block list, or a new lightweight mechanism entirely —
not yet decided).

## Related finding: a second, distinct instance of the same broader pattern

A second, related-but-distinct instance of the same broader pattern (documented
auto-triggers referenced by commands that don't actually exist/fire) was found on
2026-07-17 — see [issue-18](../issue-18/issue-18-description.md) (GH #176). That gap
involves the `gov-capture-routing` skill, referenced by 8+ commands/agents as an
automatic level-routing step, which errors with "Unknown skill" when actually invoked.
Same broader class as this issue, but a genuinely separate concrete mechanism — not a
duplicate filing.

A third instance of the general "skill trigger vocabulary misses real phrasing" class — different skill again — is [ENH-055](../../enhancements/ENH-055/ENH-055-specification.md) (GH #210), `kmg-capture-router` missing "future idea" phrasing. Cross-linked 2026-08-22; not a duplicate, but any generalized trigger-vocabulary fix should probably cover both.

## Related

- [issue-36](../issue-36/issue-36-description.md) — same class: automatic trigger vocabulary that doesn't actually fire (stale `kmgraph:recall` skill-name references live in `scripts/pre-skill-rules-inject.sh`), a separate concrete instance of this issue's broader pattern.
