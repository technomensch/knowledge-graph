---
title: "Two-Cycle Cross-Model Review (Fable-Review -> Opus-Fix -> Fable-Re-Review) for High-Risk Changes"
created: 2026-07-12T00:00:00.000Z
updated: 2026-07-12T00:00:00.000Z
author: technomensch
git:
  branch: v0.6.18-misc-patches
  commit: dd62385b
tags: [code-review, cross-model-review, quality-gate, config-migration, tdd, process, high-risk-changes, fable, opus]
category: process
---

## Problem

A high-risk change (a config path migration) was implemented, tested, and committed with a passing test suite — but the test suite's own mocking happened to mask the exact gap that mattered. The bug was invisible to same-model self-review because the implementing model (Opus) had no independent vantage point from which to notice its own blind spot.

## Root Cause: Same-Model Self-Review Is a Weaker Signal

When Opus reviews Opus's own work, it tends to re-confirm the same reasoning that produced the code in the first place, rather than genuinely re-deriving evidence from scratch. A same-model reviewer:

- Trusts the implementer's test suite instead of independently proving the tests are meaningful
- Reuses the implementer's fixtures and assumptions rather than constructing fresh ones
- Is prone to inheriting the same blind spot that produced the original gap, since it reasons the same way the implementer did

A genuinely separate model (Claude Fable, in this case) checking the work is a stronger signal because it has no stake in the original reasoning and is more likely to re-derive evidence independently rather than accept self-reported claims at face value.

## Solution / Pattern: The Two-Cycle Loop

**Cycle structure:** implement -> independent review by a DIFFERENT model -> fix -> independent re-review by the SAME different model.

### What happened this session (branch `v0.6.18-misc-patches`, now merged to `main`)

**Cycle 1 — kg-config.json migration (commit `654c13fb`):**
- Fable independently reviewed the just-committed migration and found a real BLOCKER: `handleUpgrade()` called `readConfig()` before the migration-check functions ever ran, and `readConfig()` had no legacy fallback. The entire migration feature was dead code for its actual target users (anyone whose config only existed at the old path).
- This was masked by the existing test suite mocking `readConfig()` to always return an active KG — the mock hid exactly the code path that was broken.
- An Opus agent was dispatched to fix it via TDD (commit `2d0aba01`).
- Fable re-reviewed the fix independently: re-ran the test suite herself (did not trust the commit message), confirmed `tsc --noEmit` clean, and confirmed the fix's logic by inspection. She approved the fix, but surfaced one NEW non-blocking wrinkle: the legacy fallback applied even when `KG_CONFIG_PATH` was explicitly set, inconsistent with how the rest of the migration code treated "KG_CONFIG_PATH set" as "skip legacy behavior."

**Cycle 2 — same migration, addressing the wrinkle (commit `dd62385b`):**
- Rather than deferring the wrinkle, a second Opus fix agent was dispatched immediately.
- Fable ran a THIRD independent check on this fix:
  - Reverted the fix to the prior commit and re-ran the reworked tests to confirm they genuinely failed against the pre-fix code (proving the tests were meaningful, not just newly written to pass).
  - Ran the full suite twice back-to-back to check for flakiness given `os.homedir()` mocking.
  - Confirmed the mocking approach didn't leak state between test files.

**Pattern reused later the same session:**
- `handleConfigSwitch()` testability fix (commit `015d660f`) — again Fable-reviewed. She used a fresh throwaway fixture (`ENH-777`) instead of reusing the implementer's fixture (`ENH-999`), and for `kg_config_switch` discovered the original test suite had reimplemented the switch logic inline instead of calling the real code — a TDD anti-pattern a same-model review would likely have passed.
- issue-11 and issue-12 commits (`84f1f499`, `4e397e60`) — same pattern applied.

### Specific verification techniques that made this effective

1. **Re-deriving evidence, not trusting claims.** Fable re-ran tests and re-read diffs herself rather than accepting "tests pass" as reported.
2. **Fresh fixtures, not reused ones.** Using a new fixture (e.g., `ENH-777` vs. the implementer's `ENH-999`) surfaces whether the fix generalizes or was fitted to the implementer's specific test data.
3. **Reverting to prove test validity.** Rolling back to the pre-fix commit and confirming the new tests fail against it proves the tests actually exercise the bug, not just that they pass against the fix.
4. **Repeat-running for flakiness.** Running the suite multiple times back-to-back catches state leakage from mocks (e.g., `os.homedir()`) that a single run would not reveal.
5. **Checking for TDD anti-patterns**, e.g., tests that reimplement the logic under test inline rather than calling the real implementation — these pass trivially and give false confidence.

## General Pattern: When This Is Worth the Cost

**Use the two-cycle cross-model review loop for:**
- Data migrations (e.g., config path changes)
- Changes to shared config/state resolution logic that many code paths depend on
- Any change where the test suite's own mocking could plausibly mask the exact gap being introduced
- Fixes to a fix, when the re-review surfaces a new wrinkle rather than a clean pass

**Do not use it for:**
- Low-risk mechanical changes (a one-line version bump, a `.gitignore` pattern fix) — lighter-weight verification (self-review, direct test run) is sufficient and the full cycle would be wasteful.

**Cost/benefit:** each review cycle costs real time — a background agent dispatch plus a wait for independent verification. This session reserved it for genuinely high-risk changes and used lighter verification elsewhere, rather than applying it uniformly to every commit.

## Evidence (commit hashes, this session)

- `654c13fb` — original kg-config.json migration (introduced the dead-code bug)
- `2d0aba01` — Cycle 1 fix: legacy fallback in `readConfig()`
- `dd62385b` — Cycle 2 fix: `readConfig()` should not fall back to legacy path when `KG_CONFIG_PATH` is set
- `015d660f` — `handleConfigSwitch()` testability fix, same pattern reused
- `84f1f499`, `4e397e60` — issue-11 / issue-12 commits, same pattern reused

## Context

- Branch: v0.6.18-misc-patches (merged to main)
- Category: process
