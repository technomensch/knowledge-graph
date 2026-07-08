---
title: "ADR-059: Plans must not hardcode derivable counts — derive at run time"
number: 059
status: Accepted
date: 2026-07-04
author: technomensch
email: mkitact@gmail.com
git:
  branch: v0.6.16-update-claude-extract-chat-for-sub-agents
  commit: null
  pr: null
  issue: null
implements: null
related:
  adrs: []
  lessons: []
  kg_entries:
    - knowledge/enhancements/ENH-037/ENH-037-specification.md
    - knowledge/enhancements/ENH-038/ENH-038-specification.md
tags: [governance, process, plans, plan-authoring, concurrency]
category: process
---

# ADR-059: Plans must not hardcode derivable counts — derive at run time

**Date:** 2026-07-04
**Status:** Accepted
**Implements:** null (rule-only change to `~/.kmgraph/plan-authoring-rules.md`; no code)
**Related:** ENH-037 (README indexes for `enhancements/`/`issues/` — the plan where this was caught), ENH-038 (Gemini/Claude extractor fixes — created mid-session, which is what caused the count to drift a second time)

---

## Context

While drafting/extending the `v0.6.16-update-claude-extract-chat-for-sub-agents` plan, ENH-037's Task 8 (populate `knowledge/enhancements/README.md` and `knowledge/issues/README.md` with real content) was written with a hardcoded expected count: "36 ENH entries," later "37" after ENH-037 itself was created, then observed stale again minutes later when ENH-038 was created in the same session — 38. The plan's own prose ("Total ENHs: 37", "37 lines, ENH-001 through ENH-037") was wrong before Task 8 had even run once.

This user is running multiple concurrent AI sessions (Claude, Codex, Gemini/Antigravity) against the same repo, per `~/.kmgraph/me.md`'s `active_platform`/`platforms` config. Any plan step that asserts a specific file/folder/entry count as a fixed expectation is stale the moment a *different* concurrent session adds or removes an artifact before that step executes — the gap between plan-drafting time and task-execution time is real, exploitable time in this environment, not a theoretical edge case.

Checked `governance-rules.md § When to Capture`: *"any process or governance rule discovered during a session"* is an explicit ADR trigger. This qualifies — it is a governance rule about how plans should be authored, discovered live during a session, not a one-off fix to a single plan.

---

## Decision

**Plans must never hardcode a computed count (file totals, folder counts, line counts, entry counts) as a fixed number in prose, expected-output text, or generated-doc front matter.** Instead, phrase the expectation as "derived at run time from `<command>`," and have the plan step run that command immediately before asserting against it.

This applies to:
- Narrative/"Problem" sections describing current state (e.g. "36 ENH folders exist") — acceptable as a point-in-time observation *if* explicitly dated, but any subsequent step that treats that number as a target/expected value must re-derive it, not reuse the narrative's number.
- "Expected output" assertions in test/verification steps (e.g. "expect 37 lines").
- Generated front matter fields in output documents themselves (e.g. a README's "Total ENHs: N" line) — these must be filled from the live count at *generation* time by whatever script/step produces the document, never copied from a number written in the plan.

Rule text added to `~/.kmgraph/plan-authoring-rules.md § Plan Protocol` under a new subsection, **"No Hardcoded Derivable Counts,"** placed after "Language Precision" (a similar mechanical-precision rule for plan authoring).

---

## Rationale

- **Concurrency is this user's actual operating mode**, not a hypothetical: three platforms, one repo, per `me.md`. A rule that only accounts for single-session, single-sitting plan execution is already wrong for how this project is worked on.
- **Caught live, not theorized:** the count drifted twice (36→37→38) within one plan-editing session, before the plan had even reached execution — this is the fast case; a plan sitting unexecuted for days between drafting and running (this repo's plans are local-only, gitignored, and can wait for review) has much more drift exposure.
- **Cheap to fix, easy to keep skipping:** re-deriving a count via one shell command costs nothing at execution time. The failure mode is purely "someone wrote a number down because it was true five minutes ago" — a checklist-level fix, not a redesign, consistent with how "Language Precision" already handles a similarly mechanical plan-authoring mistake without a heavier enforcement mechanism.

---

## Consequences

- Plan steps that previously read "expect N entries" now read "expect however many `<glob/ls -c command>` reports at run time" — slightly more verbose, but immune to drift.
- Generated index/README documents (ENH-037's deliverables) must always compute their own "Total X" front matter from a live directory read, never from the plan's narrative — already how ENH-037's Task 8 generator script was designed (it globs `knowledge/enhancements/ENH-*` directly), so no behavior change there, only the plan's own prose was the problem.
- No code changes; this is a plan-authoring process rule only. `~/.kmgraph/plan-authoring-rules.md` is the sole artifact this ADR implements.

---

## Alternatives Considered

- **Leave the number hardcoded and just fix it each time it's noticed stale.** Rejected: this is exactly what happened twice in one session already; it does not scale to three concurrent AI sessions editing the same repo, and each fix-in-place is a silent correctness bug until caught.
- **Add a CI/lint check that flags hardcoded counts in `.claude/plans/*.md`.** Rejected as disproportionate for a plan-authoring convention — plans are local-only, gitignored, and reviewed by the user before execution; a lightweight authoring rule (mirroring how "Language Precision" is handled) is the right weight, not tooling.

---

## Prior Discussion / Evidence Sources

- Live discovery: `v0.6.16-update-claude-extract-chat-for-sub-agents` plan, ENH-037 Task 8, 2026-07-04 session — count observed drifting 36→37→38 as ENH-037 and ENH-038 were both created within the same session.
- `~/.kmgraph/me.md` — confirms multi-platform concurrent-session operating mode (`active_platform: claude`, `platforms: [claude, gemini, codex]`), the structural reason this matters beyond a one-off transcription slip.
- `governance-rules.md § When to Capture` — the ADR-trigger condition ("any process or governance rule discovered during a session") that this ADR satisfies.

---

## Related Decisions

None — this is a standalone plan-authoring process rule with no prior ADR covering hardcoded counts or plan/execution-time drift specifically.
