---
title: "Lesson: Git Rename Detection Preserves History Through Moves"
created: 2026-02-16T00:00:00Z
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: main
  commit: 37f7e544e5b3b2f1c9a7d5e3f1b9a7c5e3f1b9a7
  pr: null
  issue: null
sources: []
tags: [patterns, git, refactoring, version-control]
category: patterns
---

# Lesson Learned: Git Rename Detection Preserves History Through Moves

**Date:** 2026-02-16
**Category:** patterns
**Version:** 1.0

---

## Problem

When refactoring directory structures (moving files), there's concern about losing git history. Initial assumption: moving a file breaks its commit history, requiring manual preservation.

**Context:**
- Project: Knowledge Graph plugin v0.0.1 directory reorganization
- Need: Move files between directories without losing history
- Question: Does `git mv` or directory restructuring preserve history?

---

## Root Cause Discovery

Git's rename detection algorithm (based on content similarity, not just file paths) automatically detects when a file has been moved, even if:
- The move is done without explicit `git mv`
- Files are simply copied to new location and deleted from old
- Directory structure changes dramatically

**Technical Detail:**
- Git compares content across commits (similarity threshold ~60%)
- If content matches and paths diverge → git infers rename/move
- This is automatic on `git log --follow` and in tools like GitHub

---

## Solution Implemented

Use either approach; git handles both:

**Approach A: Explicit git mv**
```bash
git mv old/path/file.md new/path/file.md
```

**Approach B: Copy + delete + commit**
```bash
cp old/path/file.md new/path/file.md
git rm old/path/file.md
git add new/path/file.md
git commit -m "refactor: move file.md to new structure"
```

Both result in continuous history when viewed with `git log --follow new/path/file.md`.

---

## Evidence

**Key Finding:** Git's content-based rename detection is extremely reliable. Moving a file mid-project and later viewing its history shows all commits, including before the move.

**Validation:**
```bash
git log --follow docs/decisions/ADR-005-defer-memory-rules-engine.md
# Shows history from when file was originally created AND from rename
```

---

## Replication Pattern

**For Large Refactorings:**

1. **Plan moves:** Identify all files to move
2. **Execute moves:** Use `git mv` or copy+delete (both work)
3. **Commit moves:** Single commit: "refactor: restructure directory"
4. **Verify history:** `git log --follow path/to/file` shows continuous history

**Benefits:**
- No manual history rewriting needed
- Git handles the heavy lifting
- Tools (GitHub, GitLab) automatically show full history
- Clean refactoring without archaeology

**Prevention (for future refactorings):**
- Use `git mv` for clarity and explicitness
- Always use `--follow` flag when viewing history of moved files
- Document move rationale in commit message

---

## Lessons & Takeaways

**Key Insights:**
1. Git's rename detection is invisible but powerful
2. Directory refactoring is safe and history-preserving
3. Don't avoid refactoring out of fear of losing history

**What Worked Well:**
- Large-scale directory moves preserved full history automatically
- Multiple files can be moved in single commit
- History remains queryable and viewable

**If We Had to Do It Again:**
- Use `git mv` for explicit intent (even though copy+delete works)
- Document why the move is happening in commit message
- Always verify history after moves with `git log --follow`

---

## Related ADRs

- [ADR-003: Abandon Shadow Commands; Use File Prefix](../../decisions/ADR-003-abandon-shadow-commands-for-file-prefix.md) — File organization patterns

---

**Version:** 1.0
**Created:** 2026-02-16
**Last Updated:** 2026-02-22
