---
title: "Lesson: Run New Scan Heuristics on the Real Corpus Before Shipping — Hub Files and Bare Filenames Dominate"
created: 2026-10-17T00:00:00Z
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: v0.7.11-kg-frontmatter-links
  commit: 4f889109338f1ad550d65d652d10e7d69e5fe1fb
  pr: null
  issue: null
tags:
  - scan-heuristics
  - false-positives
  - test-fixtures
  - relationship-scan
  - paperwork-audit
  - hub-files
  - ENH-062
category: process
related_adrs: []
related_enhs:
  - "[[ENH-062-specification|ENH-062]]"
related_issues:
  - "[[issue-61-description|issue-61]]"
related_lessons: []
---

# Lesson: Run New Scan Heuristics on the Real Corpus Before Shipping — Hub Files and Bare Filenames Dominate

**Date:** 2026-10-17
**Category:** process
**Version:** 1.0

---

## Problem

The ENH-062 relationship scan (first built as `scripts/relationship-scan.sh`, later moved inline into `kmg-paperwork-audit` Step 7) was specified as: flag two issue/ENH docs that mention the same file but declare no relationship in frontmatter.

It passed its own shell test on a toy fixture. On the real knowledge graph it flagged **871 pairs**, which is unusable as an audit step.

**Impact:** A gate or audit step that emits 871 findings gets ignored or disabled, so the real relationships it was meant to surface are lost in the noise.

---

## Root Cause

1. **Hub files make pair counts grow quadratically.** Files that dozens of docs legitimately touch produce roughly n-squared pairs for n docs sharing the path. That is not a relationship signal.
2. **A bare filename is not an identifier.** A mention like `solution-approach.md` with no directory does not name one file.
3. **The toy fixture could not reveal either problem.** It had no hub path and no bare filename, so the test passed while the heuristic was wrong for real data.

**Evidence (real numbers, 2026-10-17):**

| Shared path | Pairs |
|---|---|
| `solution-approach.md` | 49 |
| `hooks/hooks.json` | 48 |
| `commands/kmg-init-shared/kmg-upgrade-inspector.md` | 39 |
| `scripts/pre-push-gate.sh` | 38 |
| `mcp-server/src/tools/upgrade.ts` | 38 |
| `commands/kmg-start-issue-tracking.md` | 35 |

- 307 of the 871 pairs shared only a bare filename with no directory.
- Even the path-qualified pairs alone numbered 564.

---

## Solution

- Ignore bare filenames (no `/` in the reference).
- Ignore "hub" paths shared by more than 4 docs (overridable with `REL_SCAN_HUB_MAX`, default 4).

Result on the real graph: **871 pairs down to 140**. The test fixture gained a bare-filename case and a 5-doc hub case that **fail against the unfiltered script**, so the filter is covered by the test.

---

## When to Apply

- Before building a skill step, gate, or audit check on any new heuristic that matches mentions, links, or shared references across documents.
- When a spec reads "flag X whenever two things share Y": shared-Y relations are where hubs and generic names inflate counts.

**Checklist:**
1. Run the heuristic against the real corpus first. Look at the total count and the top offenders.
2. If the count is far above what a person could review, find what dominates it before tuning anything else.
3. Add hub-like and generic-name cases to the test fixtures so the filter is covered and fails without it.
4. Make thresholds overridable so they can be tuned without editing the script.

---

## Related Evidence

[[issue-61-description|issue-61]] found the same family of problem earlier: Gate 5's backlink check produced 33 findings of which only 9 were genuine. In both cases, treating every mention as a relationship made the output mostly noise.

---

## Sources

None (internal measurement only).
