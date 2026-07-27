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
