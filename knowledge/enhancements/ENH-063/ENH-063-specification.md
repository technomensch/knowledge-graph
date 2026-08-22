---
id: ENH-063
type: Enhancement
status: deferred
github-issue: "#243"
branch: none
created: 2026-08-22
---

# ENH-063: Decision-Provenance Tagging for ADRs

## Summary

The ADR (Architecture Decision Record) template and creation workflow
(`create-adr-agent`, `commands/kmg-create-adr.md`, `skills/kmg-adr-guide`)
currently record *what* was decided and *why*, but not *who actually decided
it*. Add a required "decision provenance" field that distinguishes three
cases, and a guard against a specific failure mode that has already
occurred in this project: a subagent presenting a question to a human and
then answering it itself, with the answer recorded as if the human had
responded.

## Problem

1. **No provenance field exists today.** The ADR frontmatter
   (`core/default-templates/decisions/ADR-template.md`) captures `author`,
   `git`, `status`, `category`, etc., but nothing captures whether the
   *content* of the decision came from a human or from an AI/agent.
2. **The wizard (`agents/create-adr-agent.md` Phase 3) cannot currently
   distinguish** between:
   - **AI-automatic** — an agent made the call entirely on its own
     (e.g. a subagent picked an approach with no human in the loop at
     decision time).
   - **AI-recommended, user-agreed** — the AI proposed the decision and a
     human reviewed and explicitly approved it.
   - **User-explicit** — the human specified the decision themselves,
     independent of any AI recommendation.
3. **Known failure mode — false attribution of "user responded."**
   This has happened before in this project: a subagent runs a
   recommendation/question flow "behind the scenes," auto-answers its own
   question, and the resulting record is tagged as if the user answered it
   — when the user never saw the question at all. Nothing today
   distinguishes a real `AskUserQuestion`-mediated human response from a
   subagent's simulated one. This is the same shape of gap already
   captured in the knowledge graph under
   `recall_v059_protocol_noncompliance` (Review Audit Protocol only fires
   on skill invocation; recommendation conversations bypass all gates) and
   `recall_docs_enforcement_findings` (a required skill wasn't invoked
   pre-push and nobody caught it) — a pattern of "the system assumed a gate
   fired when it didn't."

## Affected Files (for the eventual implementation — none touched by this
tracking pass)

- `core/default-templates/decisions/ADR-template.md` (PROTECTED —
  requires explicit user permission per `CLAUDE.md` Code Protection Rules)
- `docs/templates/decisions/ADR-template.md` (docs-site mirror of the
  same template — currently drifts from the core one in minor formatting;
  any frontmatter field added to core must be mirrored here)
- `agents/create-adr-agent.md` — Phase 3 (wizard questions), Phase 3.5
  (context-passed draft population), Phase 5 (`kg_capture` metadata
  payload)
- `commands/kmg-create-adr.md` (PROTECTED — thin dispatcher; likely needs
  no change beyond checklist wording, since it delegates wizard logic to
  the agent)
- `skills/kmg-adr-guide/SKILL.md` — trigger guidance should remind
  whichever agent is creating the ADR to set provenance honestly

## Out of Scope (this tracking pass)

- No code, template, or skill changes are made by this issue. Mode: track
  only.
- No git branch created (explicit user instruction).
- No implementation plan file created (explicit user instruction).

## Proposed Field Design (for implementation phase)

Add to ADR frontmatter:

```yaml
decision_provenance:
  origin: [ai-automatic|ai-recommended-user-agreed|user-explicit]  # required
  response_channel: [askuserquestion-human|human-initiated|subagent-auto-answered|none]
  # response_channel exists specifically to prevent the false-attribution
  # failure mode: "subagent-auto-answered" is a distinct, honest value —
  # it must NEVER be recorded as ai-recommended-user-agreed or
  # user-explicit, even if a subagent's internal flow labeled its own
  # answer as "user response."
  notes: ""  # free text, e.g. "recommendation approved via AskUserQuestion in main thread"
```

Rule for the wizard/agent: `origin: ai-recommended-user-agreed` or
`origin: user-explicit` may only be set when the response came through a
direct, human-facing interactive prompt in the main conversation thread
(e.g. `AskUserQuestion`, or the user's own chat message) — never from a
subagent's internal dialogue with itself. If a subagent auto-answered a
question the human never saw, `response_channel` must be recorded as
`subagent-auto-answered` and `origin` must default to `ai-automatic`,
regardless of what the subagent's own transcript claims.

See `solution-approach.md` for the fuller design and open questions.
