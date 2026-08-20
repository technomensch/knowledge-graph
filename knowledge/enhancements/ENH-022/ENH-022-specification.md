---
title: "ENH-022: Template Directory Disambiguation — core/default-templates/, starter consolidation, knowledge/knowledge/ removal"
number: 022
status: resolved
version_target: "v0.5.10.7"
github_issue: null
created: 2026-05-29
related_adrs: ["ADR-009", "ADR-028", "ADR-040"]
related_enhs: ["ENH-051"]
---

# ENH-022: Template Directory Disambiguation

**Status:** Resolved — implemented (core/templates/ renamed to core/default-templates/; no bare templates/ dir remains)
**Priority:** Medium
**Version Target:** v0.5.10.7
**Created:** 2026-05-29
**Updated:** 2026-06-12 — full scope established via brainstorm; web research conducted
**Related:** [ENH-051](../ENH-051/ENH-051-specification.md) — cites this ENH as the precedent for disambiguating duplicated path-resolution logic; backlinked 2026-07-26 (paperwork-audit backlink-symmetry check), [issue-11](../../issues/issue-11/issue-11-description.md) — cites this ENH (created 2026-05-29, the last of the Cause-1 casualties before the `gh issue create` fix landed the next day) as `github_issue: null`; backlinked 2026-08-19

---

## Problem Statement

Three layered problems, all rooted in the same structural ambiguity:

### 1. Source dir name collision

`core/templates/` is structurally indistinguishable from the live `knowledge/` dirs it seeds. A reader cannot tell frozen distribution source from user-owned output by looking at paths alone.

### 2. Source subdir scatter

`core/templates/knowledge/` deploys to **three** targets on `/init`:
- `knowledge/` root (me.md, rules.md, triggers.md, kg-index.md)
- `knowledge/concepts/` (entry-template.md, kg-category-index.md)
- `knowledge/knowledge/` (architecture.md, concepts.md, gotchas.md, patterns.md, workflows.md)

`commands/init.md` line 383 is a workaround patch — not a principled fix. `knowledge/knowledge/` is a nonsensical nesting that confuses every user. All five files in `knowledge/knowledge/` are unmodified template starters (confirmed by diff against source).

### 3. Starter file pollution

`/init` places template starters (`ADR-template.md`, `session-template.md`, `lesson-template.md`, `entry-template.md`) inside live knowledge dirs alongside real entries. They are never populated, never clearly flagged as starters, and create confusion when browsing the knowledge graph.

---

## Web Research Findings (2026-06-12)

Research across Jekyll, Yeoman, Copier, cruft, VS Code extensions, Obsidian Templater confirmed:

1. **Dominant pattern: dual-location, not dual-copy.** Tool retains canonical source inside its package; user dir receives rendered output. These are structurally distinct artifacts.
2. **Source templates are not user-editable in place.** Users who want to customize manually copy a file out — that copy becomes user-owned.
3. **Template upgrades are never silent overwrites.** Industry uses diff-review prompts (cruft), three-way merge (Copier), or fallback-priority (Jekyll reads user file first, falls back to package default).
4. **No cross-tool naming convention exists.** Disambiguation is by **location** (tool package dir vs. user-configured dir), not by filename prefixes or suffixes.

**Conclusion:** The `core/default-templates/` rename and `knowledge/templates/` consolidation align with industry consensus. Location-based disambiguation is correct. The existing design is validated.

---

## Selected Approach

**Three changes applied atomically at the source:**

### A. Rename source dir
`core/templates/` → `core/default-templates/`

"Default" signals out-of-box source; `knowledge/` is user-owned output. Location-based disambiguation — no naming convention needed.

### B. Rename source subdir + eliminate scatter
`core/default-templates/knowledge/` → `core/default-templates/concepts/`

Deploy target becomes a clean 1:1 mapping:
`core/default-templates/concepts/` → `knowledge/concepts/`

Line 383 special case removed. `knowledge/knowledge/` never created on new installs. Both `/init` and `init-personal-kg` use the same clean structure.

### C. Consolidate starters into `knowledge/templates/`
All four starter files move out of live dirs. Both `/init` and `init-personal-kg` deploy starters to `knowledge/templates/`, not into `decisions/`, `sessions/`, `lessons-learned/`, or `concepts/`.

**Target `knowledge/` structure after full migration:**
```
knowledge/
  concepts/          ← index files + content seeded from core/default-templates/concepts/
  decisions/         ← real ADRs + README only
  lessons-learned/   ← real lessons + README only
  sessions/          ← real sessions + README only
  templates/         ← ALL starters (ADR-template, session-template, lesson-template, entry-template)
```

