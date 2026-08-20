# ENH-037: README indexes for enhancements/ and issues/, cross-referenced with decisions/

**Status:** ✅ Resolved in v0.6.16
**Discovered:** 2026-07-04
**Governed by:** none (scaffolding/docs parity fix, not a new command/skill/docstring — ADR-058's naming/scope check does not apply)
**Related:** `knowledge/decisions/README.md` (the pattern being extended), `core/default-templates/decisions/README.md`, `core/default-templates/lessons-learned/README.md`, ADR-029 (Plan File Location — cites `knowledge/decisions/`, `knowledge/enhancements/ENH-NNN/`, `knowledge/issue-NNN/` as parallel artifact-folder conventions), [ENH-041](../ENH-041/ENH-041-specification.md) (found the same broken nav breadcrumb freshly propagated into the four README indexes this ENH created; backlinked 2026-08-19)

---

## Problem

Validated directly this session: `knowledge/decisions/` has a `README.md` index (chronological ADR list, Active/status rollup, category breakdown, field guide) — `knowledge/enhancements/` (36 ENH folders) and `knowledge/issues/` (10 issue folders) have **no README.md anywhere.** Confirmed via direct `ls`.

The gap goes deeper than the live `knowledge/` tree. `core/default-templates/` — the PROTECTED scaffold every fresh install copies from — has `decisions/README.md` and `lessons-learned/README.md` templates, but **no `enhancements/` or `issues/` directory at all** under `core/default-templates/`. So this isn't a one-off omission in this repo's working copy; every new install of this plugin starts with an index for ADRs and lessons but nothing for enhancements or issues. Confirmed via direct `find core/default-templates -maxdepth 2`.

Without an index, finding "what enhancements exist," "which are still open," or "which issue led to which ADR/ENH" requires a full directory listing or an FTS5 search — there is no browsable, cross-referenced entry point the way `decisions/README.md` provides for ADRs.

---

## Proposed Behavior

Two deliverables, same shape as the existing `decisions/README.md` / `lessons-learned/README.md` pattern:

1. **New template scaffolds** (PROTECTED `core/` — requires explicit user permission before editing, per `CLAUDE.md`):
   - `core/default-templates/enhancements/README.md` — chronological ENH list, status rollup (🟡 Proposed / Resolved / Withdrawn), placeholder entries, field guide, "Creating a new ENH" section (mirrors `decisions/README.md`'s structure).
   - `core/default-templates/issues/README.md` — chronological issue list, status rollup, field guide, "Creating a new issue" section.

2. **Populated live indexes** in this repo's own `knowledge/` tree:
   - `knowledge/enhancements/README.md` — real chronological list of all 36 current ENH folders, each with Status + one-line summary (matching the bullet format already used in `decisions/README.md`'s "All ADRs (Chronological)" section).
   - `knowledge/issues/README.md` — real chronological list of all 10 current issue folders.

3. **Cross-reference the three indexes**, not just create them in isolation:
   - `decisions/README.md` entries that have a `Governed by` / child ENH (e.g. ADR-058 → ENH-033/034/035/036) get a forward link to that ENH's entry in `enhancements/README.md`, and vice versa — each ENH entry's "Governed by" ADR links back to `decisions/README.md`'s matching row.
   - `issues/README.md` entries that graduated into an ENH or ADR (several of the 10 issue folders already reference follow-up ENHs/ADRs in their own body — check each) get a forward link to that ENH/ADR's index entry.
   - This is the "relevant adjacent indexes to cross-reference" part of the ask — the three indexes should read as one connected navigation layer, not three independent lists.

---

## Explicitly Out of Scope

- No change to `meta-issue/` template (already has its own `README.md` under `core/default-templates/meta-issue/`) — not part of this gap.
- No new command or skill to auto-generate/maintain these indexes. Whether index maintenance should be automated (e.g. a `kmg-create-adr`-style command auto-appending to `decisions/README.md` on creation — confirmed that command doesn't currently do this either) is a separate, later decision. This ENH just closes the missing-scaffold gap; auto-maintenance is a follow-on if wanted.
- No retroactive backfill of cross-references inside existing ENH/issue body files themselves (e.g. adding a "See also: enhancements/README.md" line to all 36 ENH specs) — the cross-referencing here is index-to-index, not index-to-every-artifact.

---

## Affected Files

| File | Role |
|---|---|
| `core/default-templates/enhancements/README.md` (new) | Distro-scaffold template — PROTECTED, needs explicit permission |
| `core/default-templates/issues/README.md` (new) | Distro-scaffold template — PROTECTED, needs explicit permission |
| `knowledge/enhancements/README.md` (new) | Live populated index for this repo's 36 ENH folders |
| `knowledge/issues/README.md` (new) | Live populated index for this repo's 10 issue folders |
| `knowledge/decisions/README.md` | Modify — add forward cross-reference links to `enhancements/README.md` entries where a `Governed by`/child-ENH relationship exists |

---

## Acceptance Criteria

- [x] `core/default-templates/enhancements/README.md` and `core/default-templates/issues/README.md` exist, structurally consistent with `core/default-templates/decisions/README.md` (Total count, Last Updated, status rollup, chronological list, field guide, "Creating a new X" section). Verified via direct `ls` of all four scaffold READMEs.
- [x] `knowledge/enhancements/README.md` lists all current ENH folders with Status + one-line summary. Verified by direct count: `ls knowledge/enhancements/ | grep -c '^ENH-'` = 40 (drifted from this spec's original "36" during concurrent-session work — per ADR-059, do not treat that drift as a defect), and the "All ENHs" section lists exactly 40 rows.
- [x] `knowledge/issues/README.md` lists all current issue folders with Status + one-line summary. Verified by direct count: 9 issue folders on disk (this spec's original "10" was already inaccurate at drafting time), 9 rows in the index.
- [x] Every ENH with a `Governed by` ADR is cross-linked both directions (ADR entry → ENH entry, ENH entry → ADR entry). Verified by grepping every ENH spec's `Governed by` field directly (not assuming the plan's original 4-relationship list was exhaustive) — found a 5th, ENH-040 ↔ ADR-060, missed by Task 9's original scope and cross-linked as a follow-up fix.
- [x] Every issue that graduated into an ENH or ADR is cross-linked forward from `issues/README.md` to the matching index entry. Verified: 8 of 9 issues had a confirmed graduation (per direct read of each description file) and are linked; issue-1 explicitly notes no confirmed graduation rather than a silent omission.
- [x] A fresh install using `core/default-templates/` now produces `enhancements/` and `issues/` folders with a starter README, matching what `decisions/` and `lessons-learned/` already get. Verified via direct `ls` of all four `core/default-templates/*/README.md` paths.
