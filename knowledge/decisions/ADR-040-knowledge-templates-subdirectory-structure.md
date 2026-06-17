---
title: 'ADR-040: Restructure Knowledge Templates into Subdirectory'
category:
  uri: uri-that-does-not-map-to-architecture
---

# ADR-040: Restructure Knowledge Templates into Subdirectory

**Date:** 2026-04-21
**Status:** Accepted
**Implements:** v0.4.3-beta
**Related:** ADR-009 (three-tier installation), ADR-028 (me.md and rules.md as source of truth), ADR-032 (platform-specific directives), ADR-033 (triggers.md), ADR-037 (default rules seeding), ADR-039 (profile terminology)

---

## Context

Template starter files (`concepts.md`, `gotchas.md`, `patterns.md`, `workflows.md`, `architecture.md`) currently deploy to the root of `knowledge/`. With the addition of user and project profile templates (`me.md`, `rules.md`, `triggers.md` variants per ADR-028, ADR-033, ADR-039), the root becomes a mix of template reference files and actual live project files (`me.md`, `rules.md`, `triggers.md`, `kg-category-index.md`).

**Problem:**
- Template files and active project files coexist at the same level with no visual or structural distinction
- As the template set grows (now 11+ files across user/project profile and content types), root-level clutter makes the knowledge directory unreadable
- New users cannot easily distinguish "copy this as a starting point" from "this is your live configuration"
- The user-vs-project profile distinction (ADR-039) is impossible to communicate through a flat file layout

**Scope:**
- In scope: reorganizing all template/example files into `knowledge/templates/`
- In scope: `directory-scaffold` shared module, `init`, `init-personal-kg`, and `upgrade` commands
- Out of scope: moving live project files (`me.md`, `rules.md`, `triggers.md` at root) — those stay at `knowledge/` root as before

---

## Decision

Move all template and example starter files into a structured `knowledge/templates/` subdirectory with the following layout:

```
knowledge/templates/
  user/
    me.md          — user profile identity starter
    rules.md       — user-level cross-project rules starter
    triggers.md    — user-level triggers starter
  project/
    me.md          — project identity starter
    rules.md       — project-level rules starter (includes kmgraph-defaults block per ADR-037)
    triggers.md    — project-level triggers starter
  architecture.md
  concepts.md
  gotchas.md
  patterns.md
  workflows.md
```

### Core Components

1. **`templates/user/`** - Starter content for `~/.kmgraph/` profile files. Used by `init-personal-kg` to seed the user profile on first setup.
2. **`templates/project/`** - Starter content for `knowledge/` project profile files. Used by `init` to seed a new project KG. The `rules.md` here contains the `<!-- kmgraph-defaults -->` block (ADR-037).
3. **`templates/*.md`** - General knowledge content templates (architecture, concepts, gotchas, patterns, workflows). Unchanged in content; moved from root to subdirectory.

### Implementation Approach

- `directory-scaffold` shared module updated to read templates from `templates/` subdirectory
- `init` and `init-personal-kg` updated to reference new paths
- `upgrade` command adds a migration step: offers to move existing root-level template files to `knowledge/templates/` with user confirmation

---

## Rationale

### Why This Approach

1. **Clear contract:** `knowledge/templates/` = reference examples, never edited directly. `knowledge/` root = live project files. The distinction is structural, not naming-convention-dependent.
2. **Solves user-vs-project confusion:** `templates/user/` vs `templates/project/` makes the profile hierarchy (ADR-039) immediately visible in the file tree. A new user can open both side by side and understand the distinction without reading documentation.
3. **Scales cleanly:** Adding new template types (e.g., `templates/project/platform.md`) requires adding one file to the right subdirectory — no root clutter, no naming conventions to remember.
4. **Consistent with ADR-037:** The `<!-- kmgraph-defaults -->` marker in `templates/project/rules.md` is the authoritative source for seeded default rules. Moving it into a named subdirectory makes its role unambiguous.

