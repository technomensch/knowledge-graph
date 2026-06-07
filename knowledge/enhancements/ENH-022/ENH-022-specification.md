---
id: ENH-022
title: "Template Directory Disambiguation — core/templates vs all knowledge/ live pairs"
status: proposed
priority: medium
version_target: v0.5.12
created: 2026-05-29
updated: 2026-06-07
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
**Updated:** 2026-06-07 — scope broadened from concepts-only to all four core/templates ↔ knowledge/ pairs

---

## Problem Statement

`core/templates/` contains frozen distribution scaffolds that `/init` copies into
a user's `knowledge/` directory at install time. After install, the user's
`knowledge/` subdirectories contain live working files — but they are
structurally indistinguishable from the source they were copied from.

This is not a `knowledge/concepts/` problem. It is a **whole-graph structural
disambiguation problem** affecting all four paired directories:

| `core/templates/` (frozen source) | `knowledge/` (live copy after init) | Same name? |
|---|---|---|
| `core/templates/decisions/` | `knowledge/decisions/` | Yes |
| `core/templates/lessons-learned/` | `knowledge/lessons-learned/` | Yes |
| `core/templates/sessions/` | `knowledge/sessions/` | Yes |
| `core/templates/knowledge/` | `knowledge/concepts/` | **No — hardcoded rename** |

A reader cannot tell from a path whether they are looking at:
- a frozen distribution scaffold that must never be hand-edited, or
- a live working knowledge file that is meant to be edited.

### The Special Case in `init.md`

`core/templates/knowledge/` is the one pair with a **hardcoded asymmetric name**
in `commands/init.md` (line 383):

> `docs/knowledge/` → moved to `knowledge/concepts/` to avoid
> `knowledge/knowledge/` nesting confusion.

