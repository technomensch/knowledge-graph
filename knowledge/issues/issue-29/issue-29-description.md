---
id: issue-29
type: Bug
status: tracked
github-issue: "#197"
branch: issue/29-chat-extraction-cross-project-bleed
created: 2026-07-27
---

# Issue 29: `/kmgraph:kmg-extract-chat` bleeds cross-project content into `knowledge/chat-history/` (no default project scoping)

## Summary

`/kmgraph:kmg-extract-chat` and its underlying `run_extraction.py` scan **all** Claude Code
session logs under `~/.claude/projects/` on the machine and merge them by calendar date into
`knowledge/chat-history/YYYY-MM/YYYY-MM-DD-claude.md`, **unless** the caller explicitly passes
`--project=<fragment>`. There is no default-to-current-project behavior and no confirmation
or warning when the command runs unscoped. As a direct result, real session content from
unrelated projects on this machine has been merged into this repository's own chat-history
archive — this is the same failure class already under active architectural review in
ADR-067 (`knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md`),
which addresses cross-project KG content bleed at the `kg_*` MCP tool layer. This finding shows
the identical root problem (no default project-scoping, easy to invoke unscoped) already
manifested historically at the chat-history extraction layer — a different surface, same class
of bug.

## How It Was Discovered

Live, during work on ADR-067. A user invoked:

```
/kmgraph:kmg-extract-chat --claude --knowledge-graph -since last extraction
```

`--knowledge-graph` is **not** a recognized flag in `run_extraction.py`'s actual argparse
definition and was silently ignored (confirmed directly against the installed plugin cache at
`~/.claude/plugins/cache/stayinginsync-knowledge-graph/kmgraph/0.6.16/core/scripts/run_extraction.py`,
lines 13–23):

```python
parser.add_argument("--source", choices=['all', 'claude', 'gemini', 'codex'], default='all', ...)
parser.add_argument("--limit", type=int, default=None, ...)
parser.add_argument("--output-dir", type=str, default=None, ...)
parser.add_argument("--date", type=str, default=None, ...)
parser.add_argument("--after", type=str, default=None, ...)
parser.add_argument("--today", action="store_true", ...)
parser.add_argument("--before", type=str, default=None, ...)
parser.add_argument("--project", type=str, default=None,
    help="Filter to sessions from a specific project (path fragment match against ~/.claude/projects/<name>/)")
parser.add_argument("--incremental", action="store_true", ...)
```

Only `--source`, `--project`, `--date`, `--after`, `--before`, `--today`, `--output-dir`,
`--incremental`, and `--limit` exist. No `--project` filter was applied, so the invocation
effectively ran as `--source claude --after=2026-07-12` across **every** project under
`~/.claude/projects/`, not just `knowledge-graph`.

## Evidence — Confirmed Real Cross-Project Content Bleed

### Recent extraction (the live-discovery trigger)

`knowledge/chat-history/2026-07/2026-07-22-claude.md` (line 5864) documents the discovery
in-session:

> "Confirmed — no, it wasn't scoped to just this repo, and I found real evidence, not just a
> passing mention. Looking at `2026-07-24-claude.md` directly, it contains genuine session
> content from **`docs-readme-poc`** — actual file paths, report content, plan edits from work
> done in that other repo (e.g., `/Users/mkaplan/GitHub/docs-readme-poc/knowledge/reports/cdi-2026-07-22/...`,
> `docs-readme-poc/knowledge/plans/2026-07-23-cdi-remediation-plan.md`). That's real work from a
> different project, not this conversation just discussing docs-readme-poc as a topic."

Additional confirmed real file-path bleed (not just topical mentions):
- `knowledge/chat-history/2026-07/2026-07-18-claude.md:5181` — `path: /Users/mkaplan/GitHub/docs-readme-poc/knowledge`
- `knowledge/chat-history/2026-07/2026-07-21-claude.md:3131` — `Location: \`/Users/mkaplan/GitHub/docs-readme-poc/knowledge\``
- `knowledge/chat-history/2026-07/2026-07-10-claude.md:1655` — references another repo's own chat-history directory (`~/GitHub/tc-style-guide/knowledge/chat-history/`), confirming sessions from at least two other unrelated repos were merged into extraction runs around this period.

