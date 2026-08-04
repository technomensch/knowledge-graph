# Solution Approach: ENH-058

**Status:** Brainstormed and approved 2026-08-01. Resolves the three "Design Questions, Not Yet Resolved" in `ENH-058-specification.md`.

## Prior Art Checked

- `kmg-stuck-work-escalation` (`skills/kmg-stuck-work-escalation/SKILL.md`, governed by `ADR-035`) — a different, adjacent mechanism. ADR-035 forces a decision on a *whole stuck problem* at fixed attempt counts (3/5), with a mandatory exit-path menu. ENH-058 is narrower and softer: a plain-English comparison for *one specific recurring test*, surfaced earlier, with no forced decision. Complementary, not duplicative — not merged here.
- `ADR-023` (`docs-readme-poc`, external precedent) — the lesson that automating a judgment call badly (templated/boilerplate "evidence") produces false confidence, worse than not automating at all. Directly shaped the decision below to surface a comparison rather than have the system render its own verdict.
- Two independent model opinions (Opus, Fable) gathered live during this brainstorm, plus a web search on flaky-test/CI diminishing-returns practice — both models and the general industry pattern converged on the same core answer: track each check's own failure trajectory independently, don't reset on unrelated intervening failures.

## Decision

### 1. Counting scope: per-test, independent counter

Each test/check's consecutive-failure count is tracked on its own. A different, unrelated test failing (or passing) in an intervening round does **not** reset another test's count. Rationale (converged from two independent model reviews + web-search precedent): whether test Y also failed has no bearing on whether test X's own fix strategy is converging — resetting on unrelated noise makes the signal hostage to test ordering and would have erased the real incident's signal if any other check had flickered in the middle rounds.

### 2. Trigger threshold: 2nd consecutive failure

Fires at the *second* time the same test fails, not the third or fourth. Deliberately earlier than the real incident (which took 4 rounds before anyone asked) — the whole point is surfacing this before multiple sessions get wasted, not after.

### 3. Output: comparison + light tag, not a system judgment

At the 2nd consecutive failure on a test, pull that test's exact finding text from round 1 and round 2 (already recorded in the meta-issue's own paperwork — `attempt-results.md`/`implementation-log.md`, no new recording burden) and present both side by side in plain English, tagged with one of three states:

- **"Not actually fixed"** — round 2's failure is the *same* violating instance as round 1's; the fix didn't land.
- **"Same issue, new instance"** — round 1's instance was fixed, but a different instance of the same underlying pattern showed up (whack-a-mole).
- **"Different sub-issue, same test"** — the test bundles more than one check; round 2 tripped a genuinely different sub-rule than round 1's, under the same test name.

The tag is produced by the reviewer already running that round (no new agent dispatch, no independent second-pass verification) — it has both findings in hand already, since it's reading the current failure and the mechanism hands it round 1's stored finding for comparison. This is explicitly **not** a system-rendered recommendation ("worth pursuing" / "accept as risk") — it's visibility, handed to the person at the earliest informative point, who then decides. Matches ENH-058's own original framing: "explanation plus a recommendation, not a decision or an automatic accept" — refined here to "explanation and a comparison; the user forms the recommendation."

### Why not the alternatives considered

- **Automatic text-diff instead of reviewer judgment:** rejected — a pure diff can say "different specific example" but can't distinguish the three tag states above, which requires understanding whether the underlying rule/root-cause is the same. This is exactly the class of judgment call `ADR-023` found automation degrades on.
- **System renders its own "worth continuing" recommendation:** rejected in favor of the comparison-only design — asking the system to judge "diminishing returns" directly re-introduces the same false-confidence risk `ADR-023` documents; showing the actual comparison lets a human judgment happen on real evidence instead.
- **Reset counter on any intervening unrelated failure (Option A from the model consultation):** rejected — both Opus and Fable independently rejected this, and the web-search precedent (track pass/fail rate per-test) agrees.

## Non-Goals

- No forced exit-path menu or auto-accept-as-known-risk — that's `ADR-035`'s territory (`kmg-stuck-work-escalation`), not this.
- No independent second-agent verification pass on the tag itself — the tag is produced inline by the reviewer already running that round, since forming it doesn't require a blind second opinion the way a Pass/Fail self-attestation does.
- No change to `kmg-meta-issue`'s recording format — reuses `attempt-results.md`/`implementation-log.md` as they already exist today.

## Where This Lands

Extends `ENH-056`'s "Candidate Meta-Issue Attempt-Loop Prompt" section (`knowledge/enhancements/ENH-056/ENH-056-specification.md`) — that's the actual prompt template a reviewer follows each round in `kmg-meta-issue`. Not part of `ADR-068`'s completion-check pilot (different subsystem — session-level file-read verification vs. meta-issue review-loop comparison). A separate implementation plan, when written, targets that prompt section plus `commands/kmg-meta-issue.md`.
