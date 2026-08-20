---
title: "Ownership-of-Derivation Contract Violation Causes Double-Prefixed Filenames"
created: 2026-08-16T20:54:42.805Z
updated: 2026-08-16T20:54:42.805Z
author: Marc K
git:
  branch: v0.7.1.5-capture-filename-diffbase-fix
  commit: af4474529b33ba3f7561b12fe7e14dcef0421d0e
tags: [ownership-of-derivation, capture.ts, deriveFileName, issue-46, filename-prefix, silent-bug]
category: patterns
---
## Problem

`mcp-server/src/tools/capture.ts`'s `deriveFileName()` owns prefixing filenames
with a derived value (today's date for session captures, `ADR-{NNN}-` for ADR
captures). Two caller agent files — `agents/session-summary-agent.md` and
`agents/create-adr-agent.md` — independently reconstructed that same derived
value and baked it into the `metadata.title` field they pass to `kg_capture`,
so the prefix got applied twice (e.g. `2026-08-16-2026-08-16-main.md`).

Root pattern: when one layer derives a value from shared inputs (today's date,
an assigned number) that a caller could also derive, nothing enforced which
layer owns it — both did, silently. No test ever exercised a caller-supplied
title that already contained the derived prefix, so nothing caught it.

Confirmed present unchanged across 7 cached plugin versions (0.6.20 → 0.7.1.4).
Not a regression — long-standing.

## Solution

Establish `deriveFileName()` as sole owner of the derived prefix. Callers must
pass an undecorated title and never pre-compute/embed the derived value
themselves. Fix requires auditing both call sites to strip the caller-side
derivation, plus a regression test asserting a caller-supplied title that
already contains the derived prefix is not double-prefixed.

Full detail: `knowledge/issues/issue-46/issue-46-description.md` and
`solution-approach.md`.

## When to apply

When adding or reviewing a new caller of a `deriveFileName()`-style helper —
or any tool where two layers can independently compute the same derived value
from shared inputs — confirm single ownership explicitly before merging.
Silent duplication bugs like this are typically found only by manual
inspection of an output filename, not by test failure — because the defect
still "succeeds" (file gets created, just wrong-named).

## Context

- Branch: v0.7.1.5-capture-filename-diffbase-fix
- Commit: af447452 (investigation session; fix not yet committed on this branch)
- Category: patterns
- Linked issues: issue-46 (GitHub [#226](https://github.com/technomensch/knowledge-graph/issues/226))
