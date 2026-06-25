---
title: "Migration Must Rewrite Cross-References — Not Just Move Files"
category: patterns
tags: ["migration", "cross-references", "markdown", "path-rewrite", "commands"]
created: 2026-04-10
branch: v0.3.1-init-shared-refactor
commit: 7bd20bd6
author: technomensch
---

## Problem

The `docs/ → knowledge/` path migration in `commands/init.md` moved files and updated
`.gitignore` but left internal markdown cross-references pointing at old `docs/` paths.
Links like `[See also](knowledge/lessons-learned/...)` in KG files, CLAUDE.md, and README.md
would silently break after migration.

## Root Cause

The migration was designed as a file-move operation only. Cross-references inside files
were not considered part of the migration scope.

## Solution

Add a rewrite step after the file move and `.gitignore` update that rewrites
`docs/{subdir}/` to `knowledge/{subdir}/` inside all migrated `.md` files plus CLAUDE.md
and README.md. Example using `find | sed`:

```bash
find knowledge/ CLAUDE.md README.md -name "*.md" \
  | xargs sed -i '' 's|knowledge/lessons-learned/|knowledge/lessons-learned/|g; \
                     s|knowledge/decisions/|knowledge/decisions/|g; \
                     s|knowledge/sessions/|knowledge/sessions/|g'
```

Emit a warning for MEMORY.md entries under `~/.claude/projects/` which cannot be
auto-rewritten (they reference file paths stored in a separate user-controlled location).

## When to Apply

Any time a migration moves files to a new path:

1. Audit for internal cross-references in markdown, config files, and memory systems.
2. Categorize references by type: inline links, frontmatter fields, shell variables,
   import paths.
3. Include an explicit rewrite step for each category.
4. Emit warnings for categories that cannot be auto-rewritten (e.g., user memory files,
   external wikis).

Do not mark a migration step complete until all reference categories are accounted for.

## Context

- Affected file: `commands/init.md`
- Branch: v0.3.1-init-shared-refactor
- Commit: 7bd20bd6
- Category: patterns
