# ENH-052: Acceptance Criteria

Acceptance is defined against whatever mechanism a future implementer selects
(skill, new pre-push gates, or an extension of `kmg-docs-impact-scan`). Design is
open; these criteria constrain the *outcome*, not the shape.

- [ ] A pre-PR run detects when an index README's declared count/date
      (e.g. `knowledge/enhancements/README.md`'s "Total ENHs" / "Last Updated")
      no longer matches the actual folder listing, and reports it before push.
- [ ] The check covers, at minimum, the enhancements and issues index families;
      decisions and lessons-learned coverage is stated as in- or out-of-scope
      explicitly, not left ambiguous.
- [ ] Backlink symmetry: given a `related` edge A→N, the mechanism can report when
      the expected N→A backlink is absent (or the design explicitly defers this to
      a later phase, documented as such).
- [ ] CHANGELOG entry currency is checked against the branch's actual final state,
      not merely that the version *string* appears somewhere (the current Gate 2
      behavior) — or the gap is explicitly documented as still-uncovered.
- [ ] The implementation documents its scope boundary: it does **not** cover
      Docusaurus link integrity (issue-13) or `commands/*.md` references (issue-26),
      so those are not assumed covered by extension.
- [ ] Advisory-vs-blocking behavior is an explicit, documented choice — consistent
      with the existing `pre-push-gate.sh` convention (advisory, exits 0) unless a
      deliberate decision is made to block.
- [ ] The recurrence rationale is preserved: the mechanism is cross-referenced to
      issue-13, ENH-042, and issue-26 as the same underlying pattern.
