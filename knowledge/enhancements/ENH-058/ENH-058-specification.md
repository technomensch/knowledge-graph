---
id: ENH-058
type: Enhancement
status: proposed
github-issue: "#211"
branch: none
created: 2026-07-30
related_enhs: ["ENH-056"]
related_issues: []
---

# ENH-058: Meta-Issue Attempt Loop Should Explain a Repeatedly-Failing Test in Plain English and Recommend Whether to Keep Pursuing It

## Problem

Observed live 2026-07-30 in the `docs-readme-poc` style-guide-required-sections-saga meta-issue. One specific test (Test 8, a malformed-citation-grammar validator) failed across four consecutive independent-review attempts (014-017): each round patched the specific junk examples the prior review found, and each new review found a different junk example that slipped past the new patch, with no sign of converging. The project owner eventually accepted it as a known risk and stopped retesting it — but only after asking directly, at Attempt 017, "how much of a blocker is this?"

The user's own framing, verbatim: *"there should be some accommodation within the meta-issue testing where there comes a point that testing and patching might be pointless and the user might want to consider accepting it as a known risk to stop wasting tokens... If I had asked that 2 loops back, when it was the only one that kept failing, I might have saved myself 2 extra sessions."*

The gap: the meta-issue attempt-loop process (the same one ENH-056's candidate attempt-loop prompt already documents) has no mechanism that, after a test has failed several consecutive rounds with no convergence, explains in plain English *why* it keeps failing and offers a recommendation on whether continuing to pursue it is worthwhile. The only way the user gets that explanation today is if they think to ask for it directly — which, per this exact incident, can happen several rounds later than it could have.

## Proposed Behavior

Add a plain-English diminishing-returns explanation to the attempt-loop process (candidate for folding into ENH-056's attempt-loop prompt, § Candidate Meta-Issue Attempt-Loop Prompt): after closing out an attempt, if a specific test/item has now failed N consecutive independent-review rounds (candidate threshold: 2-3, tunable), the close-out summary should include something like:

> "[Test/item X] has failed N consecutive review rounds. In plain English, here's what it's actually checking, what's still failing, and how narrow or broad the remaining gap looks. Recommendation: [worth one more targeted round / diminishing returns, consider accepting as a known risk like the saga's Attempt-006 precedent] — your call."

This is **explanation plus a recommendation, not a decision or an automatic accept.** The mechanism doesn't fill in "accepted as known risk" on the user's behalf, and it doesn't ask a yes/no gate question either — it surfaces the same plain-English reasoning the user had to ask for directly at Attempt 017 (see Test 8's own writeup, § Problem above), earlier and without the user needing to think to request it.

## Design Questions — Resolved (2026-08-01)

Brainstormed and resolved; see `solution-approach.md` for full detail and rationale (including two independent model consultations and a web-search check against flaky-test/CI industry practice):

- **Threshold:** 2nd consecutive failure on the same test (not 4 — deliberately earlier than the real incident).
- **Counting scope:** per-test independent counter; an unrelated test failing in between does not reset it.
- **Narrowing-vs-spinning distinction:** not resolved by a system judgment — the reviewer already running that round tags the comparison as one of three states ("not actually fixed" / "same issue, new instance" / "different sub-issue, same test") using the current finding plus the prior round's stored finding. No auto-recommendation; the person decides from the comparison.
- **Scope carve-out for real blockers:** implicitly addressed — this only ever surfaces a comparison, never an auto-accept or forced exit. A real, unfixed blocker still gets flagged "not actually fixed" and stays visibly blocking; nothing waves it off automatically.

## Notes

Captured live, lightweight — track only, no plan, no branch. Directly informed by a real, first-hand token/session-cost incident (2 extra sessions), not a hypothetical. Complements ENH-056's candidate attempt-loop prompt rather than duplicating it — that prompt governs how an attempt is run and closed; this enhancement is about when to stop trying at all on a specific stuck item.

## Related

- ENH-056 (`knowledge/enhancements/ENH-056/ENH-056-specification.md`) — the candidate meta-issue attempt-loop prompt this diminishing-returns check is a natural addition to
- `docs-readme-poc` repo, `knowledge/issues/style-guide-required-sections-saga/` — the live incident this enhancement is drawn from (Test 8, Attempts 014-017)
