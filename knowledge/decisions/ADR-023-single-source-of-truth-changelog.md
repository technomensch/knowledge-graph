# ADR-023: Single Source of Truth for CHANGELOG — Root File Included by MkDocs

**Date:** 2026-03-28
**Status:** Accepted — Implemented (symlink, v0.2.1-beta)
**Implements:** v0.2.2 — eliminate dual-changelog maintenance burden
**Related:** [ADR-021](ADR-021-single-source-of-truth-dry-documentation.md), [Lesson: Dual Changelog Both Must Be Updated](../lessons-learned/process/Lessons_Learned_Dual_Changelog_Both_Must_Be_Updated.md)

---

## Context

Two CHANGELOG files exist in this project:

- `CHANGELOG.md` (project root) — GitHub-facing; shown on the repo landing page
- `docs/CHANGELOG.md` — MkDocs-served; shown in the documentation site

Both are hand-maintained Markdown files. Neither is generated from the other. This creates a dual-maintenance requirement that is easy to miss — as demonstrated in v0.2.1-beta, where the root file was created/updated but `docs/CHANGELOG.md` was not touched, leaving the user-facing docs site showing a changelog that stopped at v0.1.2-beta.

**The problem is structural:** Any process that requires two manual updates to stay in sync will eventually produce a divergence. The fix must be architectural, not procedural.

**Scope:**
- In scope: eliminating the need to maintain two separate CHANGELOG files
- Out of scope: the format or content of the CHANGELOG itself

---

## Decision

**Establish `CHANGELOG.md` (root) as the single authoritative source.**

Configure MkDocs to include the root `CHANGELOG.md` directly in the docs build, replacing the hand-maintained `docs/CHANGELOG.md`.

### Implementation Options

**Option A: MkDocs `docs_dir` symlink (simplest)**
Create a symlink: `docs/CHANGELOG.md → ../CHANGELOG.md`
- MkDocs follows symlinks by default
- No plugin required
- Git does not commit symlink targets — symlink itself is committed

**Option B: mkdocs-include-markdown-plugin (most explicit)**
Replace `docs/CHANGELOG.md` with a single-line include:
```markdown
{!../CHANGELOG.md!}
```
Requires the `mkdocs-include-markdown-plugin` (already used in this project for other includes).

**Option C: docs/hooks.py copy step (most portable)**
Add a MkDocs hook that copies `CHANGELOG.md` to `docs/CHANGELOG.md` at build time.
- `docs/CHANGELOG.md` becomes a generated file (add to `.gitignore`)
- No new plugin dependency
- Requires adding hook logic

### Chosen Option

**Option A (symlink)** — simplest, no plugin dependency, implemented in v0.2.1-beta.

```bash
rm docs/CHANGELOG.md
ln -s ../CHANGELOG.md docs/CHANGELOG.md
```

`docs/CHANGELOG.md` is now a symlink to `../CHANGELOG.md`. MkDocs resolves it at build time. The `gh-pages` branch receives the resolved file. No plugin required.

**Result:** Edit only `CHANGELOG.md` at the project root. MkDocs renders it at the docs URL automatically.

---

## Consequences

**Benefits:**
- Eliminates dual-maintenance: one file to update on every release
- Root `CHANGELOG.md` is always in sync with the docs site by construction
- GitHub and MkDocs users see identical content
- Consistent with ADR-021 (Single Source of Truth for Documentation)

**Trade-offs:**
- Requires mkdocs-include-markdown-plugin (already a dependency — no new requirement)
- `docs/CHANGELOG.md` becomes a generated stub (must be clearly marked as such)
- If `docs/CHANGELOG.md` was previously the more comprehensive history, that history must be migrated to root `CHANGELOG.md` before switching

**Migration note:** `docs/CHANGELOG.md` currently contains more history than the root file (v0.1.2-beta and earlier). The root file must be updated to include the full history before `docs/CHANGELOG.md` is converted to an include stub.

---

**Supersedes:** Implicit dual-maintenance convention
**Reviewed by:** Claude Sonnet 4.6
