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

**Scenario:** Migration moves files (step 3b) but fails before updating config (step 3c). Next init run sees `docs/lessons-learned/` missing (already moved) so trigger conditions fail. User is stuck with files at `knowledge/` but config still pointing to `docs/`.

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

**Scenario:** User renames or moves their project directory. `kg-config.json` still points to the old path. Phase 2 trigger checks whether the configured path ends in `/docs` — but the path doesn't exist on disk, so `docs/lessons-learned/` is never found. Migration never triggers, no error is shown, user wonders why nothing happened.

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
**Mitigation:** Remove `knowledge/` from the migration subdir list. If `docs/knowledge/` exists, prompt user to choose a new name (suggest `knowledge/concepts/`).

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
**Scenario:** Personal `~/.claude/knowledge-graph/rules.md` says "never use semicolons in JS." Project `knowledge/rules.md` says "always use semicolons." Platform shims read both but in unspecified order — which wins?
**Mitigation:** Document precedence: project `rules.md` > personal `rules.md`. Platform shims read personal rules first, then project rules (last-read wins). Document in ADR-028.

---

## Related

- [[ENH-010-specification]] — enhancement spec
- [[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]] — architecture decision
- `docs/plans/v0.3.0-beta.md` — implementation plan with mitigations
- Chat history references: `docs/chat-history/2026-02/2026-02-17-claude.md`, v0.0.6-alpha ROADMAP entry
