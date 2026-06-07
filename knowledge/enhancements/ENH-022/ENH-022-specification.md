---
id: ENH-022
title: "Template Directory Disambiguation — knowledge/concepts vs core/templates"
status: proposed
priority: medium
version_target: v0.5.12
created: 2026-05-29
related:
  adrs: [40, 9, 28]
  lessons: ["Lessons_Learned_Template_Source_Naming_Role_Not_Output"]
tags: [templates, naming, directory-structure, disambiguation, init, upgrade]
---

# ENH-022: Template Directory Disambiguation

**Status:** Proposed
**Priority:** Medium
**Version Target:** v0.5.12
**Created:** 2026-05-29

---

## Problem Statement

Two template-like directories exist in the repository, and their roles are not
distinguishable by name alone:

| Directory | Role | Mutability | Git status |
|---|---|---|---|
| `core/templates/` | Canonical distribution scaffolds for every new KG install (consumed by `/init`, `init-personal-kg`, `template-seed`, `scaffold`, `upgrade`) | PROTECTED — never edited directly | Tracked, frozen |
| `knowledge/concepts/` | Project-specific working knowledge files for THIS repo's own KG | Mutable working copy | Tracked, freely edited |

The files inside `knowledge/concepts/` (`concepts.md`, `patterns.md`,
`gotchas.md`, `workflows.md`, `architecture.md`) look like template stubs
because they share names and shape with the seed templates in
`core/templates/`. A reader cannot tell from the path whether a file is:

- a distribution template that must not be hand-edited, or
- a live working knowledge file that is meant to be edited.

This is the same class of confusion ADR-040 solved at the `knowledge/` root
(separating live profile files from template starters by moving templates into
`knowledge/templates/`). The `knowledge/concepts/` vs `core/templates/`
boundary is the remaining instance of the same ambiguity.

---

## User Impact

- **New users** browsing the repo cannot tell which directory is a starting
  point to copy vs. a live example to read — undermining the "learn by reading
  the repo's own KG" onboarding path.
- **Contributors** risk editing the wrong file: hand-editing a `core/templates/`
  scaffold (PROTECTED, breaks `/init` output) or treating a
  `knowledge/concepts/` working file as a frozen template.
- **Upgrading users** who already ran `/init` have `concepts/` (or, post
  ADR-040, `templates/`) directories on disk; any rename here must not silently
  break or duplicate their existing layout.

---

## Proposed Approaches (to evaluate during brainstorm)

> No approach is selected yet. The brainstorm (see v0.5.12 plan) must choose one
> and harden this spec before any implementation task is written.

1. **Rename project side only** — `knowledge/concepts/` → `knowledge/concepts-proj/`
   (or `-proj-temp`), leaving `core/templates/` untouched. Smallest blast radius
   on the PROTECTED side; touches the 6 code references to `knowledge/concepts`.

2. **Rename core side only** — `core/templates/` → `core/core-templates/`
   (or `-core-temp`). Makes the distribution role explicit, but `core/templates/`
   is PROTECTED and far more entrenched (15 source/code references + 15 docs
   references), so this is the highest-cost option.

