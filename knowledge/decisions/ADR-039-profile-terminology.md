---
title: "ADR-039: Profile Terminology for Behavioral Configuration"
number: 039
created: 2026-04-21T18:00:00Z
status: Accepted
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: main
  commit: null
  pr: null
  issue: null
implements: "[[1aa5c455]] — docs(adr): add ADR-039 profile terminology (mirrors user-level ADR-010)"
related:
  adrs:
    - "[[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]]"
    - "ADR-010 (user-level mirror at ~/.kmgraph/decisions/ADR-010-profile-terminology.md)"
  lessons: []
  kg_entries: []
tags: [terminology, documentation, consolidation]
category: process
---

# ADR-039: Profile Terminology for Behavioral Configuration

**Date:** 2026-04-21  
**Status:** Accepted  
**Related:** [[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]] (me.md and rules.md as source of truth), [[ADR-010-namespace-rename-knowledge-to-kg-sis]] (user-level mirror — `~/.kmgraph/decisions/ADR-010-profile-terminology.md`)

---

## Context

Knowledge graph operations rely on three behavioral configuration files that appear together at two scope levels:

1. **Scope level 1:** `~/.kmgraph/` (cross-project, user-level)
   - `~/.kmgraph/me.md` — User identity, working style
   - `~/.kmgraph/rules.md` — Universal rules, processes
   - `~/.kmgraph/triggers.md` — When rules apply

2. **Scope level 2:** `knowledge/` (project-specific)
   - `knowledge/me.md` — Project-specific identity context
   - `knowledge/rules.md` — Project-specific rules, conventions
   - `knowledge/triggers.md` — Project-specific rule timing

These three files are functionally grouped (loaded together, referenced as a set in skills and documentation). Currently, no single term exists for the group, leading to verbose repetition across:
- Skills documentation and routing logic
- Rules and docs files
- Instructions in CLAUDE.md and CLAUDE-plugin.md
- Agent context providers

Example of current verbosity:
> "The rules-capture skill routes to the appropriate location based on which of me.md, rules.md, or triggers.md needs updating..."

With terminology, this becomes:
> "The rules-capture skill routes to the appropriate location within the active profile..."

---

## Decision

**Adopt "profile" as the collective term for the three configuration files (me.md, rules.md, triggers.md) at each scope level.**

**Terminology:**

- **Profile** — The set of three files: `me.md`, `rules.md`, `triggers.md` (at either scope level)
- **User profile** — The cross-project configuration set at `~/.kmgraph/` (user-level, applies to all projects)
- **Project profile** — The project-specific configuration set at `knowledge/` (project scope, overrides user profile where conflicts exist)

**Authoritative definition location:** `knowledge/rules.md` Terminology section will be the canonical home for this definition.

---

## Rationale

**Primary reasons for this choice:**

1. **Clarity:** "Profile" is familiar to most developers (browser profiles, user profiles, system profiles). The word carries the right semantic weight—a cohesive set of behavioral preferences.

2. **Conciseness:** Reduces repetition from "me.md, rules.md, and triggers.md" to simply "profile" in skills, docs, and agent context.

3. **Hierarchical:** The modifiers "user" and "project" naturally express the two scope levels without additional terminology.

4. **Consistency with existing patterns:** Other KG concepts use hierarchical modifiers (e.g., "user knowledge graph" vs. "project knowledge graph").

**Alternatives considered:**

- **"Context pack"** — More KG-flavored but less intuitive to developers outside the project.
- **"Behavior config"** — Accurate but verbose and less memorable than "profile."
- **"Agent config"** — Too narrow (doesn't cover user identity in me.md) and too technical.
- **"Settings suite"** — Too generic and doesn't capture the behavioral intent.

**Trade-offs accepted:**

- Requires documentation update in multiple locations (rules.md, CLAUDE.md, existing ADRs, skill READMEs).
- Developers and users must learn the new term (minor onboarding cost).

---

## Consequences

**Positive:**

✅ **Improved readability:** Skills, docs, and agent instructions can use "profile" instead of listing files, reducing noise.

✅ **Clearer scope expression:** "User profile" and "project profile" immediately communicate scope hierarchy.

✅ **Consistency:** All scope-based configuration uses the same terminology pattern.

✅ **Foundation for future work:** When new configuration patterns emerge, "profile" provides a natural umbrella term.

**Negative:**

❌ **Documentation effort:** Update CLAUDE.md, CLAUDE-plugin.md, existing ADRs, and skill READMEs to use "profile" terminology.

❌ **Learning curve:** New users encountering "profile" must understand it refers to the three-file set, not individual files.

---

## Implementation

1. **Add definition to `knowledge/rules.md` Terminology section:**
   ```markdown
   ## Terminology
   
   ### Profile
   
   A **profile** is the set of three behavioral configuration files (`me.md`, `rules.md`, `triggers.md`) 
   at a single scope level.
   
   - **User profile:** Configuration set at `~/.kmgraph/`. Applies to all projects. Defines universal rules, 
     user identity, and rule timing triggers.
   - **Project profile:** Configuration set at `knowledge/`. Applies to current project only. Overrides 
     user profile on conflicts.
   ```

2. **Update `rules-capture` skill routing menu** to use "user profile" and "project profile" instead of listing files.

3. **Update affected documentation:**
   - CLAUDE.md and CLAUDE-plugin.md: Replace file lists with "profile" where appropriate
   - Existing ADR references: Use "profile" in new content going forward
   - Skill READMEs: Update context descriptions to reference profiles

4. **Future consistency rule:** All new skills, docs, and agent instructions should use "profile" terminology when referring to the configuration file set.

---

## Related Decisions

- **[[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]]:** Establishes me.md and rules.md as platform-agnostic source of truth. This ADR provides naming convention for the complete set.

---

**Accepted:** 2026-04-21  
**Author:** technomensch  
**Implements:** Terminology standardization for behavioral configuration files