### Rejected options
| Option | Reason rejected |
|---|---|
| Rename live `knowledge/` dirs with suffix | Migration risk; ADR-040 never renamed live dirs |
| Documentation only | ADR-040's rejected "Option B — cosmetic, not structural" |
| Leave starters in live dirs | User confusion confirmed; not industry standard |
| Separate ENH for starter cleanup | Root cause is same; fixing source dir without fixing deployment is incomplete |

---

## Cascading Impact & Blast Radius

### Live `knowledge/` directories — migration required for existing installs

`knowledge/decisions/`, `knowledge/lessons-learned/`, `knowledge/sessions/`, `knowledge/concepts/` — no structural renames. Starter files moved OUT to `knowledge/templates/`.

`knowledge/knowledge/` — **removed** via upgrade-inspector migration (merge 5 files into `knowledge/concepts/`).

### `core/templates/` → `core/default-templates/` — code/logic references (15 files; PROTECTED, atomic)

All 15 must update in one commit. If any is missed, `/init` and `kg_scaffold` break silently.

**Commands (10 files):**
- `commands/init.md` — ⚠️ line 383 removed; clean role→output mapping; deploy starters to `knowledge/templates/`
- `commands/init-personal-kg.md` — parity with init.md; same clean structure
- `commands/init-shared/template-seed.md` — path loops updated
- `commands/init-shared/upgrade-inspector.md` — ⚠️ section (i) extended + new `knowledge/knowledge/` migration check
- `commands/create-doc.md`
- `commands/meta-issue.md`
- `commands/add-category.md`
- `commands/setup-platform.md`
- `commands/create-adr.md`
- `commands/handoff.md`

**Agents (2 files):**
- `agents/rules-capture-agent.md`
- `agents/create-adr-agent.md`

**MCP server (3 files) — ⚠️ recompile required:**
- `mcp-server/src/tools/scaffold.ts`
- `mcp-server/src/tools/upgrade.ts`
- `mcp-server/src/resources/index.ts` — compiled resource map; path entries must reflect `concepts/` not `knowledge/` subdir; rebuild required

### Docs references — 27 files

All doc updates must follow `docs/STYLE-GUIDE.md` (read before each update).

**Original 15 (core/templates/ path refs):**
`docs/GLOSSARY.md`, `docs/STYLE-GUIDE.md`, `docs/CONFIGURATION.md`, `docs/quickstart.mdx`, `docs/design/platform-detection.md`, `docs/troubleshooting/index.md`, `docs/pillars/organizing/graph-configuration.md`, `docs/pillars/tailoring/customize-templates.md` (+ new default-vs-live section), `docs/pillars/portability/migrate-claude-gemini.md`, `docs/pillars/portability/use-in-cursor.mdx`, `docs/templates/documentation/doc-template.md`, `docs/templates/README.md`, `docs/reference/ARCHITECTURE.md`, `docs/reference/templates.md`, `docs/reference/PLATFORM-ADAPTATION.md`

**3 obvious root files:**
`README.md`, `INSTALL.md` (Tier 3 breaking-change notice), `CHANGELOG.md` (v0.5.10.7 entry)

**9 new — expanded scope identifiers:**
`docs/CHEAT-SHEET.md`, `docs/reference/command-guide.md`, `docs/reference/commands.md`, `docs/pillars/organizing/multi-kg-workflows.md`, `docs/pillars/organizing/personal-vs-project.md`, `docs/pillars/portability/sync-across-machines.md`, `docs/pillars/portability/your-ai-profile.mdx`, `docs/templates/decisions/README.md`, `docs/templates/lessons-learned/README.md`

### Existing users — upgrade path

**Tier 1/2 (plugin/marketplace):** Source rename is invisible (ships inside plugin). Live `knowledge/` dirs untouched structurally. Upgrade-inspector offers optional migration for starters and `knowledge/knowledge/`.

**Tier 3 (manual installers, ADR-009):** **Breaking change.** Copy instructions reference `core/templates/<dir>/`. Required: update `INSTALL.md` + `docs/INSTALL.md`, document in `CHANGELOG.md`.

---

## Migration Strategy — upgrade-inspector.md

Two additions to the existing upgrade-inspector check sequence:

### Section (i) extension — starter file relocation

**Detect:** `ADR-template.md` in `knowledge/decisions/`, `session-template.md` in `knowledge/sessions/`, `lesson-template.md` in `knowledge/lessons-learned/`, `entry-template.md` in `knowledge/concepts/`

**Offer:** Move all detected starters to `knowledge/templates/` (create dir if absent)

**Mechanism:** Archive-before-write → `mkdir -p knowledge/templates/` → `mv` each file → confirm cleanup

**Menu:** Preview | Apply all | Choose individually | Skip

### New check — `knowledge/knowledge/` migration

**Detect:** `knowledge/knowledge/` exists

**Verify:** Diff each file against `core/default-templates/concepts/` source — confirm unmodified template content

