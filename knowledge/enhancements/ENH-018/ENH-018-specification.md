---
id: ENH-018
type: Enhancement
status: deferred
version: v0.6.x (next available minor)
branch: none (deferred — will branch from main)
created: 2026-05-27
related-adrs: []
---

# ENH-018: Rules File H2 Structure Hardening

## Problem Statement

Rules split files (`plan-rules.md`, `governance-rules.md`, and any future split files) use H3s as their top-level content sections, with a single H2 wrapper (e.g., `## Plan Protocol`) that adds no navigational value. This creates three compounding problems:

1. **Quick navigation anchors point to H3s** — fragile, break when sections are renamed or reordered
2. **Init scripts don't enforce H2 structure** — new users get the same structural debt when rules files are scaffolded
3. **Existing users have the old format** — no upgrade path to migrate H3-structured rules files

## Root Cause

When `rules.md` was split into focused files, the split preserved the internal H3 structure without promoting sections to H2. The `## Plan Protocol` wrapper heading was carried over but is not semantically useful as a navigation anchor.

## Scope

### In Scope

**User-level profile files (immediate fix for maintainer):**
- Promote key H3s → H2s in `~/.kmgraph/plan-rules.md`
- Promote key H3s → H2s in `~/.kmgraph/governance-rules.md`
- Update quick navigation headers to reflect H2 anchors

**Repo-side hardening (requires branch + PR):**
- Update `core/templates/` rules file templates to scaffold with H2 structure
- Update `commands/init.md` init wizard to create rules split files with H2 sections
- Update `commands/init-shared/upgrade-inspector.md` — detect H3-only rules files and offer migration
- Update `knowledge/rules.md` § Rules File Management — add H2 structure requirement to split checklist (note: partially done 2026-05-27)
- Update `plan-rules.md` template reference (if in core/)
- Docs update: PATTERNS-GUIDE or equivalent

### Out of Scope

- Changing the content or logic of any rules
- Migrating other users' profile files (handled by upgrade-inspector)

## Cascading Impact

| Artifact | Impact | Remediation |
|---|---|---|
| `~/.kmgraph/plan-rules.md` | H3→H2 promotion changes anchors | Update quick nav header |
| `~/.kmgraph/governance-rules.md` | Same | Same |
| `core/templates/` rules template | Must scaffold H2 structure | Update template |
| `commands/init.md` | Must seed H2 structure on new KG init | Update init step |
| `commands/init-shared/upgrade-inspector.md` | Must detect + offer H3→H2 migration | Add detection rule |
| `knowledge/rules.md` § Rules File Management | Split checklist missing H2 requirement | Add checklist item (partially done) |
| Existing user profile files | Structural debt, no anchors at H2 | Upgrade-inspector migration offer |

## Acceptance Criteria

- [ ] `plan-rules.md` and `governance-rules.md` use H2 for all top-level sections
- [ ] Quick navigation headers in both files link to H2 anchors
- [ ] Init wizard scaffolds rules split files with H2 structure
- [ ] Upgrade inspector detects H3-only rules files and offers migration
- [ ] `core/templates/` rules template uses H2 structure
- [ ] `knowledge/rules.md` § Rules File Management includes H2 structure requirement

## Open Questions

- Should the H2 structure standard be formally documented in an ADR, or is the rules.md checklist item sufficient?
- Does `governance-rules.md` need a wrapper H2 or can all sections be top-level H2s with no parent?
