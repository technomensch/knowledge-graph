# ENH-063: Test Cases / Acceptance Criteria

1. **Template has the field.** `core/default-templates/decisions/ADR-template.md`
   and `docs/templates/decisions/ADR-template.md` both contain a
   `decision_provenance` frontmatter block with `origin` and
   `response_channel` subfields, documented inline.

2. **Wizard asks the question.** Running `/kmgraph:kmg-create-adr`
   interactively (`wizard_mode: true`) prompts for decision provenance as
   part of the 10-question wizard in `agents/create-adr-agent.md`, and the
   answer is written into the created ADR's frontmatter.

3. **Context-passed path does not fabricate approval.** When a dispatching
   skill passes a context payload (`wizard_mode: false`, Phase 3.5) without
   asserting a real human approval channel, the resulting ADR's
   `decision_provenance.origin` is `ai-automatic` and
   `response_channel` is `none` or `subagent-auto-answered` — never
   silently upgraded to `ai-recommended-user-agreed`.

4. **Guard rejects contradictory combination.** Attempting to write
   `origin: user-explicit` (or `ai-recommended-user-agreed`) together with
   `response_channel: subagent-auto-answered` is rejected or auto-corrected
   by the agent logic before the file is written — this is the core
   regression test for the false-attribution bug described in the spec.

5. **Existing ADRs unaffected.** Adding the field does not break parsing
   of the ~60+ existing ADRs that lack it (`kg_search`, `kg_compare_graphs`,
   and any ADR-reading tooling treat a missing field as `unknown`, not as
   an error).

6. **Skill reminder present.** `skills/kmg-adr-guide/SKILL.md` contains
   guidance telling the invoking agent to set `response_channel` honestly,
   specifically calling out the subagent-auto-answer failure mode by name
   so it's discoverable by future maintainers.
