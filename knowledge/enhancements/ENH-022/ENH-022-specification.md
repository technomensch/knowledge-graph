---
id: ENH-022
title: "Template Directory Disambiguation — rename core/templates/ to core/default-templates/"
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

**Status:** Proposed — approach selected, awaiting brainstorm sign-off and impl plan
**Priority:** Medium
**Version Target:** v0.5.12
**Created:** 2026-05-29
**Updated:** 2026-06-07 — approach locked in; scope broadened to all four pairs; blast radius detailed

---

## Problem Statement

`core/templates/` contains frozen distribution scaffolds that `/init` copies into
a user's `knowledge/` directory at install time. After install, the live
`knowledge/` subdirectories are structurally indistinguishable from the frozen
source.

This is a **whole-graph structural disambiguation problem** — not just a
`knowledge/concepts/` problem. All four pairs are affected:

| `core/templates/` (frozen source) | `knowledge/` (live after init) | Same name? |
|---|---|---|
| `core/templates/decisions/` | `knowledge/decisions/` | Yes |
| `core/templates/lessons-learned/` | `knowledge/lessons-learned/` | Yes |
| `core/templates/sessions/` | `knowledge/sessions/` | Yes |
| `core/templates/knowledge/` | `knowledge/concepts/` | **No — hardcoded rename in init.md line 383** |

A reader cannot tell from a path whether they are looking at a frozen
distribution scaffold that must never be hand-edited, or a live working
knowledge file meant to be edited. The `knowledge/concepts/` asymmetry is a
pragmatic workaround (avoids `knowledge/knowledge/` nesting) hardcoded in
`commands/init.md` line 383 — not a principled disambiguation.

### Origin

Follow-on from **ADR-040** (v0.4.3-beta, 2026-04-21), which resolved the
root-level `knowledge/` template confusion by moving template starters into
`knowledge/templates/`. ADR-040 fixed the root but left the
`core/templates/` ↔ `knowledge/` boundary unresolved.

**Note:** ADR-040 achieved separation by relocating scaffolds into a templates
namespace and leaving live dirs untouched — it never renamed a working
directory and never imposed a live-data migration beyond moving stray root-level
starter files. This ENH follows the same pattern.

---

## Selected Approach

**Rename `core/templates/` → `core/default-templates/`. Leave all live `knowledge/` directories untouched.**

### Rationale

- "Default" signals out-of-box versions; `knowledge/` copies are user-customized versions — universally understood without jargon
- Retains "templates" so users recognize the concept
- Pairs naturally with `docs/pillars/tailoring/customize-templates.md` ("customize from the defaults")
- No extra nesting — `core/default-templates/decisions/` vs `knowledge/decisions/` makes role obvious from path alone
- Leaves all four live `knowledge/` dirs untouched — no user-data migration required (ADR-040 precedent: never rename working directories)

### Rejected options

| Option | Reason rejected |
|---|---|
| Rename live `knowledge/` dirs with `-live` suffix (Approach 1) | Highest user-data migration risk; forces four destructive migrations on all existing users; ADR-040 never renamed live dirs |
| Rename both sides (Approach 3) | Inherits Approach 1's user-migration risk on top of core churn |
| Documentation / README only (Approach 4) | ADR-040's rejected "Option B — cosmetic, not structural"; confusion is path-level, README not in view at moment of confusion; `core/templates/README.md` already exists and has not resolved the confusion |
| Split `knowledge/concepts/` only (Approach 5) | Leaves three identical-name pairs ambiguous; violates consistency constraint |
| `core/scaffolds/` | Jargon — users may not know what "scaffolds" means |
| `core/do-not-edit-templates/` | Overkill — directory names aren't warning signs; handled better by docs |
| Add nested `core/templates/project/` (Opus initial rec) | Adds useless nesting — `core/templates/knowledge/` only ever holds scaffolds, no reason for an extra level |

---

## Cascading Impact & Blast Radius

### Live `knowledge/` directories — NO changes required

`knowledge/decisions/`, `knowledge/lessons-learned/`, `knowledge/sessions/`,
`knowledge/concepts/` — **untouched**. No migration step. No user impact.

### `core/templates/` → `core/default-templates/` — code/logic references (15 files; PROTECTED)

All 15 must update atomically in one commit. If any is missed, `/init` and
`kg_scaffold` break silently (copy from a path that no longer exists).