3. **Rename both sides with paired suffixes** — e.g. `core/core-templates/` and
   `knowledge/concepts-proj/` (or the user's `-core-temp` / `-proj-temp` idea).
   Maximum clarity, maximum blast radius, two protected-area changes.

4. **No rename — documentation only** — add a `README.md` to each directory
   stating its role (neither directory currently has one), plus a GLOSSARY entry
   and an ARCHITECTURE note. This is ADR-040's explicitly *rejected* "Option B"
   for the root case, but is the only zero-migration option here.

5. **Split `knowledge/concepts/`** into `knowledge/concepts/` (genuine concept
   notes for this project) + a separate location for any mutable project-level
   template stubs — separating working knowledge from template-shaped content.
   Note: ADR-040 already established `knowledge/templates/` for seeded template
   starters, so this option must be reconciled with ADR-040 to avoid a third
   overlapping "templates" location.

---

## Cascading Impact

Reference counts below exclude `.kg-archive-*/`, `.docusaurus/` build artifacts,
`chat-history/`, and `docs/plans/` (gitignored local plans). Many of the
remaining "matches" for `knowledge/concepts` are example lesson files that merely
contain the literal path as prose, not code dependencies — those are listed
separately because they need text edits, not logic changes.

### `knowledge/concepts/` — code/logic references (6 files)

- `commands/status.md`
- `commands/init.md`
- `commands/init-shared/upgrade-inspector.md`
- `skills/knowledge-graph-usage/references/command-workflows.md`
- `agents/knowledge-extractor.md`
- `mcp-server/src/resources/index.ts`

### `knowledge/concepts/` — prose/example references (text-only, ~7 files + docs mirror)

- `core/examples/lessons-learned/process/Example_*.md` (Chat_History_Workflow,
  Identifier_Decoupling, Git_Branch_Preservation, Agentic_Momentum,
  SessionStart_Automation, Effective_LLM_Constraints, Relative_File_Paths)
- Mirrored copies under `docs/examples/lessons-learned/process/`
- `docs/reference/templates.md`

### `core/templates/` — code/logic references (15 files; PROTECTED, higher risk)

Commands: `create-doc.md`, `init-personal-kg.md`, `meta-issue.md`, `init.md`,
`add-category.md`, `setup-platform.md`, `create-adr.md`,
`init-shared/template-seed.md`, `init-shared/upgrade-inspector.md`, `handoff.md`
Agents: `rules-capture-agent.md`, `create-adr-agent.md`
MCP server: `mcp-server/src/tools/scaffold.ts`, `mcp-server/src/tools/upgrade.ts`,
`mcp-server/src/resources/index.ts`

### `core/templates/` — docs references (15 files)

`docs/design/platform-detection.md`, `docs/GLOSSARY.md`,
`docs/troubleshooting/index.md`, `docs/CONFIGURATION.md`,
`docs/pillars/organizing/graph-configuration.md`,
`docs/pillars/tailoring/customize-templates.md`,
`docs/pillars/portability/migrate-claude-gemini.md`,
`docs/pillars/portability/use-in-cursor.mdx`,
`docs/templates/documentation/doc-template.md`, `docs/templates/README.md`,
`docs/quickstart.mdx`, `docs/STYLE-GUIDE.md`, `docs/reference/ARCHITECTURE.md`,
`docs/reference/templates.md`, `docs/reference/PLATFORM-ADAPTATION.md`

### Notable hot files

- `commands/init.md`, `init-shared/upgrade-inspector.md`, and
  `mcp-server/src/resources/index.ts` reference **both** directories — any rename
  touching either side hits these.
- `init-personal-kg.md` historically used a hardcoded `for f in ...` template
  loop (per the Template-Source-Naming lesson) — any rename must update the loop,
  not just the directory path.

---

## Upgrade / Migration Impact

- **Existing installs** seeded by older versions have a `knowledge/concepts/`
  directory (and, post-ADR-040, `knowledge/templates/`). Renaming the project
  side means `upgrade` must detect the old directory and offer a confirmed move
  (ADR-040 precedent: prompt, never silently move; declining must keep the install
  functional).
- **`core/templates/` is the install source.** Renaming it changes what `/init`,
  `template-seed`, `scaffold` (`kg_scaffold`), and `upgrade` (`kg_upgrade`) copy
  *from*. This is internal to the distribution, so it does not strictly break
  end-user on-disk layout — but every consumer path and the MCP server's compiled
  resource map must be updated atomically or `/init` breaks.
- **Three-tier installs (ADR-009):** Tier 3 template-only users copy
  `core/templates/` manually; a rename here is a documented breaking change for
  their copy instructions (INSTALL.md, `docs/INSTALL.md`).
- **Migration script:** Brainstorm must decide whether `kg_upgrade` /
  `upgrade-inspector` need a new migration step (likely yes if the project side
  is renamed; likely no if approach 4/documentation-only is chosen).
- **Version sync:** `package.json`, `.claude-plugin/plugin.json`, and
  `mcp-server/package.json` must stay in sync if the MCP server's resource map
  changes (it references both directories).

---

## Reference ADR

**ADR-040: Restructure Knowledge Templates into Subdirectory** is the governing
precedent. It resolved the identical "template files vs. live files coexist with
no structural distinction" problem at the `knowledge/` root by moving templates
into `knowledge/templates/`, and it explicitly:

- **Rejected flat-file prefixes** (its "Option A" — `user-example-me.md` style)
  as "fragile and verbose" — relevant to this ENH's suffix approaches (1–3).
- **Rejected README-only** (its "Option B") as a "cosmetic fix, not structural" —
  relevant to this ENH's approach 4.
- **Preferred structural separation via directories** and an `upgrade` migration
  step with user confirmation — the template this ENH should likely follow.

Supporting context:
- **ADR-009** (Three-Tier Installation) — `core/templates/` is the Tier 3 install
  source; rename = documented breaking change for manual installers.
- **ADR-028** (me.md/rules.md as source of truth) — templates seed live files.
- **Lesson: Template Source Files Should Encode Role, Not Deployed Output Name**
  — directly on point: source filenames/paths should encode role; init copy
  commands map role → output. Reinforces approach 1–3 and warns about the
  hardcoded `init-personal-kg` loop.

---

## Plan Note

**Brainstorm required before implementation — see v0.5.12 plan**
(`v0.5.12-template-disambiguation`). The plan is intentionally a DRAFT with no
execution tasks until the brainstorm selects an approach and hardens this spec
(suffix choice, breaking-change classification, migration-script decision).