(Note: `2026-07-24-claude.md` itself no longer shows contamination hits at the time of this
writing — a separate remediation task is already handling deletion/re-extraction of today's
files. That cleanup is out of scope for this issue; see "Required Follow-Up" below.)

### Historical scope check (Feb–Jul 2026)

A grep for known unrelated-project path fragments
(`docs-readme-poc|career-prism|mindstudio-job-search|optimize-my-resume|tc-style-guide|career-ops|mintlify-docs`)
across `knowledge/chat-history/**/*.md` found hits in **42 of 118** archived chat-history files,
spanning every month from February through July 2026 — i.e., essentially every extraction run
that didn't happen to use `--project=`. Representative counts (file: hit-count):

| Month | Contaminated files (hit count) |
|---|---|
| 2026-02 | `2026-02-15-claude.md` (4), `2026-02-16-claude.md` (8), `2026-02-17-claude.md` (19), `2026-02-21-claude-backup.md` (2), `2026-02-22-claude.md` (4) |
| 2026-03 | `2026-03-03-claude.md` (4), `2026-03-21-claude.md` (10), `2026-03-22-claude.md` (18), `2026-03-24-claude.md` (23), `2026-03-28-claude.md` (48), `2026-03-31-claude.md` (11) |
| 2026-04 | `2026-04-07-vibe_coding.md` (31), `2026-04-12-claude.md` (71), `2026-04-15-claude.md` (13), `2026-04-16-claude.md` (4), `2026-04-21-claude.md` (1), `2026-04-28-claude.md` (5), `2026-04-28b-claude.md` (5), `2026-04-29-claude.md` (8), `2026-04-29b-claude.md` (4) |
| 2026-05 | `2026-05-05-claude.md` (18), `2026-05-06-claude.md` (1), `2026-05-21-claude.md` (23), `2026-05-22-claude.md` (2), `2026-05-26-claude.md` (2), `2026-05-28-claude.md` (3) |
| 2026-06 | `2026-06-21-claude.md` (18) |
| 2026-07 | `2026-07-01` (1), `07-03` (5), `07-05` (1), `07-06` (6), `07-07` (6), `07-09` (6), `07-10` (7), `07-12` (1), `07-15` (7), `07-17` (7), `07-18` (3), `07-21` (17), `07-22` (18), `07-25` (4), `07-26` (1) |

Sample concrete evidence from the earliest contaminated month (Feb 2026),
`knowledge/chat-history/2026-02/2026-02-16-claude.md:257`, referencing an unrelated project's
own path restructuring:

> "Changed references from `optimize-my-resume/knowledge-graph-plugin/` to
> `/Users/mkaplan/Documents/GitHub/knowledge-graph-plugin/`"

This confirms the bleed is **not new** — it has been present since at least February 2026 and
is pervasive across the archive, consistent with `/kmgraph:kmg-extract-chat` essentially never
having been invoked with an explicit `--project=` filter in practice.

## Root Cause

1. `run_extraction.py` has no default project scope — `--project` is `None` unless explicitly
   passed, and when `None` it scans every directory under `~/.claude/projects/` (all projects
   on the machine, across all repos the user works in).
2. `/kmgraph:kmg-extract-chat` (`commands/kmg-extract-chat.md`) does not itself default to, or
   enforce, current-project scoping, and does not warn/confirm before an unscoped, all-projects
   run.
3. The natural, expected invocation shape — a user typing something like `--knowledge-graph`
   assuming it acts as a project-name shorthand — is not recognized at all and silently
   swallowed by argparse (unknown args are ignored rather than erroring), so the user has no
   feedback that their scoping intent was dropped and the extraction fell through to
   all-projects mode.

## Proposed Fix (for solution-approach.md / implementation plan)

