# ENH-031: Init Completeness — Backfill, triggers.md, and CLAUDE.md Gaps

**Status:** ✅ Resolved in v0.6.15
**Discovered:** 2026-06-30
**Related:** ENH-025 (cross-platform backfill), ENH-028 (init compliance gate), `kmg-init`

---

## Problem

Live testing of `kmg-init` on a project with no git repo and no `CLAUDE.md` revealed four init steps that silently did not run:

1. **Backfill offer (Step 1.10) skipped** — init detected no `CLAUDE.md` and exited the backfill branch early ("No project CLAUDE.md found — skipping backfill offer"). The backfill offer is independent of `CLAUDE.md`; existing project files (chat history, plans, research) should still be scanned. The user had to ask manually after init completed.

2. **`triggers.md` not scaffolded** — init created `kg-index.md`, `me.md`, `rules.md`, but did not create `triggers.md`. The audit agent created it post-hoc. Every KG init must scaffold `triggers.md` unconditionally.

3. **`CLAUDE.md` not created at project root** — when no `CLAUDE.md` exists, init should offer to create a minimal one with the KMGraph platform-preferences block. Instead it silently skipped. The audit agent created it post-hoc.

4. **`concepts/` and `templates/` dirs not created** — init scaffolded `knowledge/` root files and `lessons-learned/` + `decisions/` subdirs, but did not create `concepts/` or `templates/`. Content files (patterns.md, gotchas.md, architecture.md, workflows.md) were placed at KG root instead of `concepts/`.

---

## Root Causes

### Bug 1: Backfill gated on `CLAUDE.md` existence
Init's backfill offer (`Step 1.10`) checks for `CLAUDE.md` as its source. When absent, the entire backfill offer is skipped. The backfill offer should trigger on *any* existing project content (chat-history/, plans/, research/, specs/, etc.), not just on `CLAUDE.md` presence.

### Bug 2: `triggers.md` absent from scaffold list
The scaffold step creates a fixed list of files. `triggers.md` is not in that list. It was added to the profile ecosystem (`~/.kmgraph/me.md` references it) but init was never updated to scaffold it.

### Bug 3: `CLAUDE.md` creation not offered when absent
Init checks for existing `CLAUDE.md` (to offer backfill from it) but does not offer to create one when absent. The platform-preferences block for Claude Code is always valid and should be offered unconditionally.

### Bug 4: `concepts/` and `templates/` absent from dir scaffold
The dir scaffold step pre-dates the v0.6.4 `concepts/`/`templates/` restructure. It creates `lessons-learned/` and `decisions/` subdirs but does not create the two new dirs. Files that belong in `concepts/` end up at KG root.

---

## Affected Files

| File | Role |
|---|---|
| `commands/kmg-init.md` | Main init command — backfill trigger logic (Step 1.10), scaffold list, CLAUDE.md offer |
| `commands/kmg-init-personal-kg.md` | Personal KG init — same scaffold gaps apply |
| `commands/kmg-init-shared/kmg-init-scaffold.md` | Dir + file scaffold step — add `concepts/`, `templates/`, `triggers.md` |

---

## Desired Behavior

1. **Backfill offer** — triggered when any of `chat-history/`, `plans/`, `research/`, `specs/` exist under the project root, regardless of `CLAUDE.md` presence. `CLAUDE.md` remains a valid *additional* backfill source when present.

2. **`triggers.md`** — scaffolded unconditionally alongside `rules.md` and `me.md`.

3. **`CLAUDE.md`** — when absent, init offers: "No `CLAUDE.md` found. Create one with KMGraph platform preferences? (Recommended)". Creates a minimal file with the Claude Code platform-preferences block if accepted.

4. **`concepts/` and `templates/`** — created by the dir scaffold step. `kg-category-index.md` deployed to `concepts/`. Blank starters deployed to `templates/`.

---

## Acceptance Criteria

- [ ] Init on a project with no `CLAUDE.md` still offers backfill when `chat-history/`, `plans/`, or `research/` exist
- [ ] `triggers.md` present after init on any new KG
- [ ] `CLAUDE.md` offer appears when no `CLAUDE.md` exists; file created on acceptance
- [ ] `knowledge/concepts/` and `knowledge/templates/` both present after init
- [ ] Existing KG upgrade path (`kg_upgrade`) unaffected
