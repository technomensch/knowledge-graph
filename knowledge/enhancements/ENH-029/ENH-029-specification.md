---
id: ENH-029
type: Bug
status: resolved
---

# ENH-029: Upgrade Inspector Preview Correctness

**Status:** ✅ Resolved in v0.6.7
**Discovered:** 2026-06-21
**Related:** ENH-022 (template deployment), ENH-028 (init compliance gate), v0.6.5 live testing, ADR-040

---

## Problem

Live testing of v0.6.5 against the `career-prism` project KG revealed multiple bugs in the upgrade inspector preview/apply cycle. Most critically, `applyTemplates()` in `mcp-server/src/tools/upgrade.ts` overwrites README files unconditionally, ignoring the "user content at risk" flag that `checkTemplates()` surfaces in the preview. The user was required to run `git checkout HEAD` to recover a 50-ADR index and lesson count table.

Secondary bugs: new template files are incorrectly deployed INTO `knowledge/knowledge/` (the stray legacy dir being migrated out), the starter relocation step silently self-defeats when templates apply runs first, and the user-facing wording for the `stray-knowledge-dir` manual step is wrong.

---

## Root Causes

### Bug 1: README overwrite (CRITICAL)
`applyTemplates()` (`upgrade.ts` lines 344-357) calls `fs.copyFileSync(src, dest)` unconditionally for all mappings, including `lessons-learned/README.md` and `decisions/README.md`. There is no existence check, no content diff, and no ADR-040 guard. `checkTemplates()` correctly flags these as "outdated with user content at risk" in the inspect output, but `applyTemplates()` ignores the flag entirely.

Contrast with `applyStarterRelocation()` (lines 390-396), which DOES check `fs.existsSync(dest)` and skips on content mismatch. The protection was added to one function but not the other.

**Not a local caching issue.** The `PLUGIN=".../0.5.11"` path seen in the bash diff block is the career-prism session's loaded plugin cache (session started before the 0.6.5 rsync). That is a testing artifact that self-resolves on session restart. The bug exists in `applyTemplates()` in both 0.5.11 and current (0.6.4/0.6.5) code.

### Bug 2: Templates deployed INTO stray dir
`applyTemplates()` mappings include:
```
{ templateSub: "concepts", kgSub: "concepts", files: ["entry-template.md", "kg-category-index.md"] }
```
For a KG where `knowledge/concepts/` doesn't exist but `knowledge/knowledge/` does (the stray legacy layout), `mkdirSync` creates `knowledge/concepts/` but the inspector LLM renders the destination as `knowledge/knowledge/` — adding files to a dir flagged for migration in the same run.

**Root cause:** The markdown layer (`kmg-upgrade-inspector.md` section c) uses the KG's `{kgSub}` path literally without checking whether a stray `knowledge/knowledge/` alias exists. The `kg_upgrade` apply runs in TypeScript and creates the correct `concepts/` dir, but the LLM's preview incorrectly shows `knowledge/knowledge/` as the destination.

### Bug 3: Starter relocation self-defeats (apply order)
`applyTemplates()` deploys `lesson-template.md`, `ADR-template.md`, and `session-template.md` to `templates/`. `applyStarterRelocation()` then finds those same files already in `templates/` with different content (the live-dir copies vs newly deployed plugin versions) and skips them. Both templates and starters run in the same `apply` call with templates before starters — creating a deterministic conflict.

### Bug 4: Wrong manual-rename instruction
`kmg-upgrade-inspector.md` section m tells the user "you'd need to manually rename the directory." The correct operation is `mv *.md knowledge/concepts/ && rmdir knowledge/knowledge/` (move files, delete empty dir). Renaming the directory would collide with an existing `knowledge/concepts/` or create a wrong-named dir.

---

## Affected Files

| File | Role |
|---|---|
| `mcp-server/src/tools/upgrade.ts` | `applyTemplates()` lines 344-357 — missing ADR-040 guard; `applyStarterRelocation()` vs `applyTemplates()` apply order |
| `commands/kmg-init-shared/kmg-upgrade-inspector.md` | Section c preview rendering of template destinations; section m manual-step wording |

---

## Fix Plan

### Fix 1: Add ADR-040 guard to `applyTemplates()` (CRITICAL)
For each mapping dest, check:
1. If dest exists and content differs → skip, add to `skipped[]` with "user content detected — manual review"
2. If dest exists and content matches → skip (already up to date)
3. If dest does not exist → copy

This mirrors the guard already in `applyStarterRelocation()` lines 390-396. READMEs must go through this same guard.

### Fix 2: Apply order — starters before templates (or path guard)
Run `applyStarterRelocation()` before `applyTemplates()`, so live-dir starters are moved to `templates/` first. Then `applyTemplates()` finds the correct baseline and skips or updates correctly. Alternatively, add a path-guard: `applyTemplates()` must not write a file whose src is also handled by `applyStarterRelocation()` in the same run.

### Fix 3: Fix section m wording in upgrade-inspector.md
Replace "You'd need to manually rename the directory" with:
> Move the .md files into `knowledge/concepts/` and delete the empty `knowledge/knowledge/` directory:
> ```bash
> mv knowledge/knowledge/*.md knowledge/concepts/
> rmdir knowledge/knowledge/
> ```

### Fix 4 (Enhancement): Per-file split for stray-knowledge-dir
`checkStrayKnowledgeDir()` already computes per-file modified status. Apply unmodified files automatically; hold back only files with user edits. One modified file should not block the entire directory.

### Fix 5 (Enhancement): README diff/merge path
Instead of binary overwrite/skip for outdated READMEs, surface a regenerate option — the correct content is derivable from directory contents (ADR count, lesson count, etc). Track as separate sub-item; out of scope for initial fix.

---

## Acceptance Criteria

- [x] `applyTemplates()` never overwrites a dest file that exists with different content
- [x] `applyTemplates()` adds skipped files to output with "user content detected" message
- [x] Running `kg_upgrade apply` on a KG with a live 50-ADR decisions/README.md does NOT overwrite it
- [x] `applyStarterRelocation()` runs before `applyTemplates()` in the apply sequence (enforced by APPLY_ORDER sort on applyList)
- [x] Starter relocation no longer silently skips after a same-run template deploy
- [x] Section m manual-step wording: already correct in source (mv+rmdir) — LLM paraphrased output incorrectly in live test; no code change needed
- [ ] Tests: add test for `applyTemplates()` on a KG with existing README — assert file unchanged (follow-on)

---

## Out of Scope for ENH-029

- v0.6.6 STOP gate (ENH-028) — separate PR
- README diff/regenerate UI (Fix 5 above) — follow-on ENH
- 0.5.11 cache path in bash diff — local testing artifact, self-resolves on session restart; no code change needed

---

## Notes

The "wrong cache" (0.5.11) seen in the live test bash block is because the career-prism session started before the 0.6.5 rsync. The session's MCP server was still the 0.5.11 build. This is a local development testing artifact — production users load the installed version at session start and get the current code. Not tracked as a bug.