1. **Add a `--<project-name>` shorthand.** Support natural invocations like
   `--knowledge-graph` as an alias for `--project=knowledge-graph`, so intuitive usage doesn't
   silently fall through to an unscoped, all-projects extraction. This likely requires a
   pre-parse pass that recognizes any long-form flag not in the known set, checks whether it
   matches (or fragment-matches) a directory name under `~/.claude/projects/`, and if so treats
   it as `--project=<name>`; otherwise raise a clear error for genuinely unrecognized flags
   instead of silently discarding them.
2. **Default to current-project scoping.** Change the default behavior so extraction filters
   to the current-directory-resolved KG's project name unless the user explicitly opts into an
   all-projects run (e.g. `--all-projects`). This flips the safety default: opt-in for the
   broader, riskier case rather than opt-in for the safe case.

   **Update (2026-08-04):** the original wording here derived project name via `kg-config.json`'s
   `active`/`graphs.<active>.path` — that mechanism is now retired. ADR-067 (issue-41, Phase 7.2,
   branch `v0.7.0-adr-067-c1`) replaced the mutable `.active` pointer with `resolveGraph()` —
   cwd-derived resolution — and shipped a new `kg_resolve` MCP tool
   (`mcp-server/src/tools/resolve.ts`) specifically so callers don't have to re-implement that
   resolution logic themselves. The fix here should call `kg_resolve` (or replicate its
   `resolveGraph(cwd)` call) to derive the current-project name, not read `.active` — reading
   `.active` today would resolve against a stale, possibly-wrong pointer, which is the exact bug
   class this issue itself is about, one layer up. Note this issue's own file predates that work
   and was tracked on an unrelated branch (`issue/29-chat-extraction-cross-project-bleed`, PR
   #198) — this update was made directly against `main` to avoid entangling two unrelated
   branches' histories.
3. **Fail loudly on unrecognized flags** rather than silently ignoring them, so mistakes like
   `--knowledge-graph` (before the shorthand exists) or future typos surface immediately instead
   of silently changing extraction scope.
4. Update `commands/kmg-extract-chat.md` documentation to describe the new default-scoped
   behavior and the opt-in all-projects flag.

## Required Follow-Up (Separate, Not In Scope For This Issue's Implementation)

The forward-looking code fix above does **not** address the archival damage already done. The
existing `knowledge/chat-history/` archive contains real mixed-in content from at least seven
other unrelated projects (`docs-readme-poc`, `career-prism`, `mindstudio-job-search`,
`optimize-my-resume`, `tc-style-guide`, `career-ops`, `mintlify-docs`), across 42 of 118
archived files, spanning February through July 2026. This requires a dedicated remediation
effort — identifying every contaminated file, and either re-extracting each affected date
properly scoped and replacing the contents, or otherwise scrubbing the cross-project material —
tracked as its own follow-up work item. (Today's `2026-07-24` file is already being handled by a
separate, in-progress remediation effort; the historical Feb–Jul archive is not.)

## Affected Files

- `core/scripts/run_extraction.py` (installed plugin cache path:
  `~/.claude/plugins/cache/stayinginsync-knowledge-graph/kmgraph/*/core/scripts/run_extraction.py`)
- `commands/kmg-extract-chat.md`
- `knowledge/chat-history/**/*.md` (42+ contaminated archival files — remediation tracked
  separately, see above)

## Related

- `knowledge/decisions/ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md` —
  same root failure class (cross-project KG content bleed), different surface (`kg_*` MCP tool
  layer vs. chat-history extraction layer).
- `mcp-server/src/tools/resolve.ts` (`kg_resolve` MCP tool, branch `v0.7.0-adr-067-c1`) — the
  cwd-derived resolution mechanism the updated Proposed Fix item 2 above should use instead of
  the retired `.active` pointer.
- PR #198 (`issue/29-chat-extraction-cross-project-bleed`) — this issue's original tracking PR;
  parked/closed without merging since it never contained an implementation, only this tracking
  doc. See PR comment for details.
