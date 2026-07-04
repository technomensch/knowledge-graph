---
title: "Bulk Frontmatter Strip Over-Reached Into knowledge dir — Restore via git checkout pre-strip"
created: 2026-06-25T20:47:16.680Z
updated: 2026-06-25T20:47:16.680Z
tags: [frontmatter, git-restore, knowledge-graph, docs-regression, readme-com, bulk-operations, scope-creep, adr, enh, templates]
category: process
---
## Problem

Commit `22972a33` ("chore(docs): strip frontmatter from agents, commands, and test fixtures") was scoped to `agents/`, `commands/`, and `tests/fixtures/` but silently over-reached into `knowledge/`, stripping load-bearing YAML metadata from 155 files: 56 ADRs, 28 ENH specifications, issue/handoff/analysis files, and 6 template files in `core/default-templates/`. The commit message did not reflect the true scope. Separately, the homepage (`docs/index.mdx`) was converted from JSX to plain markdown during readme.com prep (`170a9657`), and a P1 restore pass (`a9e52262`) fixed 4 Tabs files but missed the homepage entirely. Both regressions went undetected until a manual audit.

## Solution

- **Homepage**: restored via `git show f78164da:docs/index.mdx > docs/index.mdx` (last pre-readme.com commit).
- **Frontmatter**: restored all 155 `knowledge/` files via `git checkout 22972a33~1 -- knowledge/enhancements/ knowledge/decisions/ knowledge/issues/ ...`
- **Templates**: restored `core/default-templates/` files the same way.

Restoration was safe because `22972a33` made no body-text changes — only frontmatter was removed — so pre-strip blobs = current body + stripped frontmatter. Validated with Opus agent before pushing.

## Pattern / Next Time

1. **Verify scope before merging bulk strip commits**: run `git show --stat <commit> -- knowledge/` to confirm `knowledge/` was not touched unintentionally.
2. **ENH/ADR YAML frontmatter is load-bearing** — `status`, `version_target`, `git.branch/commit`, `implements`, `related_adrs` are not readme.com render noise. They govern recall, ADR-042 compliance, and session continuity. Never strip them.
3. **P1 restore passes must audit ALL docs/**, not just files with obvious JSX errors. Use `git diff --name-only <bad-commit>~1 <bad-commit> -- docs/` to find every file the bad commit touched.
4. **Safe restore mechanism**: `git checkout <commit>~1 -- <path>` when only metadata was stripped and bodies are unchanged — no cherry-pick or revert needed.
