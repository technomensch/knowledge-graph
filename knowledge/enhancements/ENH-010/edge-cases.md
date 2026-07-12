---
title: "ENH-010 Edge Cases — v0.3.0-beta"
date: 2026-04-09
tags: [edge-cases, v0.3.0-beta, ENH-010, init, migration, scaffold]
---
# ENH-010 Edge Cases — v0.3.0-beta

Edge cases identified during planning (2026-04-09). Some are theoretical; others are validated by real incidents in chat history. All mitigations are documented here and referenced in the plan.

---

## Real-World Validated Edge Cases

These occurred in prior sessions and are documented in chat history.

---

### E2 — `knowledge/` already exists with non-KMGraph content
**Type:** Real-world (validated)
**Phase:** Phase 1 — Scaffold
**Source:** `docs/chat-history/2026-02/2026-02-17-claude.md` — init design included the prompt `"docs/ already exists. Merge with existing structure? [y/N] — If yes: Create only missing subdirectories, don't overwrite"` for exactly this scenario with the old `docs/` default.

**Scenario:** A project uses `knowledge/` for something else (ML training data, Obsidian vault, etc.). Init runs and blindly creates KMGraph subdirectories inside it, mixing content.

**Mitigation:** Pre-flight check: if `$KG_PATH` exists without KMGraph markers (`lessons-learned/`, `decisions/`), prompt user to merge (create only missing subdirs) or abort. Never silently overwrite.

---

### E3 — Partial migration leaves orphaned state
**Type:** Real-world (validated)
**Phase:** Phase 2 — Migration
**Source:** v0.0.6-alpha release: "Fixed stale `kg-config.json` path (knowledge-graph-plugin → knowledge-graph)." User had to manually clean up orphaned plugin entries from `~/.claude.json` after a repository rename. Confirmed that config path staleness is a recurring production problem.

**Scenario:** Migration moves files (step 3b) but fails before updating config (step 3c). Next init run sees `knowledge/lessons-learned/` missing (already moved) so trigger conditions fail. User is stuck with files at `knowledge/` but config still pointing to `docs/`.

**Mitigation:** Atomic migration: write `"migration_in_progress": true` to kg-config.json before moving files. Clear flag after config update completes. Re-running init while flag is set offers resume/rollback/skip.

---

### E14 — `me.md` always-gitignored conflicts with user's git strategy choice
**Type:** Real-world (validated)
**Phase:** Phase 1 — Gitignore
**Source:** `docs/chat-history/2026-02/2026-02-17-claude.md` — the init wizard had an explicit `git_strategy` selector: `"all-commit" | "all-ignore" | "selective"` with per-category rules. This means users can and do configure KMGraph to commit everything.

**Scenario:** User chose `git_strategy: "all-commit"` during init. They expect everything in `knowledge/` to be committed. But `me.md` is silently gitignored regardless. They push, a teammate pulls, `me.md` is missing, no error is shown.

**Mitigation:** Step 1.7 must add `knowledge/me.md` to `.gitignore` unconditionally AND print an explicit note: `"knowledge/me.md is always personal — gitignored regardless of your git strategy. Each contributor maintains their own copy."`

---

### E15 — Stale `kg-config.json` path silently fails migration trigger
**Type:** Real-world (validated)
**Phase:** Phase 2 — Migration trigger
**Source:** v0.0.6-alpha release: "Fixed stale `kg-config.json` path (knowledge-graph-plugin → knowledge-graph)." Repository was renamed multiple times; each rename left orphaned entries. Also: `docs/chat-history/2026-02/2026-02-17-claude.md` — user explicitly had to clean up orphaned plugin entries due to renaming.

**Scenario:** User renames or moves their project directory. `kg-config.json` still points to the old path. Phase 2 trigger checks whether the configured path ends in `/docs` — but the path doesn't exist on disk, so `knowledge/lessons-learned/` is never found. Migration never triggers, no error is shown, user wonders why nothing happened.

