# Test Cases: Issue 29 — Chat Extraction Cross-Project Bleed

## TC-1: Default invocation scopes to current project only

**Given:** `~/.claude/projects/` contains session logs for `knowledge-graph` and at least one
other project (e.g. `docs-readme-poc`).
**When:** `run_extraction.py --source claude --after=<date>` is run with no `--project` and no
`--all-projects` flag, from within the `knowledge-graph` repo (or with the active KG set to
`knowledge-graph`).
**Then:** Only sessions under `~/.claude/projects/*knowledge-graph*/` are included in the
output; no content from `docs-readme-poc` or any other project appears.

## TC-2: `--all-projects` opt-in still works

**Given:** Same setup as TC-1.
**When:** `run_extraction.py --source claude --after=<date> --all-projects` is run.
**Then:** Sessions from all projects are included (current behavior preserved, but now
explicit/opt-in).

## TC-3: Project-name shorthand flag

**When:** `run_extraction.py --source claude --knowledge-graph` is run.
**Then:** Behaves identically to `run_extraction.py --source claude --project=knowledge-graph`.

## TC-4: Unrecognized flag with no project match errors loudly

**When:** `run_extraction.py --source claude --bogus-flag-xyz` is run.
**Then:** The script exits with a clear error identifying `--bogus-flag-xyz` as unrecognized
and not matching any known project directory — it does NOT silently proceed with an unscoped
extraction.

## TC-5: `--project=` explicit filter still works unchanged

**When:** `run_extraction.py --source claude --project=knowledge-graph` is run.
**Then:** Behavior is unchanged from pre-fix — only matching sessions included.

## TC-6: Documentation reflects new defaults

**Check:** `commands/kmg-extract-chat.md` describes default current-project scoping,
`--all-projects` opt-in, and the project-name shorthand flag.

## Acceptance Criteria

- [ ] TC-1 through TC-6 pass.
- [ ] No regression in existing `--date` / `--after` / `--before` / `--today` / `--incremental`
      filtering behavior.
- [ ] `commands/kmg-extract-chat.md` updated and consistent with actual script behavior.
