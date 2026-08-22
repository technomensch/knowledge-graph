# Solution Approach: Issue 29 — Chat Extraction Cross-Project Bleed

## Goal

Stop `/kmgraph:kmg-extract-chat` / `run_extraction.py` from silently merging unrelated
projects' session content into `knowledge/chat-history/`, and separately scope out the work
needed to remediate the archive that already contains such content.

## Approach

### 1. Argument handling hardening (`run_extraction.py`)

- Replace the current bare `argparse.parse_args()` (or equivalent) with `parse_known_args()`
  so unrecognized flags surface explicitly instead of being silently dropped.
- Add pre-processing: for any long-form flag not in the known set (`--source`, `--limit`,
  `--output-dir`, `--date`, `--after`, `--before`, `--today`, `--project`, `--incremental`),
  check whether stripping the leading `--` yields a name that fragment-matches a directory
  under `~/.claude/projects/`. If so, rewrite it internally to `--project=<name>` before final
  parsing. If not, raise a clear `SystemExit` error naming the unrecognized flag — no silent
  swallow.

### 2. Default-to-current-project scoping

- Resolve the active KG's project name the same way other parts of the codebase resolve
  `~/.kmgraph/kg-config.json` (`graphs[active].name` / path basename).
- If `--project` is not explicitly passed AND no all-projects opt-in flag is passed, default
  `project_filter` to the active project's name rather than `None` (which today means "no
  filter, scan everything").
- Add an explicit `--all-projects` flag for the legitimate cross-project use case, so it's an
  opt-in choice with clear intent rather than the silent default.

### 3. Documentation update

- Update `commands/kmg-extract-chat.md` to describe:
  - The new default (current-project-only) behavior.
  - The `--all-projects` opt-in flag.
  - The `--<project-name>` shorthand behavior and its fragment-matching semantics.
  - A warning that unrecognized flags now error instead of being silently ignored.

### 4. Regression coverage

- Add a test (or extend existing extraction tests, if any exist under `mcp-server/` or a
  Python test suite) asserting that an extraction run with no `--project` flag and no
  `--all-projects` flag only pulls sessions from the current project's directory.
- Add a test asserting that an unrecognized flag with no directory match raises an error.
- Add a test asserting that a flag matching a project directory name (e.g.
  `--knowledge-graph`) is treated as `--project=knowledge-graph`.

## Out of Scope for This Issue's Implementation

- Actually re-extracting or scrubbing the 42+ already-contaminated historical chat-history
  files (Feb–Jul 2026). That is tracked as required follow-up work in
  `issue-29-description.md` and should become its own issue/plan once this code fix lands,
  since remediation strategy (re-extract-and-replace vs. targeted scrub) needs its own design
  discussion.
- Today's `2026-07-24-claude.md` cleanup — already being handled by a separate, concurrently
  running remediation task.

## Links

- Local ID: `issue-29`
- Related ADR: `knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md`