**Mitigation:** Before evaluating trigger conditions, verify the configured path exists on disk. If it doesn't, surface a warning with options to update or skip.

---

### E16 — Fresh init writes into existing non-KMGraph `knowledge/` directory
**Type:** Real-world (validated)
**Phase:** Phase 1 — Fresh install
**Source:** Same as E2 — the `docs/` version of this check was designed specifically because it happened.

**Scenario:** Same as E2 but for a fresh install (no migration involved). User has `knowledge/` as a pre-existing project directory. Init is run for the first time. No migration trigger runs (no existing `docs/` layout). `mkdir -p` silently creates KMGraph subdirs inside the existing directory.

**Mitigation:** Same pre-flight check as E2 — applies to both fresh install and migration paths.

---

## Theoretical Edge Cases

These were identified through design analysis, not observed incidents.

---

### E1 — `docs/knowledge/` creates `knowledge/knowledge/` nesting
**Type:** Theoretical
**Phase:** Phase 2 — Migration subdir list
**Scenario:** User has `docs/knowledge/` as a KMGraph subdir (used in some early setups). Migration moves it to `knowledge/knowledge/` instead of handling the naming collision.
**Mitigation:** Remove `knowledge/` from the migration subdir list. If `docs/knowledge/` exists, move to `knowledge/concepts/` using the E17 merge-safe logic below.

---

### E3 — Partial migration leaves orphaned state
*(Updated 2026-04-10 — rollback implementation added)*

**Type:** Real-world (validated)
**Phase:** Phase 2 — Migration
**Source:** v0.0.6-alpha release: "Fixed stale `kg-config.json` path (knowledge-graph-plugin → knowledge-graph)."

**Scenario:** Migration moves files (step 3b) but fails before updating config (step 3c). Next init run sees `knowledge/lessons-learned/` missing (already moved) so trigger conditions fail.

**Mitigation:** Atomic migration with `migration_in_progress` flag. Re-running init while flag is set offers resume/rollback/skip. Rollback is fully implemented (Task M5, v0.3.2): reverses all file moves, cross-reference rewrites, and config changes with its own `rollback_in_progress` guard. If rollback itself is interrupted, re-running init detects `rollback_in_progress` and offers resume-rollback.

---

### E4 — `CLAUDE.md.bak` collision on repeated migration attempts
**Type:** Theoretical
**Phase:** Phase 3B — Content migration rollback
**Scenario:** A previous partial migration run left `CLAUDE.md.bak`. A second run overwrites it, destroying the only clean backup.
**Mitigation:** Use timestamped backups: `CLAUDE.md.bak.2026-04-09` instead of `.bak`.

---

### E5 — Gitignore rewrite fails silently on customized gitignore patterns
**Type:** Theoretical
**Phase:** Phase 2 — Gitignore update after migration
**Scenario:** User's `.gitignore` has custom patterns (e.g., `docs/sessions/**` instead of `docs/sessions/`). String replacement of `docs/sessions/` finds no match and silently produces no update.
**Mitigation:** Use additive approach: append new `knowledge/` rules, comment out old `docs/` rules with `# migrated to knowledge/` rather than replacing.

---

### E6 — Teammate-committed `rules.md` overwritten on second developer's init
**Type:** Theoretical
**Phase:** Phase 3A — Scaffold
**Scenario:** Developer A commits `knowledge/rules.md`. Developer B clones the repo and runs `/kmgraph:init`. Init scaffolds a fresh `rules.md` template, overwriting Developer A's version.
**Mitigation:** Before scaffolding `rules.md` or `index.md`, check if file already exists. If yes, skip and print: `"rules.md already exists — skipping scaffold (teammate copy preserved)."` `me.md` is gitignored so always safe to scaffold fresh.

---

