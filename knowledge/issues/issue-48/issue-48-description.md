---
id: issue-48
type: Refactor
status: resolved
github-issue: "#228"
branch: v0.7.2-issues-46-51
created: 2026-08-17
folded-from: v0.7.1.6-issue-48-adr-dual-implementation
---

# Issue 48: `kmg-create-adr` command and `create-adr-agent` are two independent, un-synced implementations of ADR creation

## Summary

This repo has **two independent implementations of ADR creation** that are
supposed to be one feature with one owner, and are not:

1. **`agents/create-adr-agent.md`** (Phase 5, lines 248-292) — calls the
   `kg_capture` MCP tool. Per issue-46's fix (landed on
   `v0.7.2-issues-46-51`, not yet merged to `main` as of
   this writing), `content` is sent body-only and `title`, `status`,
   `number`, `implements`, `related`, `category`, `tags`, and `git` are
   passed via `metadata`. `mcp-server/src/tools/capture.ts`'s
   `generateFrontmatter()` is the sole generator of the file's frontmatter
   block; `deriveFileName()` is the sole generator of the filename
   (`ADR-{NNN}-{slug}.md`).

2. **`commands/kmg-create-adr.md`** (Step 4 "Generate Filename and Confirm",
   lines 299-330; Step 5 "Create ADR File", lines 334-385) — a **fully
   standalone, parallel implementation**. It never calls `kg_capture`.
   Confirmed via `grep -n "kg_capture" commands/kmg-create-adr.md`: the only
   3 hits (lines 30, 33, 36) are prose in the "Level Routing Detection"
   section describing how `create-adr-agent` routes scope — not an actual
   tool call from this command. Instead the command:
   - Computes its own filename directly (Step 4, lines 301-307: "lowercase,
     spaces → hyphens, remove special characters")
   - Assembles its own frontmatter block directly as literal YAML (Step 5.1,
     lines 346-367)
   - Assembles its own document body directly (Step 5.2, lines 369-385)
   - Writes directly to disk — Step 7 ("Commit") refers to "both files"
     being written and `git add`s them directly, with no MCP tool call
     anywhere in the command

This is **not** the same root-cause pattern as issue-46 (one artifact
double-processed because two layers both claim ownership of generating the
same value into the same file, at the same write site). This is: **two
entirely separate artifacts/pipelines exist for the same feature, writing
through two different code paths, with nothing to catch drift when one is
edited and the other isn't.**

## This is self-acknowledged, long-standing technical debt

`agents/create-adr-agent.md`'s own header states the intended relationship
and that it has never been carried out:

> **Boundary with `create-adr` command:** This agent contains the full ADR
> creation logic. The `create-adr` command currently embeds its own
> implementation (v0.2.2 will refactor it to a thin dispatch wrapper).

The repo is currently at v0.7.1.4 (main) / mid-v0.7.2 (in-flight branch).
The stated "v0.2.2 will refactor it" never happened across roughly 20 patch
versions. The duplication is not a newly-introduced defect — it is a known,
named intention that was deferred indefinitely and then forgotten as a
tracked item.

## Confirmed divergence (not just risk)

The task that discovered this asked whether the two paths have *already*
diverged in an observable way, which would upgrade this from "duplication
risk" to "already-manifested inconsistency." They have:

| Field | `create-adr-agent.md` Phase 5 metadata (→ `kg_capture` → `generateFrontmatter()`) | `commands/kmg-create-adr.md` Step 5.1 (literal YAML) |
|---|---|---|
| `author` / `email` | Nested inside `git: { author, email, ... }` — no top-level `author`/`email` fields in the metadata payload at all | Top-level frontmatter fields (`author: {name}`, `email: {email}`), **separate from** the `git:` block |
| `git` sub-fields | `branch, commit, commit_short, author, email, pr, issue` (7 fields) | `branch, commit, pr, issue` (4 fields) — no `commit_short`, no `author`/`email` (those live at top level instead) |
| `implements` | Settable — Phase 3 wizard question 9 ("Implementation Commit") lets the user supply a real commit reference, stored as `$implements_ref` and passed through | **Hardcoded to `null`** (Step 5.1, line 359) — the command's wizard (Step 3, questions 3.1-3.8) has no equivalent question; there is no code path in this command that can ever produce a non-null `implements` value |
| Wizard question count | 9 questions (Phase 3) — includes "Implementation Commit" | 8 questions (Step 3.1-3.8) — no equivalent |

These are two different frontmatter schemas and two different feature sets
being presented to the user as "the same command," depending on which code
path actually executes. An ADR created via one path cannot be assumed to
have the same fields as one created via the other.

## Why this matters

Two independently-maintained implementations of the same feature can (and
already have started to) silently diverge — different field sets, different
validation, different error handling, different frontmatter schema — with
nothing structural to catch drift when one is edited and the other isn't.
Concretely:
- A future edit to `create-adr-agent.md` (e.g. adding a new metadata field,
  changing validation) has no mechanism forcing a corresponding edit to
  `commands/kmg-create-adr.md`, and vice versa.
- Tooling or scripts that assume all ADRs share one frontmatter shape
  (search, indexing, migration scripts) must handle two shapes, silently,
  forever — or will silently mishandle whichever shape they weren't written
  against.
- The `implements` gap means ADRs created via the command path can never
  record their implementing commit through the normal wizard flow, which
  the agent path supports — a feature gap, not just a schema gap.

## Root Cause

No single owner was ever established for "ADR creation logic" at the
markdown-instruction layer. `create-adr-agent.md`'s header names the
intended direction (command → thin dispatcher → agent owns logic) but no
implementation work ever executed it. Both files were edited independently
over time (each accreting its own field additions — e.g. `implements` was
added to the agent path at some point without a corresponding change to the
command path), which is exactly how two supposedly-identical templates
drift apart with no test or lint catching it.

## Confirmed Scope

| File | Section | Role |
|---|---|---|
| `agents/create-adr-agent.md` | Phase 5, lines 248-292 | Calls `kg_capture`; `capture.ts` owns frontmatter/filename generation |
| `commands/kmg-create-adr.md` (**PROTECTED**) | Step 4 (lines 299-330), Step 5 (lines 334-385) | Standalone: own filename derivation, own frontmatter assembly, own body assembly, direct `Write` |
| `mcp-server/src/tools/capture.ts` | `generateFrontmatter()`, `deriveFileName()` | Only reachable from the agent path; the command path never calls it |

## Backfix Requirement

**Superseded during implementation (2026-08-19).** This section originally
required a `kg_upgrade` migration to reshape existing command-path ADRs'
`author`/`email` fields under a nested `git:` block. Before implementing,
the planned backfix step was corpus-verified against all 70 existing ADRs
in this repo and found to rest on a fabricated premise: 0/70 actually
diverge in that shape. Writing the migration anyway would have invented a
third, incorrect schema and corrupted correctly-formed files. The backfix
step was deleted from the plan before implementation; see
`implementation-log.md`'s 2026-08-19 entry. No `kg_upgrade` migration was
built or is required for this issue — the fix (dispatching
`commands/kmg-create-adr.md` to `create-adr-agent`) prevents new divergence
going forward, which was the actual, verified need.

## Related

- [[issue-46]] — the filename-double-prepend / duplicated-frontmatter-block
  bug found while implementing this issue's discovery session. Issue-46's
  `solution-approach.md` explicitly ruled `commands/kmg-create-adr.md` out
  of its own scope on the grounds that this command never calls
  `kg_capture` (so it cannot exhibit issue-46's double-processing pattern),
  and pointed forward to this issue for the separate duplication finding.
- `commands/kmg-create-adr.md` is **PROTECTED** per `CLAUDE.md` /
  `knowledge/rules.md` Code Protection Rules — any actual consolidation fix
  requires explicit user permission before editing. This issue only
  proposes an approach; see `solution-approach.md`. No fix is implemented
  here.
- [[issue-50]] and [[issue-51]] cite this issue as a case study whose backfix
  is still only described in prose (`solution-approach.md`), not yet built —
  evidence that `kg_upgrade`-category authoring is optional in practice, not
  enforced. Backlinked 2026-08-19.

## Discovery Context

Found 2026-08-17 as a byproduct of implementing issue-46 on
`v0.7.2-issues-46-51` (parallel, uncommitted work in the
main checkout at the time of this issue's filing — not touched by this
issue's branch). While tracing issue-46's Manifestation A/B "fourth site"
citations for `commands/kmg-create-adr.md`, direct file inspection showed
the command never actually calls `kg_capture` at all, which is a distinct
architectural finding from issue-46's double-processing bug and was filed
separately per user direction ("full third issue" — branch + GitHub issue +
`solution-approach.md`, same weight as issue-46/47).
