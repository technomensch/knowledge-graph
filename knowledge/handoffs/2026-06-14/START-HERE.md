# Start Here — Project Handoff (2026-06-14)

**Branch:** v0.6.0-kg-recall-rename
**Commit:** 41bb3bdc
**Continues from:** knowledge/sessions/2026-06/2026-06-14-2026-06-14-v0511-kg-recall-rename.md

---

For current state, open issues, and in-progress work: read the session summary linked above.
For project structure and architecture: see DOCUMENTATION-MAP.md and ARCHITECTURE-SNAPSHOT.md in this package.

---

## Session Context (2026-06-14)

### What was completed this session

**v0.5.11 shipped (PR #143, merged to main) — security-only release:**
- esbuild HIGH vulnerability fixed in mcp-server (`npm audit fix`)
- Version bumped to 0.5.11 across all 6 version files
- Shipped separately from ENH-013 rename work

**Branch restructure:**
- Old branch `v0.5.11-kg-recall-rename` rebased onto origin/main → all commits already on main → branch dissolved
- New branch `v0.6.0-kg-recall-rename` created from main (commit 41bb3bdc)
- ENH-013 retargeted from v0.5.11 → v0.6.0

**ENH-013 spec updated:**
- `status: deferred` → `in-progress`
- `version_target: v0.5.11` → `v0.6.0`
- Chosen option A (`auto-recall`) documented

**Plan file created:**
- `knowledge/enhancements/ENH-013/v0.6.0-plan.md` — all version refs updated to v0.6.0
- Old `knowledge/enhancements/ENH-013/v0.5.11-plan.md` left in place (untracked, delete manually)

### What was NOT completed / next up

**ENH-013 implementation (Phases 1–5) — not started:**

- **Phase 1:** `mv skills/kg-recall/ skills/auto-recall/`; update `SKILL.md` frontmatter; update `commands/handoff.md` (2 places); update `docs/CHEAT-SHEET.md`
- **Phase 2:** grep audit (`grep -r "kg-recall" skills/ commands/ agents/ docs/`); update ENH-013 spec status → implemented
- **Phase 3:** Version bump 0.5.11 → 0.6.0 in `package.json`, `.claude-plugin/plugin.json`, `mcp-server/package.json`, `CHANGELOG.md`, `README.md`, `INSTALL.md`
- **Phase 4:** Plugin cache sync + verify skill fires on triggers
- **Phase 5:** Commit, push `v0.6.0-kg-recall-rename`, create PR

**Note on version bump timing:** Phase 3 should happen after any additional v0.6.0 scope is confirmed. No v0.6.0 plan exists yet — brainstorm was scheduled but interrupted. ENH-013 may ship alone as v0.6.0 or alongside other work.

**Unresolved scope question:** Is ENH-013 the only v0.6.0 item, or does v0.6.0 include the broader multi-platform + kmg-prefix normalization work (ENH-019)?

---

## Active KG

- **Name:** knowledge-graph
- **Path:** /Users/mkaplan/GitHub/knowledge-graph/knowledge

---

For project structure and architecture: see DOCUMENTATION-MAP.md and ARCHITECTURE-SNAPSHOT.md in this package.