This was a pragmatic workaround — not a principled disambiguation. It created
the `concepts/` naming (which doesn't appear on the source side at all), making
the source→destination mapping invisible unless you read `init.md` carefully.
The other three pairs share identical names on both sides, creating a different
form of the same confusion: same name, opposite roles.

### Origin

ENH-022 is a follow-on from **ADR-040** (v0.4.3-beta, 2026-04-21), which
resolved the root-level `knowledge/` confusion by moving template starters into
`knowledge/templates/`. ADR-040 fixed the root but left the
`core/templates/` ↔ `knowledge/` boundary unresolved. The same structural
ambiguity that ADR-040 solved at the root persists across all four pairs.

The **Lesson: Template Source Files Should Encode Role, Not Deployed Output
Name** (2026-04-09, v0.3.0-beta) independently documented the same pattern:
source filenames/paths should encode role; init copy commands map role → output.
Both that lesson and ADR-040 predict that the current structure will mislead
contributors and new users.

---

## User Impact

- **New users** browsing the repo cannot tell which directory is a starting
  point to copy vs. a live example to read — undermining the "learn by reading
  the repo's own KG" onboarding path.
- **Contributors** risk editing the wrong file: hand-editing a `core/templates/`
  scaffold (PROTECTED, breaks `/init` output) or treating a live `knowledge/`
  working file as a frozen template.
- **Upgrading users** who already ran `/init` have live `knowledge/` directories
  on disk; any rename to those directories requires a confirmed migration step
  (ADR-040 precedent: prompt, never silently move; declining must keep the
  install functional).
- **Consistency gap:** Three pairs share identical names across the boundary;
  one (`knowledge/`) uses an asymmetric name (`concepts/`). No pair signals its
  role structurally. The fix must apply consistently — a patchwork rename of
  only `concepts/` leaves the three identical-name pairs ambiguous.

---

## Proposed Approaches (to evaluate during brainstorm)

> No approach is selected yet. The brainstorm must choose one and apply it
> consistently across all four pairs. The brainstorm (see v0.5.12 plan) must
> harden this spec before any implementation task is written.

Each approach must answer: does it apply to all four pairs or just `concepts/`?
A partial fix that leaves three pairs ambiguous is not acceptable.

1. **Rename project side only** — suffix all `knowledge/` live dirs to signal
   "live": e.g., `knowledge/concepts-live/`, `knowledge/decisions-live/`,
   `knowledge/lessons-learned-live/`, `knowledge/sessions-live/`. Leaves
   `core/templates/` PROTECTED and untouched. Blast radius: ~6 code refs for
   `concepts/` + additional refs for the three other dirs; upgrade migration
   needed for all four.

2. **Rename core side only** — prefix `core/templates/` subdirs to signal
   "scaffold": e.g., `core/templates/scaffold-decisions/`,
   `core/templates/scaffold-lessons-learned/`, etc. Makes the distribution
   role explicit; touches 15+ code refs + 15 docs refs; highest cost because
   `core/templates/` is PROTECTED.

3. **Rename both sides with paired naming** — e.g., `core/templates/scaffold-*/`
   and `knowledge/*-live/`. Maximum clarity, maximum blast radius, both
   PROTECTED and live sides change.

4. **No rename — documentation only** — add a `README.md` to `core/templates/`
   and to each `knowledge/` subdirectory stating its role, plus GLOSSARY and
   ARCHITECTURE notes. ADR-040's explicitly rejected "Option B" for the root
   case; the only zero-migration option. Must be applied to all four pairs to
   have any effect.

5. **Structural split of `knowledge/concepts/` only** — separate genuine
   concept notes from mutable template-shaped content. Note: ADR-040 already
   established `knowledge/templates/` for seeded starters; this option must be
   reconciled to avoid a third overlapping "templates" location. Does NOT
   address the three identical-name pairs.

---

## Cascading Impact

Reference counts below exclude `.kg-archive-*/`, `.docusaurus/` build
artifacts, `chat-history/`, and `docs/plans/` (gitignored local plans). Many
matches for `knowledge/concepts` in example lesson files are prose references
(text edits only, not logic changes) — listed separately.

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

### `knowledge/decisions/`, `knowledge/lessons-learned/`, `knowledge/sessions/`

Reference counts for these three pairs **not yet audited** — scope expansion
identified 2026-06-07. Brainstorm must include a grep audit of all three before
approach selection.

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
  `mcp-server/src/resources/index.ts` reference **both** directories — any
  rename touching either side hits these.
- `init-personal-kg.md` historically used a hardcoded `for f in ...` template
  loop (per the Template-Source-Naming lesson) — any rename must update the
  loop, not just the directory path.
- `commands/init.md` line 383 contains the **hardcoded `knowledge/concepts/`
  special case** — any rename of `knowledge/concepts/` must update this
  special-case logic, not just a string replace.

---

## Upgrade / Migration Impact

- **Existing installs** seeded by older versions have `knowledge/concepts/`,
  `knowledge/decisions/`, `knowledge/lessons-learned/`, and `knowledge/sessions/`
  directories on disk. Renaming any of these requires `upgrade` to detect the
  old directory and offer a confirmed move (ADR-040 precedent: prompt, never
  silently move; declining must keep the install functional). Four directories =
  four migration steps if the project side is renamed.
- **`core/templates/` is the install source.** Renaming it changes what `/init`,
  `template-seed`, `scaffold` (`kg_scaffold`), and `upgrade` (`kg_upgrade`) copy
  from. Every consumer path and the MCP server's compiled resource map must be
  updated atomically or `/init` breaks.
- **Three-tier installs (ADR-009):** Tier 3 template-only users copy
  `core/templates/` manually; a rename here is a documented breaking change for
  their copy instructions (INSTALL.md, `docs/INSTALL.md`).
- **Migration script:** Brainstorm must decide whether `kg_upgrade` /
  `upgrade-inspector` need new migration steps. Likely yes for any project-side
  rename; likely no for documentation-only (approach 4).
- **Version sync:** `package.json`, `.claude-plugin/plugin.json`, and
  `mcp-server/package.json` must stay in sync if the MCP server's resource map
  changes (it references both directories).

---

## Open Questions for Brainstorm

1. Should all four pairs be renamed consistently, or is `concepts/` special
   enough (due to the asymmetric name) to treat separately?
2. Do `decisions/`, `lessons-learned/`, and `sessions/` actually cause the same
   confusion in practice — or does shared naming make them *clearer* (same name
   = same content type)?
3. Grep audit required: what are the reference counts for the three identical-
   name pairs before approach selection?
4. Does approach 5 (split `knowledge/concepts/`) conflict with ADR-040's
   `knowledge/templates/`, and if so, which takes precedence?

---

## Reference ADR

**ADR-040: Restructure Knowledge Templates into Subdirectory** is the governing
precedent. It resolved the identical "template files vs. live files coexist with
no structural distinction" problem at the `knowledge/` root by moving templates
into `knowledge/templates/`, and it explicitly:

- **Rejected flat-file prefixes** (its "Option A" — `user-example-me.md` style)
  as "fragile and verbose" — relevant to this ENH's suffix approaches (1–3).
- **Rejected README-only** (its "Option B") as a "cosmetic fix, not structural"
  — relevant to this ENH's approach 4.
- **Preferred structural separation via directories** and an `upgrade` migration
  step with user confirmation — the template this ENH should likely follow.

Supporting context:
- **ADR-009** (Three-Tier Installation) — `core/templates/` is the Tier 3
  install source; rename = documented breaking change for manual installers.
- **ADR-028** (me.md/rules.md as source of truth) — templates seed live files.
- **Lesson: Template Source Files Should Encode Role, Not Deployed Output Name**
  — directly on point: source filenames/paths should encode role; init copy
  commands map role → output. Reinforces approach 1–3 and warns about the
  hardcoded `init-personal-kg` loop.

---

## Plan Note

**Brainstorm required before implementation — see v0.5.12 plan**
(`v0.5.12-template-disambiguation`). The plan is intentionally a DRAFT with no
execution tasks until the brainstorm:
1. Runs the grep audit on the three unaudited pairs (decisions, lessons-learned, sessions)
2. Answers the open questions above
3. Selects an approach that applies consistently across all four pairs
4. Hardens this spec (suffix/prefix choice, breaking-change classification,
   migration-script decision for each affected directory)