### Alternatives Considered

**Option A: Flat files with prefixes (`user-example-me.md`, `project-example-rules.md`)**
- Pros: no structural change, just renaming
- Cons: root stays cluttered; naming convention is fragile and verbose; doesn't visually communicate the user/project hierarchy
- Rejected: doesn't solve the discoverability or clarity problem

**Option B: Keep templates at root, add a README**
- Pros: no migration needed
- Cons: a README doesn't fix the structural confusion; new files still land at root
- Rejected: cosmetic fix, not structural

### Trade-offs

**Benefits:**
- Clean separation of templates from live files
- User-vs-project distinction visible in file tree
- Scales to any number of template types without root clutter
- Easier to reference in documentation ("see `knowledge/templates/`")

**Costs:**
- Migration step required for existing deployments
- `directory-scaffold`, `init`, `init-personal-kg` all need path updates

**Mitigation:**
- Upgrade command handles migration with user confirmation — no silent moves
- Path changes are localized to scaffold/init modules; command behavior is unchanged

---

## Consequences

### Positive

1. **Clarity:** New users immediately understand what is a template vs. what is live configuration
2. **Profile hierarchy visible:** `templates/user/` vs `templates/project/` teaches ADR-039 terminology through structure
3. **Maintainability:** Template additions require no naming decisions — correct location is obvious

### Negative

1. **Migration required:** Existing deployments have template files at root; upgrade step needed
2. **Init path updates:** Three modules (`directory-scaffold`, `init`, `init-personal-kg`) need path changes

### Neutral

1. Template file content is unchanged — only location moves
2. Live project files (`me.md`, `rules.md`, `triggers.md` at root) are unaffected

---

## Implementation

**Timeline:** v0.4.3-beta

**Affected Components:**
- `commands/init-shared/directory-scaffold` — update template source paths
- `commands/init.md` — update template reference paths
- `commands/init-personal-kg.md` — update template reference paths
- `commands/upgrade.md` (or upgrade skill) — add migration step with user confirmation
- `core/templates/knowledge/` — restructure into `user/`, `project/`, and root content types

**Migration Path for Existing Deployments:**

Upgrade command prompts:
> "Template files (`concepts.md`, `gotchas.md`, etc.) can be moved to `knowledge/templates/` for a cleaner structure. Move them now? (Recommended — your live files are unaffected)"

If yes: move files, update any internal links. If no: leave in place, note that future init runs will use the new structure.

---

## Validation

**Success Criteria:**
- `knowledge/` root contains only live project files after init
- `knowledge/templates/user/` and `knowledge/templates/project/` are present after init
- `init-personal-kg` seeds `~/.kmgraph/` from `templates/user/`
- `init` seeds `knowledge/` from `templates/project/`
- Upgrade correctly offers migration and moves files without data loss
- Existing deployments that decline migration continue to function

**Review Date:** After v0.4.3-beta release and first upgrade cycle

---

## Related Decisions

- **[ADR-009](ADR-009-three-tier-installation-architecture.md):** Three-tier installation — template paths flow through the same install tiers
- **[ADR-028](ADR-028-me-and-rules-as-platform-agnostic-source-of-truth.md):** me.md and rules.md as source of truth — templates seed these files
- **[ADR-037](ADR-037-default-rules-for-graph-deployment.md):** Default rules seeding — `templates/project/rules.md` is the authoritative source for the kmgraph-defaults block
- **[ADR-039](ADR-039-profile-terminology.md):** Profile terminology — `templates/user/` and `templates/project/` make the vocabulary structural

---

## Future Considerations

1. **Community templates:** The `templates/` structure could eventually support community-contributed template packs installed alongside the defaults
2. **Template versioning:** If templates evolve significantly between versions, the upgrade step may need to offer content diffs, not just file moves

---

**Decision Made:** 2026-04-21
**Last Updated:** 2026-04-21
**Status:** Accepted
