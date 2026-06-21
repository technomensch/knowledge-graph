---
title: >-
  ENH-022: Template Directory Disambiguation — core/default-templates/, starter
  consolidation, knowledge/knowledge/ removal
---

# ENH-022: Template Directory Disambiguation

**Status:** Proposed — brainstorm complete 2026-06-12, ready for implementation plan
**Priority:** Medium
**Version Target:** v0.5.10.7
**Created:** 2026-05-29
**Updated:** 2026-06-12 — full scope established via brainstorm; web research conducted

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
- [x] Section (l): detects 4 starters in live dirs → offers move to `knowledge/templates/` (implemented in kmg-upgrade-inspector.md as section l)
- [x] Section (m): detects `knowledge/knowledge/` → offers merge into `knowledge/concepts/` (implemented in kmg-upgrade-inspector.md as section m)
- [x] Both migrations use archive-before-write
- [x] Both migrations use Preview | Apply all | Choose individually | Skip menu
- [x] Modified files in `knowledge/knowledge/` trigger warn-don't-overwrite path

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

---

## Scope Addition — v0.6.5 (2026-06-20)

**Init ↔ kg_upgrade wiring** added to ENH-022 scope.

**Problem:** `kmg-upgrade-inspector.md` ran its own bash checks for structural upgrade detection (directories, templates, starter-relocation, stray-knowledge-dir). `kg_upgrade` (MCP tool) covers the same checks. The two paths drifted: new checks added to `kg_upgrade` (v0.6.4) were invisible in the init wizard until manually duplicated.

**Solution:** `kmg-upgrade-inspector.md` Step 0 calls `kg_upgrade` inspect, incorporates its items into the wizard's upgrade list, and routes apply for MCP-covered items through `kg_upgrade apply`. Bash fallback retained for when MCP server is unavailable.

**Acceptance criteria:**

- [ ] `kmg-init.md` stale module path refs fixed (line 45 + fts5-rebuild, directory-scaffold, template-seed, config-entry-write): all now use `commands/kmg-init-shared/kmg-*`
- [ ] `kmg-init-personal-kg.md` stale module path refs fixed (5 refs): mirrors `kmg-init.md`; both inits call same shared modules at `commands/kmg-init-shared/kmg-*`
- [ ] Step 0 exists in `kmg-upgrade-inspector.md` before the bash detection block
- [ ] Step 0 calls `kg_upgrade` (no args = inspect mode); each entry in `upgrades[].description` surfaced in wizard; `upgrades[].category` routed to `_mcp_apply[]` (excluding `version-update`)
- [ ] `_mcp_apply[]` contains only valid apply enum values; `version-update` excluded; `platform-split` excluded
- [ ] Bash sections a, b, c, l, m guarded by `_mcp_checked=true` — skipped when MCP call succeeded
- [ ] Apply block calls `kg_upgrade apply: [_mcp_apply]` before wizard-only apply logic; no invalid categories passed
- [ ] Fallback: if `kg_upgrade` unavailable, `_mcp_checked=false`, bash sections a/b/c/l/m run as before; no silent failures
- [ ] Active-graph guard: if `{kg_name}` ≠ active graph, switch before calling `kg_upgrade` and restore after
- [ ] Smoke test: run `/kmgraph:kmg-init` on an existing KG → Option 1 → wizard shows kg_upgrade items alongside wizard-only items
- [ ] Future-proof: adding a new check to `kg_upgrade` surfaces in init wizard without changing `kmg-upgrade-inspector.md`

**Related:** Meta-issue `Lessons_Learned_Architecture_Meta_Issue:_Init_↔_Kg_Upgrade_Upgrade_Check_Drift.md` — status updated to Resolved.

**Lesson: Template Source Files Should Encode Role, Not Deployed Output Name** — source filenames/paths should encode role; init copy commands map role → output.

---

## Plan Note

**✅ Brainstorm complete (2026-06-12)** — full scope established. Web research conducted (2026-06-12). Prior brainstorm (2026-06-08) was path-rename only; this session expanded scope to cover starter consolidation, `knowledge/knowledge/` removal, and upgrade-inspector migration.

See `~/.claude/plans/v0.5.10.7-template-disambiguation.md`.

---

## Scope Addition — v0.6.4 (2026-06-19)

**Cross-platform upgrade triggering** added to ENH-022 scope.

**Problem:** Codex has no wizard or hook system — `kg_upgrade` never fires automatically after install. Original ENH-022 scope only addressed *what* the upgrade does, not *how it gets triggered on platforms without a wizard*.

**Solution:** Version sentinel (`lastAppliedVersion` per graph in config) + session-start instruction in `core/default-templates/AGENTS-template.md`. `kg_upgrade` inspect surfaces a `version-update` item when installed version > stored version.

**Decision:** ADR-055 — version sentinel chosen over MCP startup notification (avoids per-call noise) and AGENTS.md instruction alone (no signal for when upgrades are needed).

**Key constraint:** `absent lastAppliedVersion` = first install, not mismatch. No upgrade prompt on clean installs.
