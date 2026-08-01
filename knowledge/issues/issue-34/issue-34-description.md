---
id: issue-34
type: Bug
status: deferred
github-issue: null
branch: none
created: 2026-07-30
related_enhs: ["ENH-056"]
related_issues: ["issue-35"]
---

# issue-34: `kg_search`/FTS5 Index Never Cover `knowledge/issues/` or `knowledge/enhancements/`

## Problem

Found 2026-07-30 while validating whether `kmg-auto-recall`/`kg_search` can surface prior issues and enhancements as part of a candidate meta-issue attempt-loop prompt (ENH-056). Verified directly against the real code, then confirmed live via an actual `kg_search` call — not assumed:

- `mcp-server/src/tools/fts5.ts`'s `rebuildIndex()` builds its file list from `contentDirs = ["knowledge", "lessons-learned", "decisions", "sessions", "chat-history"]` (plus `concepts` separately), each joined onto `kgPath`.
- `mcp-server/src/tools/search.ts`'s non-FTS5 fallback path uses the same shape: `searchDirs = ["knowledge", "concepts", "lessons-learned", "decisions", "sessions", "chat-history"]`.
- **Neither list includes `issues` or `enhancements`**, despite both being real, populated top-level subdirectories of `knowledge/` (`knowledge/issues/issue-N/`, `knowledge/enhancements/ENH-NNN/`) containing substantial content — descriptions, solution approaches, test cases, implementation logs.

**Live validation:** a `kg_search` call for the exact phrase `"dead weight in both lists"` — which exists verbatim in this very issue's own file under `knowledge/issues/issue-34/` — returned 16 matches, none from `knowledge/issues/` or `knowledge/enhancements/` (all from `chat-history/`/`sessions/`). Confirms the gap live, not just by reading the code.

**Net effect:** `kg_search`/`kmg-recall`/`kmg-auto-recall` can currently surface prior decisions (ADRs), lessons, sessions, and chat-history — but cannot surface prior issues or enhancements at all, regardless of how directly relevant they are. A recall query for "have we tracked this bug before" will silently miss every issue/enhancement file in the KG, with no error or signal that a whole content category was skipped.

## Why this matters beyond recall accuracy

This directly undercuts a design assumption already written into `ENH-056`'s candidate meta-issue attempt-loop prompt: that a recall call before starting a new attempt would surface "relevant prior KG history — related issues, ADRs." As verified here, the issues/enhancements half of that claim is currently false — only the ADRs half actually works.

## Proposed Behavior

- Add `"issues"` and `"enhancements"` to both `contentDirs` (`fts5.ts`) and `searchDirs` (`search.ts`).
- Rebuild the FTS5 index after the fix and confirm a search actually surfaces content from `knowledge/issues/` and `knowledge/enhancements/` that wasn't findable before.

## Notes

Captured live, lightweight, local-only — track only, no plan, no branch. Directly blocks part of ENH-056's candidate attempt-loop prompt from working as designed until fixed. Split out from an initial combined write-up into this issue (recall-scope gap) and issue-35 (a separate, unrelated dead-path-literal bug found in the same code read).

## Related

- `mcp-server/src/tools/fts5.ts` (`rebuildIndex`, `contentDirs`)
- `mcp-server/src/tools/search.ts` (fallback `searchDirs`)
- ENH-056 (`knowledge/enhancements/ENH-056/ENH-056-specification.md`) — candidate meta-issue attempt-loop prompt assumes recall covers issues, which this bug shows it currently does not
- issue-35 — separate bug found in the same investigation (dead `"knowledge"` path literal in the same two directory lists)

## Fix Plan (C2, branch v0.7.0)

Plan: `v0.7.0-c2-issue-34-35-patch` — locked in 2026-08-01. Folded together with issue-35 (same two array literals, same test fixtures) since sequencing them separately risked stale line numbers and duplicate fixture-migration work — but kept as its own commit (Phase 6) within the plan, per `plan-authoring-rules.md`'s commit-per-governing-group rule (ADR-014) and issue-35's own "Why This Is Its Own Issue" reasoning: different root causes (missing-directory omission vs. dead-path removal), separate commits.

Plan sequences issue-35's fix first (Phases 1-3: patch, test-fixture migration, verify, commit), then issue-34's addition (Phases 4-6: patch `issues`/`enhancements` into both arrays against the post-issue-35 file state, verify via live search repro re-running this issue's own `"dead weight in both lists"` query, commit). Both commits push together at the end.

Status unchanged (`deferred` → will move to in-progress once Phase 1 execution starts).
