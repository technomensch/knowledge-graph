# ENH-063: Solution Approach

## Goal

Make every ADR self-report *who* made the decision it records, using a
vocabulary that cannot be gamed by a subagent quietly answering its own
question and labeling the answer as the user's.

## Three provenance states

| `origin` value | Meaning | Who/what may set it |
|---|---|---|
| `ai-automatic` | Agent decided alone; no human saw a choice point at decision time. | Any agent, always safe default. |
| `ai-recommended-user-agreed` | Agent proposed; a human reviewed and explicitly approved (accepted, tweaked-then-accepted, or picked from AI-offered options). | Only after a real human-facing prompt returns in the *main* conversation thread. |
| `user-explicit` | Human specified the decision on their own initiative, not from an AI suggestion. | Only when the decision text originates from the user's own words. |

## The false-attribution guard

**Observed failure (per user report, recurring):** a subagent runs a
recommendation-and-confirm flow internally — it poses a question meant for
the human, then answers it itself (e.g. because it's operating
non-interactively, or because a prompt template assumes a response will
come and none does), and marks the record as "user responded" even though
the human never saw the prompt.

**Design response:** decouple *what got decided* from *how the answer was
obtained*. Add `response_channel` alongside `origin`:

- `askuserquestion-human` — answer came back through `AskUserQuestion` (or
  equivalent blocking, human-facing prompt) in the thread the human is
  actually reading.
- `human-initiated` — the human said it unprompted (no question was posed).
- `subagent-auto-answered` — a subagent posed and answered its own
  question; the human was not shown it. **This value forces `origin` to
  `ai-automatic`, full stop** — no code path may set
  `ai-recommended-user-agreed` or `user-explicit` alongside it.
- `none` — no interactive exchange happened (pure `ai-automatic` case).

This means the wizard/agent logic (not just the template) needs a
validation rule: reject/downgrade any attempt to write
`origin: ai-recommended-user-agreed` or `origin: user-explicit` when
`response_channel: subagent-auto-answered`. This is the load-bearing part
of the fix — the frontmatter field alone doesn't prevent misuse; the
agent-side validation does.

## Where this plugs into the existing wizard

`agents/create-adr-agent.md` Phase 3 currently has 9 questions ending at
"Implementation Commit." Add a 10th:

> **10. Decision Provenance** — "Who made this call?
> [1] I decided this myself
> [2] AI recommended it and I approved
> [3] This was an AI/agent decision made automatically (no human review at
>     decision time)"

When `wizard_mode: false` (Phase 3.5, context passed by a dispatching
skill rather than asked directly) — this is exactly the path most at risk
of the false-attribution bug, since no human is necessarily present at
that call site. The agent must NOT default this field to
`ai-recommended-user-agreed` just because a payload was supplied; it
should default to `ai-automatic` / `response_channel: none` unless the
calling skill explicitly asserts (and can substantiate) that a human
approved the content upstream, in the same turn, via a real interactive
prompt.

`Phase 5` (`kg_capture` metadata) needs the two new subfields added to
`metadata.decision_provenance`.

## Documentation updates

- `core/default-templates/decisions/ADR-template.md` — add the frontmatter
  block (see `ENH-063-specification.md` "Proposed Field Design") and a
  short explanatory comment, matching the file's existing
  `# [MANUAL]` / `# [FUTURE-AUTO]` comment convention.
- `docs/templates/decisions/ADR-template.md` — mirror the same field (note:
  this file has already drifted from core in minor formatting per the
  `diff` run during this tracking pass; the implementer should reconcile
  both, not just append to one).
- `skills/kmg-adr-guide/SKILL.md` — add a line reminding whichever
  agent/skill is authoring an ADR that `response_channel` must reflect
  reality, not convenience.

## Open questions (for the implementer / brainstorm phase)

1. Should `decision_provenance` be **required** (hard validation failure
   on missing field) or default silently to
   `ai-automatic` / `response_channel: none`? Leaning required — the whole
   point is that silence should not default to looking authoritative.
2. Does this need a migration note for the ~60+ existing ADRs in
   `knowledge/decisions/` and `site/decisions/`? Likely: backfill as
   `unknown` rather than guessing, so old records aren't misrepresented
   either.
3. Should `kg_search`/`kg_compare_graphs` surface provenance in result
   summaries, so a human scanning search results can see at a glance
   which decisions were AI-automatic vs. human-approved? Deferred —
   separate enhancement if wanted.
4. Relationship to governance rules already in the KG
   (`recall_v059_protocol_noncompliance`,
   `recall_docs_enforcement_findings`): those found that *skills* silently
   fail to fire; this finds that *subagents* can silently fabricate a
   "user responded" signal. Both are instances of "the system assumed a
   gate fired when it didn't" — worth a shared ADR or a cross-reference
   rather than treating this as unrelated.

## Link to Knowledge Graph

Related existing entries (not yet formally linked — implementer should run
`/kmgraph:kmg-link-issue` once a branch exists):
- `knowledge/memory-equivalent: recall_v059_protocol_noncompliance` (gate
  bypass pattern)
- `knowledge/memory-equivalent: recall_docs_enforcement_findings` (skill
  silently not invoked, no one noticed)
