---
title: Progress Log — ENH-005 FTS5 Database Relocation
---

# Progress Log: ENH-005 FTS5 Database Relocation

## Status: 🔴 PROPOSED

**Branch:** `v0.2.2-beta` (document-only until implementation approved)
**GitHub Issue:** #46

---

## 2026-03-30 — Issue initialized

- Created ENH-005 directory and specification docs
- Issue discovery: during `/kmgraph:status` check, FTS5 rebuild returned 0 files
- Root cause identified: DB stored in project dir (gitignored, lost on upgrade) + path mismatch for `docs/`-based content roots
- Compared to context-mode's `/tmp/{PID}.db` approach — confirmed user-level cache is the right model for persistent indexes
- Added to v0.2.2-beta plan as Phase Group 4.1
- GitHub issue #46 to be created

## Pending

- [ ] Create GitHub issue #46
- [ ] Update v0.2.2 plan Phase 4.1 to reference this ENH-005 directory
- [ ] Implement after ENH-001/002/003/004 complete on v0.2.2-beta
