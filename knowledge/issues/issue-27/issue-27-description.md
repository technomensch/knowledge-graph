---
id: issue-27
type: Bug
status: resolved
github-issue: null
branch: v0.6.20-storage-migration-completion
created: 2026-07-18
---

# issue-27: `applyStrayKnowledgeDir` Silently Overwrote Real KG Content — Actually Happened, Not Hypothetical

## Problem

`mcp-server/src/tools/upgrade.ts`'s `applyStrayKnowledgeDir()` (the `stray-knowledge-dir` apply category) checked whether a stray file in `knowledge/knowledge/` matched the plugin's canonical (unmodified) template before merging it into `knowledge/concepts/`. It never checked whether the **destination** in `concepts/` already existed with different content. `fs.copyFileSync(src, dest)` ran unconditionally once the stray-file-vs-canonical check passed.

Every other apply function in this same file (`applyTemplates`, `applyStarterRelocation`) gets this right — both check the destination's existence and content before writing, matching ADR-063 ("never destroy known-good state before a confirmed write"). `applyStrayKnowledgeDir` was the one exception.

## This Actually Happened

Not caught in review — it ran for real, against this project's own live KG, during this same session. Running `kg_upgrade apply: ["stray-knowledge-dir"]` against this repo's `knowledge/` directory (which had a genuine, long-standing stray `knowledge/knowledge/` nesting artifact — itself a known, previously-deferred gap) overwrote:

- `knowledge/concepts/patterns.md` — 146 lines of real, accumulated pattern content reduced to a 42-line blank template
- `knowledge/concepts/architecture.md`, `concepts.md`, `gotchas.md`, `workflows.md` — same risk, same mechanism (all 5 stray files happened to be byte-identical to the canonical template, so all 5 passed the existing check and all 5 were blindly copied over their real `concepts/` counterparts)

Recovered in full via `git restore` — recoverable **only** because these were already-committed, tracked files. A KG with these files gitignored, uncommitted, or simply not yet pushed would have lost that content permanently, with no archive, no backup, no warning. The tool reported success ("Moved to concepts/: architecture.md, concepts.md, gotchas.md, patterns.md, workflows.md") with no indication anything was overwritten.

## Root Cause

The canonical-template check (`if srcContent !== canonContent → skip`) answers "is the stray file itself safe to move, based on its own history?" It does not answer "is it safe to write to this destination?" Those are independent questions — a stray file being an unmodified, harmless-looking blank template says nothing about what already lives at the destination path. The bug was treating the first check as sufficient for both.

## Fix

`applyStrayKnowledgeDir` now checks the destination first: if `concepts/<file>` already exists, its content is compared against the stray source before anything is written. Different content → skip, reported as "already exists with different content — manual review required, not moved." Identical content → the stray duplicate is removed without touching the destination. Only when the destination doesn't exist at all does the (still-useful) canonical-template check run, followed by the actual copy.

Added a regression test (`T-49` describe block, `upgrade.test.ts`) reproducing this exact scenario: stray file byte-identical to canonical template, destination pre-populated with unrelated real content. Asserts the real content survives untouched and the operation is reported as skipped, not silently succeeded.

`tsc --noEmit` clean, 147/147 tests pass (146 prior + 1 new). `dist/` rebuilt.

## Related

- Same ADR-063 violation family found and fixed twice earlier this session in `commands/kmg-init-shared/kmg-upgrade-inspector.md` (bash-level `jq`/`mv` writes) and 3 more instances found by a repo-wide Opus audit (`kmg-init-personal-kg.md`, `kmg-switch.md`, `kmg-init.md`) — all of those were caught by review before they ran. This is the one that wasn't caught until it actually executed.
- **Resolved separately, same family:** `kmg-init-personal-kg.md:346-347` (wiki-link content write-back) — writes arbitrary markdown, so the `jq empty`-equivalent validity check used elsewhere doesn't apply cleanly (Markdown has no parse-failure state the way malformed JSON does). Fixed with an exit-status check plus a size-sanity floor instead: since substitutions only ever add characters, a write that comes back meaningfully shorter than the original signals a truncated write (e.g. process killed mid-`printf`), not a valid pass — caught and skipped rather than trusted. Verified against three cases (normal write, simulated truncation, empty output); all three behave correctly.
- The stray `knowledge/knowledge/` directory itself (the pre-existing condition that made this bug reachable) was a known, previously-deferred gap — noted in the v0.6.20 plan's own "out of scope" list before this session started.
- [issue-28](../issue-28/issue-28-description.md) — a second, unrelated gap discovered while verifying this fix: a locally rebuilt `mcp-server/dist/` was not reflected in the live `kg_upgrade` tool call used to confirm the fix worked; the live tool was still running an old installed copy of the plugin.
