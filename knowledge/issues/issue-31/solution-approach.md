# issue-31: Solution Approach

## Proposed Fix

1. In `commands/kmg-handoff.md`:
   - Line 36 (flag doc): change
     `--output-dir=<path>` (optional): Custom output directory (default: `./handoff-packages/YYYY-MM-DD/`)
     to reference `knowledge/handoffs/YYYY-MM-DD/`.
   - Line 90 (Step 1 implementation): change
     `output_dir="./handoff-packages/$(date +%Y-%m-%d)"`
     to
     `output_dir="knowledge/handoffs/$(date +%Y-%m-%d)"`
   - This is a one-line-literal + one doc-line fix; no logic change otherwise.

2. Grep `commands/kmg-handoff.md` for any other reference to `handoff-packages` to make
   sure nothing else in the file still points at the old path (examples section, etc.).

3. Stray directory disposition (`handoff-packages/2026-04-21` through `2026-07-28`,
   12 directories) — **not decided by this spec.** Two candidate options for the
   implementer/user to choose between when this is picked up:
   - **Option A — Migrate:** move each dated folder's contents into
     `knowledge/handoffs/<date>/`, preserving history.
   - **Option B — Discard:** delete `handoff-packages/` outright. Justification: the
     directory is gitignored (`.gitignore:94`), so nothing in it was ever committed —
     these are regenerable working artifacts, not a source of truth. Safe to delete
     unless one of the 12 packages is known to contain content not captured elsewhere.

4. Follow-up (out of scope for this issue, flagged only): audit other `commands/*.md`
   files for additional stale path literals left over from the v0.6.20 migration
   (candidates per ADR-066: `~/.claude/knowledge-graphs`, `~/.claude/cowork-knowledge`).
   ADR-066 already recommends this as a general migration-checklist gap; this issue does
   not attempt that audit itself.

## Out of Scope

- No change to `kg-config.json` schema or the migration/upgrade script itself — this is a
  single command file's hardcoded literal, not a config or schema issue.
- No decision here on stray-directory disposition (Option A vs. B above) — left open.