**Commands (10 files):**
- `commands/create-doc.md`
- `commands/init-personal-kg.md` — ⚠️ hardcoded `for f in ...` template loop; must update loop logic, NOT just string-replace the path
- `commands/meta-issue.md`
- `commands/init.md` — ⚠️ line 383 special case: replace the `knowledge/knowledge/` nesting-avoidance hack with a clean role→output mapping using the new path
- `commands/add-category.md`
- `commands/setup-platform.md`
- `commands/create-adr.md`
- `commands/init-shared/template-seed.md`
- `commands/init-shared/upgrade-inspector.md`
- `commands/handoff.md`

**Agents (2 files):**
- `agents/rules-capture-agent.md`
- `agents/create-adr-agent.md`

**MCP server (3 files) — ⚠️ recompile required:**
- `mcp-server/src/tools/scaffold.ts`
- `mcp-server/src/tools/upgrade.ts`
- `mcp-server/src/resources/index.ts` — compiled resource map; rebuild after rename or MCP server will reference stale paths

### `core/templates/` → `core/default-templates/` — docs references (15 files)

- `docs/design/platform-detection.md`
- `docs/GLOSSARY.md`
- `docs/troubleshooting/index.md`
- `docs/CONFIGURATION.md`
- `docs/pillars/organizing/graph-configuration.md`
- `docs/pillars/tailoring/customize-templates.md` — update references AND add "default-templates vs your live knowledge files" section
- `docs/pillars/portability/migrate-claude-gemini.md`
- `docs/pillars/portability/use-in-cursor.mdx`
- `docs/templates/documentation/doc-template.md`
- `docs/templates/README.md`
- `docs/quickstart.mdx`
- `docs/STYLE-GUIDE.md`
- `docs/reference/ARCHITECTURE.md`
- `docs/reference/templates.md`
- `docs/reference/PLATFORM-ADAPTATION.md`

### Hot files (reference BOTH directories)

- `commands/init.md` — references both; line 383 special case needs logic update
- `commands/init-shared/upgrade-inspector.md` — references both
- `mcp-server/src/resources/index.ts` — references both; compiled; recompile required

### Existing users — upgrade path

**Tier 1/2 (plugin/marketplace installs):** Invisible. `core/default-templates/`
ships inside the plugin distribution, not the user's project. Nothing in their
`knowledge/` is touched. No prompt, no migration step, no action required.

**Tier 3 (manual installers, ADR-009):** **Breaking change.** Their copy
instructions reference `core/templates/<dir>/`. Required actions:
- Update `INSTALL.md` and `docs/INSTALL.md` copy instructions
- Document in `CHANGELOG.md` under the v0.5.12 release entry as a breaking change
- Note the old path and new path explicitly

### Version sync required

If the MCP server's compiled resource map changes (it references both dirs):
- `package.json`
- `.claude-plugin/plugin.json`
- `mcp-server/package.json`

All three must stay in sync per project convention.

---

## Post-Rename Validation Gates

1. **Grep audit:** `grep -r "core/templates" commands/ agents/ mcp-server/src/ docs/ --include="*.md" --include="*.ts" --include="*.mdx"` — must return **zero hits** before commit
2. **MCP rebuild:** Run `npm run build` in `mcp-server/` and verify resource map references `core/default-templates/`
3. **Smoke test `/init`:** Run `/init` into a temp directory and verify scaffold copies succeed from the new path
4. **Verify `init.md` line 383 logic:** The `knowledge/concepts/` special case must still function correctly after the path update

---

## Reference ADR

**ADR-040** is the governing precedent. Its actual implementation:
- Moved scaffolds into a templates namespace (`knowledge/templates/`)
- Left live working directories untouched
- Never renamed a working directory; never imposed live-data migration

**Correction to earlier spec:** The prior version of this spec read ADR-040 as
endorsing live-dir suffixing (Approach 1). This was incorrect. ADR-040's
pattern is: fix the source path, leave deployed names natural. This ENH follows
that pattern precisely.

Supporting:
- **ADR-009** — Tier 3 breakage is documented and accepted; rename = documented breaking change for manual installers
- **ADR-028** — templates seed live files
- **Lesson: Template Source Files Should Encode Role, Not Deployed Output Name** — source filenames/paths should encode role; init copy commands map role → output

---

## Plan Note

**Brainstorm sign-off required before implementation.** Approach is selected;
brainstorm must confirm:
1. Grep audit of `decisions/`, `lessons-learned/`, `sessions/` reference counts
   (not yet audited — scoped in 2026-06-07 expansion)
2. Atomicity plan — confirm all 15+15 files identified; no consumer missed
3. `init.md` line 383 logic rewrite design (not a string replace)
4. `init-personal-kg.md` loop logic update design
5. Tier 3 INSTALL.md breaking-change wording

See `~/.claude/plans/v0.5.12-template-disambiguation.md`.
