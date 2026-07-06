# ENH-039: Rule-injection scripts hardcode personal split-file names instead of discovering them

**Status:** 🟡 Proposed
**Discovered:** 2026-07-04
**Governed by:** none (script robustness fix, not a new command/skill/docstring — ADR-058's naming/scope check does not apply)
**Related:** `scripts/hooks-master.sh`, `scripts/post-plan-validate-checklist.sh`, `scripts/pre-skill-rules-inject.sh`, `scripts/rules-size-check.sh`, `~/.kmgraph/rules.md § Rules File Management`, branch `v0.6.16-update-claude-extract-chat-for-sub-agents`

---

## Problem

Four tracked scripts under `scripts/` hardcode the exact filenames a user's personal `~/.kmgraph/rules.md` split produces (`plan-rules.md`, `governance-rules.md`), even though `rules.md § Rules File Management` documents splitting as an optional, user-triggered action with no fixed naming schema — any name and any number of split files is valid.

Confirmed concretely this session: an existing user split `plan-rules.md` into `plan-authoring-rules.md` + `plan-execution-rules.md` (a legitimate reorganization under the documented threshold rule). All four scripts' hardcoded `plan-rules.md` references immediately went stale — `hooks-master.sh`'s staleness loop, `post-plan-validate-checklist.sh`'s advisory message, `pre-skill-rules-inject.sh`'s section-extraction source, and `rules-size-check.sh`'s example text all pointed at a file that no longer existed. `pre-skill-rules-inject.sh` has a fallback (`[ -f "$KMGRAPH_PLAN_RULES" ] || KMGRAPH_PLAN_RULES="$KMGRAPH_RULES"`) that silently degrades to reading the (now much smaller) unsplit `rules.md` instead of erroring — meaning the script's actual behavior after a rename is quietly wrong, not loudly broken, and easy to miss.

This repo is described in its own `CLAUDE.md` as a "Claude Code extension + cross-platform MCP server," implying other consumers install this plugin with their own personal `~/.kmgraph/` layout. Hardcoding one user's chosen split filenames into shared, tracked scripts means any other user's split (different names, different section boundaries, or no split at all under a different threshold) is either silently degraded or breaks outright — this is not a one-off, it will recur every time any user reorganizes their personal rules files.

---

## Proposed Behavior

Replace hardcoded split filenames with discovery by content marker, not by name:

1. Every split file already carries a `> Sourced from ~/.kmgraph/<source-file>.md split — YYYY-MM-DD` marker line (written per `§ Rules File Management`'s existing convention) — **correction found during implementation:** the source filename in the marker is not always literally `rules.md`. A re-split of an already-split file (confirmed real on this machine: `plan-rules.md` → `plan-authoring-rules.md` + `plan-execution-rules.md`) cites the intermediate file it was actually split from, not the original `rules.md`. The discovery pattern must match `^> Sourced from ~/\.kmgraph/.*\.md split` (any source filename), not a literal `rules.md` string, or it silently misses re-split files. Scripts that currently open a hardcoded path (`plan-rules.md`, `governance-rules.md`) instead glob `~/.kmgraph/*.md`, filter to files containing that generalized marker pattern, and extract the needed section (`### Parallelism Analysis`, `### Approval Gates`, etc.) from whichever matched file actually contains it — the section header becomes the stable contract, not the filename.
2. `hooks-master.sh`'s staleness-check loop and `rules-size-check.sh`'s split-recommendation message stop naming specific split files and instead iterate over whatever `~/.kmgraph/*.md` files carry the split marker.
3. Preserve the existing fallback: if no split has occurred (no files carry the marker), read `rules.md` directly, unchanged from today.
4. Update `rules.md § Rules File Management`'s splitting checklist to note that scripts discover split files by marker + section header, not filename — so a future split (any name, any boundary) does not require a corresponding script change.

---

## Explicitly Out of Scope

- A manifest file (e.g. `~/.kmgraph/.split-manifest.json`) mapping sections to filenames — heavier to build and maintain; only worth it if marker+header discovery proves insufficient in practice. Not attempted here.
- Re-splitting or renaming any currently-split file again.
- Changing anything about *when* a split is recommended (the 120-line/2-domain threshold in `§ Rules File Management` is unaffected).

---

## Affected Files

| File | Role |
|---|---|
| `scripts/hooks-master.sh` | Staleness-check loop, split-recommendation message — remove hardcoded filenames |
| `scripts/post-plan-validate-checklist.sh` | Advisory checklist message — replace hardcoded path with discovered section source |
| `scripts/pre-skill-rules-inject.sh` | Section extraction (`_extract_section`) — replace hardcoded `KMGRAPH_PLAN_RULES`/`KMGRAPH_GOVERNANCE_RULES` paths with marker-based discovery |
| `scripts/rules-size-check.sh` | Example text referencing a specific split filename — make generic |
| `~/.kmgraph/rules.md § Rules File Management` | Splitting checklist — document discovery contract instead of implying scripts need per-split updates |

---

## Acceptance Criteria

- [x] All four scripts locate split-file content by scanning for the (generalized) `Sourced from ~/.kmgraph/*.md split` marker plus the target section header, not by a hardcoded filename. Verified directly: `hooks-master.sh`'s staleness loop, `pre-skill-rules-inject.sh`'s 5 section-source resolutions (Parallelism, File Location, Approval Gates, Ad-Hoc, Execution/Capture), `rules-size-check.sh`'s and `post-plan-validate-checklist.sh`'s example/advisory text all no longer reference `plan-rules.md`/`governance-rules.md` literally.
- [x] Renaming an existing split file, or choosing different split boundaries/names on a future split, does not require any script change. Verified against this machine's real, already-renamed split (`plan-authoring-rules.md`/`plan-execution-rules.md`, sourced from the now-nonexistent `plan-rules.md`): discovery correctly located both files by marker + section header, no script change needed.
- [x] Existing no-split fallback (reading `rules.md` directly) is preserved and tested. Verified by temporarily moving both `plan-authoring-rules.md` and `plan-execution-rules.md` out of `~/.kmgraph/`, confirming discovery fell back to `rules.md` with no error, then restoring both files immediately.
- [ ] `§ Rules File Management` updated to describe the discovery contract, removing the implication that splitting requires updating `scripts/`. Not done as part of this repo's commit — `~/.kmgraph/rules.md` is a personal file outside this repo, per this task's own scoping. Left for a separate personal-file edit.
