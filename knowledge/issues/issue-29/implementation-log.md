# Implementation Log: Issue 29 — Chat Extraction Cross-Project Bleed

## 2026-07-27 — Issue tracked

- Discovered live during ADR-067 work: `/kmgraph:kmg-extract-chat --claude --knowledge-graph
  -since last extraction` silently ignored the unrecognized `--knowledge-graph` flag and ran
  unscoped across all projects on the machine.
- Confirmed root cause against installed plugin cache
  (`~/.claude/plugins/cache/stayinginsync-knowledge-graph/kmgraph/0.6.16/core/scripts/run_extraction.py`):
  no default project scoping; `--project` is the only opt-in filter.
- Confirmed historical scope: grepped `knowledge/chat-history/**/*.md` for unrelated-project
  path fragments (`docs-readme-poc`, `career-prism`, `mindstudio-job-search`,
  `optimize-my-resume`, `tc-style-guide`, `career-ops`, `mintlify-docs`) — 42 of 118 archived
  files contain hits, spanning 2026-02 through 2026-07.
- Filed as `issue-29`, branch `issue/29-chat-extraction-cross-project-bleed`, GitHub issue
  created via `gh issue create --body-file`.
- Status: `tracked` (Mode 1 — track then implement; implementation not started in this pass).
- Historical archive cleanup explicitly deferred as separate follow-up work, not part of this
  issue's implementation scope.

## 2026-08-22 — Closed as resolved via ENH-061 (no new implementation)

- Dispatched to implement per this issue's own "Proposed Fix" (auto-detect + default-to-
  current-project scoping, shorthand `--<project>` alias flag). Before implementing, checked
  current repo state: `core/scripts/run_extraction.py` and `commands/kmg-extract-chat.md` were
  already changed on `main` (zero diff between this worktree's branch and `main`).
- Traced the change to [ENH-061](../../enhancements/ENH-061/ENH-061-specification.md) (GitHub
  #221, closed; PR #220, commit `2583ecb89`, resolved 2026-08-13) — a **fail-closed** gate
  ("omit `--project` → hard refuse unless `--confirm-unscoped`"), not the auto-detect design
  this issue proposed. Governed by [ADR-062](../../decisions/ADR-062-gemini-pb-project-scoping-fail-closed.md)'s
  amendment extending its existing Gemini-side pattern to Claude/Codex/`all`.
- Verified against this issue's own `test-cases.md`: TC-4 (unrecognized flag errors loudly) is
  satisfied by default `argparse.parse_args()` behavior already in the current script — no
  `parse_known_args()` + fragment-match shorthand needed. TC-1/TC-2's literal wording (default
  auto-scopes; `--all-projects` opt-in) doesn't match verbatim — the shipped design refuses to
  run at all by default rather than silently scoping — but the underlying goal (no silent
  cross-project bleed, ever) is met, and more strongly: no scope is ever inferred.
- Verified `commands/kmg-extract-chat.md` already documents `--confirm-unscoped`, the worktree
  composition notice, and ADR-062 — doc step from the proposed fix already done.
- Compared the two designs explicitly (auto-detect vs. fail-closed) before deciding: fail-closed
  wins because it doesn't depend on cwd→project resolution being correct, which this repo's git
  worktrees (three inconsistent `~/.claude/projects/` naming conventions, confirmed in ENH-061's
  own investigation) make unreliable — auto-detect would reintroduce a narrower version of the
  same "silent wrong-scope" failure class this issue exists to close.
- User confirmed: close issue-29 as resolved via ENH-061 rather than re-implementing the
  original (superseded) proposal; sync status with GitHub #197.
- Retired local plan `~/.claude/plans/v0.6.21-issue-29-chat-extraction-cross-project-bleed.md`
  (auto-detect design) — not executed, marked superseded.
- Updated `issue-29-description.md` (status → resolved, Resolution section), `README.md` issue
  index, and this log. GitHub #197 closed with a comment linking #221/PR #220/commit
  `2583ecb89`.
- Historical archive contamination (42+ files, Feb–Jul 2026) remains open, unaddressed, tracked
  as separate required follow-up — unchanged from the original filing.
