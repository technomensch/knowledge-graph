---
id: issue-60
title: Solution Approach — Real automatic attempt-sync detection
status: deferred
status_category: backlog
created: 2026-09-17
---

# Solution Approach

**Not yet implemented — this issue is tracked in Mode 3 (track only, deferred). No approach has been selected. This document outlines candidate directions for whoever picks this up.**

## Candidate directions

1. **PostToolUse hook on Write/Edit under an `attempts/` path** — Claude Code hooks can intercept file writes. A hook watching for any write under a meta-issue's `attempts/` tree could trigger a check (or the same sync logic `--add-attempt` already runs) regardless of whether the user typed the command. Pro: catches hand-created folders. Con: hook would need to reliably detect "this write is under a meta-issue's attempts/ tree" without false-positiving on the example/template content itself.

2. **Advisory consistency check in `pre-push-gate.sh`** (mirroring this repo's existing ADR-050 advisory-gate pattern) — a gate that, for every `knowledge/issues/*/` (and `core/default-templates/meta-issue/`-based) directory with an `attempts/` subfolder, checks that `README.md`'s attempt count and `description.md`'s status field agree with the number of attempt folders present. Pro: fits this repo's existing established pattern (advisory, non-blocking, same family as Gate 2/Gate 8). Con: only catches drift at push time, not immediately when it happens.

3. **Extend the `kmg-update-doc.md` checklist item already added in v0.7.10** ("No contradiction between status/summary fields and detail sections") to explicitly enumerate meta-issue attempt counts as one of the fields it checks, and reference this as the documented, human-in-the-loop mitigation until real automation exists. Pro: zero new engineering. Con: only fires during an explicit `kmg-update-doc --user-facing` pass, not universally.

## Recommendation

Whoever picks this up should brainstorm (per this project's `superpowers:brainstorming` convention for creative/design work) before committing to one of the above — they have different cost/coverage trade-offs and a hook-based approach in particular needs real design work to avoid false positives on template/example content.

## Related Knowledge Graph Entry

- [[Lessons_Learned_Patterns_Bundled_Example_Content_Drift_And_Dangling_Adr_Citations]] — captures the two generalizable lessons from how this issue was found: bundled example/teaching content can silently rot like real data, and a ported pattern's "Based on: ADR-X" citation must be verified to actually resolve.