**Offer:** Merge files into `knowledge/concepts/`; remove `knowledge/knowledge/`

**Mechanism:** Archive-before-write → `mv knowledge/knowledge/* knowledge/concepts/` → `rmdir knowledge/knowledge/`

**If files are modified:** Warn user; offer to merge manually; do not auto-overwrite

---

## Post-Rename Validation Gates

1. `grep -r "core/templates" commands/ agents/ mcp-server/src/ docs/ --include="*.md" --include="*.ts" --include="*.mdx"` — **zero hits**
2. `npm run build` in `mcp-server/` — compiled dist references `core/default-templates/` and `concepts/` subdir
3. `/init` smoke test into temp dir:
   - `knowledge/templates/` seeded with 4 starters
   - `knowledge/knowledge/` absent
   - `knowledge/concepts/` seeded correctly (1:1 from `core/default-templates/concepts/`)
4. `init-personal-kg` smoke test — same clean structure verified
5. Upgrade simulation: existing install with `knowledge/knowledge/` → confirm migration check fires and merge works
6. `git diff main --name-only | grep "^knowledge/"` — only `knowledge/templates/` changes (no live dir renames)

---

## Acceptance Criteria

**Source rename**
- [ ] `core/templates/` renamed to `core/default-templates/` via `git mv`
- [ ] `core/default-templates/knowledge/` renamed to `core/default-templates/concepts/`
- [ ] `grep -r "core/templates" commands/ agents/ mcp-server/src/` → zero hits
- [ ] `grep -r "core/templates" docs/` → zero hits

**Future installs — `/init` and `init-personal-kg`**
- [ ] `/init` deploys `core/default-templates/concepts/` → `knowledge/concepts/` (1:1, no scatter)
- [ ] `/init` deploys starters → `knowledge/templates/`, not into live dirs
- [ ] `init-personal-kg` deploys same clean structure (parity)
- [ ] `knowledge/knowledge/` never created on new installs
- [ ] Line 383 special case removed — clean role→output mapping in place
- [ ] `template-seed.md` and `upgrade-inspector.md` path loops updated

**Current installs — upgrade-inspector**
- [ ] Section (i) extended: detects 4 starters in live dirs → offers move to `knowledge/templates/`
- [ ] New check: detects `knowledge/knowledge/` → offers merge into `knowledge/concepts/`
- [ ] Both migrations use archive-before-write
- [ ] Both migrations use Preview | Apply all | Choose individually | Skip menu
- [ ] Modified files in `knowledge/knowledge/` trigger warn-don't-overwrite path

**MCP server**
- [ ] `scaffold.ts`, `upgrade.ts`, `resources/index.ts` updated to `core/default-templates/`
- [ ] `resources/index.ts` path entries reflect `concepts/` subdir
- [ ] `npm run build` passes; compiled dist references new paths

**Smoke tests**
- [ ] `/init` into temp dir: starters in `knowledge/templates/`; `knowledge/knowledge/` absent; `knowledge/concepts/` seeded correctly
- [ ] `init-personal-kg` into temp dir: same clean structure
- [ ] Upgrade simulation: `knowledge/knowledge/` migration check fires correctly

**Docs — 27 files**
- [ ] All 27 docs files updated following `docs/STYLE-GUIDE.md`
- [ ] `customize-templates.md` gains "default-templates vs live knowledge files" section
- [ ] Upgrade guide documents new migration steps for existing users
- [ ] `grep -r "core/templates" docs/` → zero hits

**Version + release**
- [ ] `package.json`, `.claude-plugin/plugin.json`, `mcp-server/package.json` all = `0.5.10.7`
- [ ] `INSTALL.md` + `docs/INSTALL.md` Tier 3 breaking-change notice written
- [ ] `CHANGELOG.md` v0.5.10.7 entry: breaking change + structural changes documented
- [ ] PR awaits user review; main tagged `v0.5.10.7` after merge

---

## Reference ADRs

**ADR-040** — governing precedent. Fix source path, leave deployed names natural. Never rename working directories. Never impose live-data migration beyond moving stray starter files.

**ADR-009** — Tier 3 breakage is documented and accepted; rename = documented breaking change for manual installers.

**ADR-028** — templates seed live files.

**Lesson: Template Source Files Should Encode Role, Not Deployed Output Name** — source filenames/paths should encode role; init copy commands map role → output.

---

## Plan Note

**✅ Brainstorm complete (2026-06-12)** — full scope established. Web research conducted (2026-06-12). Prior brainstorm (2026-06-08) was path-rename only; this session expanded scope to cover starter consolidation, `knowledge/knowledge/` removal, and upgrade-inspector migration.

See `~/.claude/plans/v0.5.10.7-template-disambiguation.md`.