### E7 — CLAUDE.md content migration has no parsing spec
**Type:** Theoretical
**Phase:** Phase 3B — Content migration offer
**Scenario:** CLAUDE.md files in practice have inconsistent structure (`##` headers, `#` headers, flat lists). The plan says "parse CLAUDE.md sections" but gives no heuristic, so the migration offer either fails or produces wrong mappings.
**Mitigation:** Define parsing heuristic: sections = `##`-level headings. Map by keyword: "workflow/convention/rule/always/never" → `rules.md`; "role/identity/preference/style" → `me.md`. Unclassifiable sections stay in CLAUDE.md. Always show mapping before writing.

---

### E13 — Cross-KG precedence undefined when personal and project rules.md conflict
**Type:** Theoretical
**Phase:** Phase 3A — Two-level hierarchy
**Scenario:** Personal `~/.kmgraph/rules.md` says "never use semicolons in JS." Project `knowledge/rules.md` says "always use semicolons." Platform shims read both but in unspecified order — which wins?
**Mitigation:** Document precedence: project `rules.md` > personal `rules.md`. Platform shims read personal rules first, then project rules (last-read wins). Document in ADR-028.

---

---

## Migration Hardening Edge Cases (v0.3.2)

Identified 2026-04-10 via Opus audit. Two were fixed in v0.3.0-beta (E-beta-1, E-beta-2 below). Remaining 9 addressed in v0.3.2 (Tasks M1–M5).

---

### E-beta-1 — Shell boolean guard exit code trap *(fixed in v0.3.0-beta)*
**Type:** Implementation bug
**Phase:** upgrade-inspector detection script
**Scenario:** `$skip && continue` executes the string `false` as a shell command, returning exit code 1. Script exits with error even though it completed correctly.
**Fix:** `[ "$skip" = "true" ] && continue`. Landed commit `7ad95cc6`.

---

### E-beta-2 — Cross-references not rewritten after migration *(fixed in v0.3.0-beta)*
**Type:** Implementation gap
**Phase:** Phase 2 — Migration execution
**Scenario:** Files are moved but `[link](knowledge/lessons-learned/...)` references inside `.md` files, CLAUDE.md, and README.md remain pointing at old paths. Links break silently.
**Fix:** Added step `e2` — `find | sed` pass over all migrated files and platform configs. Landed commit `7ad95cc6`.

---

### E17 — `knowledge/concepts/` already exists when merging `docs/knowledge/`
**Type:** Theoretical
**Phase:** Phase 2 — Migration special case (extends E1)
**Scenario:** Migration detects `docs/knowledge/` and tries to rename it to `knowledge/concepts/`, but `knowledge/concepts/` already exists (manual creation or prior interrupted migration). `mv` creates `knowledge/concepts/knowledge/` nesting.
**Mitigation:** Pre-check before rename: if `knowledge/concepts/` exists, use `rsync -a --ignore-existing` to merge then `rm -rf docs/knowledge`. (Task M1)

---

### E18 — Root scaffold files stranded in `docs/` after migration
**Type:** Theoretical
**Phase:** Phase 2 — Migration move loop
**Scenario:** User ran init on v0.3.0-beta with `docs/`-based path, creating `docs/me.md`, `docs/rules.md`, `docs/index.md`. Migration subdir loop only moves named subdirectories; these root-level files are left behind in `docs/`.
**Mitigation:** After the subdir loop, add an explicit file move pass: `for f in me.md rules.md index.md`. (Task M1)

---

### E19 — `.gitignore` sed patterns incomplete after migration
**Type:** Theoretical
**Phase:** Phase 2 — Migration step e
**Scenario A:** User has `docs/tmp/` or `docs/me.md` in `.gitignore`. Migration sed patterns don't cover them; rules become stale pointing at the old path.
**Scenario B:** User has `all-ignore` strategy with blanket `docs/` rule in `.gitignore`. Migration rewrites specific sub-paths but the blanket `docs/` rule remains, inadvertently hiding legitimate docs content and leaving `knowledge/` unignored.
**Mitigation:** Add `docs/tmp/` and `docs/me.md` patterns to step e. Add blanket `docs/` rewrite guarded by confirmation that KMGraph owned the path. (Task M2)

