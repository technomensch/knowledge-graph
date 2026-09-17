---
id: issue-60
title: Test Cases — Real automatic attempt-sync detection
status: deferred
created: 2026-09-17
---

# Test Cases

**Deferred — no implementation yet. These are acceptance criteria for whoever implements a fix, not tests that currently run.**

1. **Hand-created attempt folder is detected.** Manually `mkdir attempts/00N-foo` (bypassing `--add-attempt`) inside a meta-issue directory, without touching `README.md`/`description.md`. The chosen mechanism must flag the resulting drift (README/description not matching the actual attempt count) — via a warning, a failed gate, or equivalent, depending on which candidate direction from `solution-approach.md` is chosen.

2. **Direct edit to `description.md`'s attempt count without a matching attempt folder** is also flagged (drift in the other direction — claims more attempts than exist).

3. **No false positive on the example/template content itself** — `docs/examples/meta-issue/example-performance-saga/` and its `core/` mirror (post-v0.7.10 fix) are internally consistent and must not trigger the new mechanism.

4. **No false positive on a meta-issue mid-creation** — the moment between `mkdir -p attempts/analysis` (Step 3 of `kmg-meta-issue.md`'s init flow) and the templates being populated should not be flagged as "drift" if the mechanism runs opportunistically rather than only at natural checkpoints.
