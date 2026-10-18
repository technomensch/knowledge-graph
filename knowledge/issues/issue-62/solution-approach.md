# issue-62: Solution Approach

**Chosen by:** the user, 2026-10-18 ("rewritten script sounds fine"). Reviewed by Opus as an independent check.

## Decision

Rewrite `scripts/validate-plugin.sh` to about 20 lines with two checks, scanning tracked files only. Do not move the checks into `kg_check_sensitive` (see Rejected).

## Changes

1. **`scripts/validate-plugin.sh`** (rewrite, about 20 to 25 lines)
   - Start with `top=$(git rev-parse --show-toplevel) || exit 2; cd "$top"` (a plain `cd "$(...)"` becomes `cd ""` outside a git repo and silently stays put). `git grep` only searches the current directory and below, so a run from a subdirectory would otherwise miss almost everything.
   - Use `git grep -nIiE` (or `-F` for the path) so only tracked files are read. This skips `node_modules`, `dist`, build leftovers and gitignored files with no exclude list.
   - Exclude the script itself (`':!scripts/validate-plugin.sh'`), because it contains every name it searches for.
   - Check 1, private project names: "resume optimization", "enforcement saga", "optimize-my-resume", and `Shadow Sync([^:]|$)` (not followed by a colon, but still caught at the end of a line).
   - Check 2, maintainer home path: `git grep -F "/Users/${USER:-$(id -un)}"` with no trailing slash, so `/Users/<you>` at the end of a line is caught (it also matches longer names that start the same way, such as `/Users/<you>2/`, which is acceptable). The `$(id -un)` fallback matters: with `USER` unset the pattern would become `/Users//` and the check would pass silently. Use the real username, not a generic `/Users/<name>/`, because that form would flag about 40 placeholder examples (`/Users/name/`, `/you/`, `/john/`, `/YourName/`, `/me/`).
   - Exit codes: `git grep` exits 1 for "no match" and 128 for an error. Treat 1 as clean and anything above 1 as a script failure, not a pass. Print colors with `printf`, since `echo "${RED}..."` shows a literal `\033`.
   - Keep the result lines: exit 0 when clean, exit 1 with the list of violations.
2. **`docs/reference/hooks.md` line 76**: remove `validate-plugin.sh` from the list of scripts "invoked by installer and CLI commands", and say it is a manual pre-publish check.
3. **`CHANGELOG.md` line 76**: reword the mention of the old project (for example "an unrelated prior project") so check 1 passes. Add a `### Fixed` entry for this fix without the private names. Which section it goes under is an open decision below.
4. **Optional, user's call:** run it as an advisory check from `scripts/pre-push-gate.sh`. Not part of the base fix.

## Decisions (all settled by the user)

- **Scan scope. DECIDED 2026-10-18: option (a), exclude `knowledge/`; the check covers only what ships to users.** The public notes are not part of this fix. Considered: 513 tracked files under `knowledge/` are public on GitHub, and they match the checks: the project names in 10 files, and 96 lines with `/Users/mkaplan`. Options: (a) exclude `knowledge/` so the check covers only what ships to users (the exclude, `':!knowledge'`, goes on both `git grep` calls), and the script passes after the CHANGELOG reword; (b) scan `knowledge/` too and add cleaning those 11 files and 96 lines to this work (a much bigger change touching many records); (c) exclude `knowledge/` now and file a separate issue for the public notes.
- **Project-name list location. DECIDED 2026-10-18: stays in the public script (recommended option).** Considered: in the public script (as today), or in a gitignored local file. The names are already public in CHANGELOG, in tracked notes and in git history, so a local file buys little. If it is chosen, a missing file must warn, not pass silently.
- **CHANGELOG section. DECIDED 2026-10-18: `### Fixed` under the empty `[Unreleased]` section (recommended option).** Considered: there is an empty `## [Unreleased]` above `## [0.7.11] — 2026-10-17`. Put the entry under one of them. No Version Files sync is needed if no new number is minted.

## Separate finding (not fixed here)

`package.json` `files` lists `docs/CHANGELOG.md`, which does not exist. Worth its own issue.

## Dropped rules and why

- `v9.3` / `v9.4` labels: that version series is gone; zero hits.
- `#NN` issue numbers: aimed at the old project's issue numbers; this repo now has its own, so it only produces noise (many harmless examples).
- Old project path: merged into the project-names check; zero hits.
- Email addresses: weak; the shipped hits are the author email and test fixtures.

## Rejected

- **Add a `scope: "plugin"` to `kg_check_sensitive`.** Needs a new file walker, new default patterns, an exclude list, an mcp-server version bump, tests, docs pages and an edit to the protected `commands/kmg-check-sensitive.md`. Its built-in defaults would ship the private project names to every user.
- **Add the patterns to the sanitization config only.** The tool still reads only `.md` files, still walks `node_modules`, and the patterns would fire on every graph scan.
- **Retire the script.** Rejected because two checks (private names, personal paths) are not covered anywhere else.

## Files touched

`scripts/validate-plugin.sh`, `docs/reference/hooks.md`, `CHANGELOG.md` (more if the scan scope includes `knowledge/`). No `mcp-server` change, no protected files.

## Verification

- Run the rewritten script on the branch: expect exit 0 (after the scope decision above).
- Run the cases in `test-cases.md`, including a run from a subdirectory and a run with `USER` unset.
- Run the docs build.
