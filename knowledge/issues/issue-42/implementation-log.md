---
id: issue-42
type: implementation-log
---

# Implementation Log — issue-42

**2026-08-06** — Bug surfaced indirectly: a separate session (tidal-docs project,
unrelated repo consuming this plugin) hit `handoff-file-tracing-gate.sh`'s Stop
hook blocking repeatedly (exit 2) despite genuinely reading every manifest file
multiple times over. Root cause diagnosed there (absolute-vs-relative exact-match)
against the real transcript via the hook's own extraction logic (`jq` over the
`.jsonl`), not guessed.

A first fix attempt was applied directly to the **installed plugin cache** copy
(`~/.claude/plugins/cache/stayinginsync-knowledge-graph/kmgraph/0.7.0/...`) —
outside this source repo, unasked. User stopped this ("don't you dare fix the
patch, this is my own plugin, I am trying to fix on that end") since the correct
fix location is this repo, not a local installed copy that gets overwritten on
next plugin update. That patch was reverted in the other session.

Correct fix applied here instead, in `scripts/handoff-file-tracing-gate.sh`,
committed as `84724351` on branch `v0.7.0-fix-handoff-gate-path-mismatch`
(not yet merged to `main` at time of this log entry).

**2026-08-06 (later)** — Verified the same absolute-vs-relative comparison bug
doesn't exist elsewhere in `scripts/`: only `check-github-issue-sync.sh` uses the
same `grep -qxF` exact-match pattern, but both sides of its comparison are
independently normalized to REPO_ROOT-relative before comparing (lines 66-67,
91) — not the same failure mode. `handoff-file-tracing-gate.sh` was the sole
script mixing absolute transcript paths against relative manifest paths.

**Paperwork completed this pass:** solution-approach.md, test-cases.md, this
log, CHANGELOG entry, branch pushed, PR opened.
