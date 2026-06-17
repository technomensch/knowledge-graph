---
title: Test Cases — ENH-005 FTS5 Database Relocation
---

# Test Cases: ENH-005 FTS5 Database Relocation

## TC-001: DB created at new path on first rebuild

**Setup:** No `.fts5.db` in project dir; no `~/.claude/kg-fts5/` directory exists
**Action:** Run `kg_fts5_rebuild`
**Expected:**
- `~/.claude/kg-fts5/` directory created
- `~/.claude/kg-fts5/{kg-name}.db` created and populated
- No `.fts5.db` in project dir
- Rebuild reports > 0 files indexed

## TC-002: Content root auto-detection (docs/ subdir)

**Setup:** KG root is `/path/to/repo`; content lives at `/path/to/repo/knowledge/lessons-learned/`
**Action:** Run `kg_fts5_rebuild`
**Expected:** Tool detects `docs/` subdir and indexes files from `/path/to/repo/docs/`; > 0 files indexed

## TC-003: Content root auto-detection (root)

**Setup:** KG root is `/path/to/project`; content lives at `/path/to/project/lessons-learned/`
**Action:** Run `kg_fts5_rebuild`
**Expected:** Tool uses KG root directly; > 0 files indexed

## TC-004: Search uses new DB path

**Setup:** Index built at `~/.claude/kg-fts5/{name}.db`
**Action:** Run `kg_search` with a known term
**Expected:** Results returned from new DB path; no attempt to read `{kgPath}/.fts5.db`

## TC-005: Legacy migration in init verify/upgrade

**Setup:** Old `.fts5.db` exists at `{kgPath}/.fts5.db`
**Action:** Run `/kmgraph:init` → verify/upgrade → Step 1f
**Expected:**
- Migration message displayed
- File moved to `~/.claude/kg-fts5/{name}.db`
- Old `{kgPath}/.fts5.db` deleted
- Search works after migration

## TC-006: No-op migration when no legacy file

**Setup:** No `.fts5.db` at `{kgPath}/`
**Action:** Run `/kmgraph:init` → verify/upgrade → Step 1f
**Expected:** Step completes silently with no output

## TC-007: Multiple KGs no conflict

**Setup:** Two KGs configured: `project-a` and `project-b`
**Action:** Rebuild index for each
**Expected:**
- `~/.claude/kg-fts5/project-a.db` contains only project-a content
- `~/.claude/kg-fts5/project-b.db` contains only project-b content
- Switching active KG switches which DB is used

## TC-008: Survives git pull

**Setup:** Index built; then `git pull` runs (does not touch `~/.claude/`)
**Action:** Run `kg_search` after pull
**Expected:** Search returns results without requiring rebuild

## TC-009: .gitignore does not contain .fts5.db

**Setup:** After ENH-005 implemented
**Action:** `grep "fts5" .gitignore`
**Expected:** No match — pattern removed