---

### E20 — Platform config files not rewritten during migration
**Type:** Theoretical
**Phase:** Phase 2 — Migration step e2
**Scenario:** User has `GEMINI.md`, `.cursorrules`, `.windsurfrules`, `.github/copilot-instructions.md`, or `.aider.conf.yml` referencing `knowledge/lessons-learned/` paths. Step e2 only rewrites `CLAUDE.md` and `README.md`; platform files retain stale paths.
**Mitigation:** Expand step e2 platform file loop to include all files init can write. (Task M3)

---

### E21 — MEMORY.md stale references not surfaced
**Type:** Theoretical
**Phase:** Phase 2 — Migration step e2
**Scenario:** User has memory entries under `~/.claude/projects/` referencing `docs/` paths (e.g., links to specific lesson files). Migration emits a generic warning but doesn't identify which entries are stale.
**Mitigation:** Replace passive warning with active scan: `find ~/.claude/projects/ -path "*{project}*/memory/MEMORY.md"`, grep for `docs/(lessons-learned|decisions|sessions|knowledge)`, surface specific stale lines. Cannot auto-rewrite (memory files have structured frontmatter). (Task M3)

---

### E22 — Sibling KG config entries not updated after migration
**Type:** Theoretical
**Phase:** Phase 2 — Migration step d
**Scenario:** Multiple KG entries in `kg-config.json` point to the same `docs/` path (e.g., a project and a personal KG both registered at the same location). Migration updates the primary entry but leaves siblings stale.
**Mitigation:** After updating primary path, scan all entries for exact path match and offer to update. Use exact match, not prefix, to avoid false positives. (Task M2)

---

### E23 — Symlinked KMGraph subdirs cause unexpected behavior during move
**Type:** Theoretical
**Phase:** Phase 2 — Migration move loop
**Scenario:** A KMGraph subdir (e.g., `docs/sessions/`) is a symlink to an external location. `mv` moves the symlink itself, orphaning or duplicating the symlink target unpredictably.
**Mitigation:** Check `[ -L "docs/$subdir" ]` before `mv`; skip symlinks with a warning to move manually. (Task M1)

---

### E24 — `sed -i ''` fails on Linux
**Type:** Implementation bug
**Phase:** Phase 2 — All sed calls in migration block
**Scenario:** Migration uses `sed -i ''` (BSD/macOS syntax). On Linux (GNU sed), this produces a syntax error. Users on Linux cannot complete migration.
**Mitigation:** Add `_sed_inplace` helper that detects GNU vs BSD sed and uses the correct syntax. Replace all `sed -i ''` calls in the migration block. (Task M4)

---

### E25 — Rollback itself can be interrupted
**Type:** Theoretical
**Phase:** Phase 2 — Rollback (E3 recovery)
**Scenario:** User selects rollback after an interrupted migration. Rollback starts reversing file moves but is itself interrupted (crash, context limit). Next init run still sees `migration_in_progress: true` but some files are partially reversed — inconsistent state.
**Mitigation:** Rollback sets its own `rollback_in_progress: true` flag before starting and clears both flags on completion. If init detects `rollback_in_progress`, it offers resume-rollback with the same resume/skip options. (Task M5)

---

## Related

- [[ENH-010-specification]] — enhancement spec
- [[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]] — architecture decision
- [[ADR-064-shared-module-pattern-for-slash-command-deduplication]] — init-shared refactor + migration amendment
- `docs/plans/v0.3.0-beta.md` — implementation plan with mitigations (Phase 4 added 2026-04-10)
- Chat history references: `docs/chat-history/2026-02/2026-02-17-claude.md`, v0.0.6-alpha ROADMAP entry
