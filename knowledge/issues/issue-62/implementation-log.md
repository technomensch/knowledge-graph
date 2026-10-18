# issue-62: Implementation Log

## 2026-10-18 — Tracking opened

- Found while running v0.7.11 release checks; confirmed it fails on a clean copy of main, so it did not break during v0.7.11.
- Prior-art recall and a caller search found no caller of the script. See the description.
- Opus reviewed the "move into `kg_check_sensitive`" idea and recommended against it; the author's own code check agreed.
- User chose: rewrite the script to two checks. Workflow: track then implement. Branch: `v0.7.11.1-fix-validate-plugin` (worktree cut from `v0.7.11-kg-frontmatter-links` at `876e6ecb`). Version: patch-sized, folded into the unreleased 0.7.11 line.
- Files written by hand into the worktree's `knowledge/` folder, because the graph tools still resolve to the original folder when run from a worktree.

## 2026-10-18 — Opus review and decision

- Opus reviewed the plan and paperwork (11 findings), then re-checked the fixes (7 small items). Findings verified independently; all applied except the ones tied to open decisions.
- User decided the scan scope: only what ships to users; `knowledge/` is excluded.
- User accepted the recommended answers for the other two open decisions: names stay in the public script; the CHANGELOG entry goes under `[Unreleased]`.
- Lesson capture: user replied "skip knowledge", read as declining the lesson capture for now.

## 2026-10-18 — Implemented

- Rewrote `scripts/validate-plugin.sh` (two checks, tracked files outside `knowledge/`, exit 0/1/2). Corrected `docs/reference/hooks.md` line 76. Reworded the old CHANGELOG line and added a `### Fixed` entry under `[Unreleased]`.
- Verification: test cases 1 to 15 pass; docs build passes; the script exits 0 on the branch. `npm install` changed `package-lock.json` by two lines; restored.
- Opus audit (Review Audit Protocol): no blockers. Applied: status set to resolved, a script comment about the home-path check, and the plan's Prior Art and Docs Updates sections. Left alone: the script needs bash (not `dash`), as before; the push/PR structure is a decision for push time; broken links in the issues index predate this work.

