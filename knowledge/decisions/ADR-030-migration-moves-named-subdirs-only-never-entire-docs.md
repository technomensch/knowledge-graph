---
title: >-
  ADR-030: Migration Moves KMGraph-Named Subdirectories Only — Never the Entire
  docs/ Directory
---

# ADR-030: Migration Moves KMGraph-Named Subdirectories Only — Never the Entire docs/ Directory

## Status

Accepted

## Context

v0.3.0-beta introduces a `docs/` → `knowledge/` migration step in `kmgraph init`. The migration must move KMGraph-managed content to the new default path without touching unrelated project content.

The question is: what exactly should the migration move?

**Option A:** Move the entire `docs/` directory to `knowledge/`.
- Simpler shell logic.
- Catastrophically destructive if `docs/` is a documentation site root (MkDocs, Docusaurus, GitHub Pages). All site content would be relocated or destroyed.

**Option B:** Move only the KMGraph-named subdirectories (`lessons-learned/`, `decisions/`, `sessions/`, `knowledge/`, `chat-history/`, `tmp/`) plus root scaffold files (`me.md`, `rules.md`, `index.md`).
- Requires an explicit subdir list.
- Leaves all non-KMGraph content in `docs/` untouched.
- Requires a pre-flight fingerprint check to confirm the directory is a KMGraph installation before offering migration.

## Decision

**Option B:** Move only KMGraph-named subdirectories and scaffold files. Never move the entire `docs/` directory.

The migration subdir list is explicit and exhaustive:
```bash
SUBDIRS=("lessons-learned" "decisions" "sessions" "knowledge" "chat-history" "tmp")
SCAFFOLD_FILES=("me.md" "rules.md" "index.md")
```

Special case: if `knowledge/concepts/` exists, it is moved to `knowledge/concepts/` (not `knowledge/knowledge/`) using `rsync --ignore-existing` for merge-safety.

Symlinks in the subdir list are skipped with a warning — `mv` on a symlink produces unpredictable behavior.

The migration is only offered when at least two KMGraph-specific subdirectories are detected in `docs/` (fingerprint check). A single matching directory is insufficient signal.

## Consequences

- Non-KMGraph `docs/` content (site source files, assets, configuration) is never touched.
- Migration is safe to run alongside a documentation site in `docs/`.
- The subdir list must be kept in sync with KMGraph's directory schema. New top-level directories added to KMGraph must be added to this list.
- Partial `docs/` moves (e.g., a user manually moved some subdirs) are handled by the idempotent move loop: `[ -d "docs/$subdir" ] && mv ...`.

## Related

- [[ENH-010-specification]] — enhancement introducing this migration
- [[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]] — defines me.md/rules.md as scaffold files included in migration
- `docs/enhancements/ENH-010/edge-cases.md` — E2, E16, E17, E18, E23 document the specific failure modes this decision addresses
