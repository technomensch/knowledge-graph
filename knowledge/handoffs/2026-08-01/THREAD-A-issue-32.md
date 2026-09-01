# Thread A — issue-32: Stale MCP Process Warning After Upgrade

**Self-contained** — this file plus its two linked source docs are everything you need.
You do not need Thread B's detail (ADR-067/v0.7.0) to pick this up.

## Status

Fully researched, fully designed, plan written and reviewed twice by Opus. Nothing
implemented, nothing committed. Waiting on: (optional) one more review pass, then
explicit user "Proceed"/"Start" to begin implementation.

## The problem

`kg_upgrade`'s version-sentinel mechanism (ADR-055) detects when an installed plugin
version is ahead of what a graph last applied, but a session that was **already open**
before an upgrade landed keeps running the *old* code indefinitely — Node.js processes
don't hot-reload. Confirmed live, same-day repro on 2026-07-28: 6 of 8 running
`mcp-server/dist/index.js` processes kept serving a stale version after `/plugin` update
+ `/reload-plugins`, with zero signal to the user that they were behind. This is a
plausible root cause for real split-brain incidents documented elsewhere in the KG.

## Design history (why it changed)

The original design self-checked the running process's own entry file for staleness.
An independent Opus review found this **can never detect anything**, because this
project's installs are version-pinned sibling directories that never get modified in
place — there is no "own file changed" to detect. The corrected design instead resolves
the *installed* version independently (Claude Code plugin manifest first, sibling-
version-directory scan as fallback, real semver comparison — never mtime) and compares
it against the process's own baked-in version. Two misattributed prior-art citations
(claude-mem) were also corrected during this fix.

## Architecture (resolved design)

- New `mcp-server/src/staleness.ts`: resolves currently-installed version independently
  of the running process's own path; caches keyed on `(resolved-pointer-path, mtime)` so
  repeat tool calls stay cheap; compares against the process's own version via the
  existing `handleVersion()` in `tools/version.ts` (no duplicate version-reading logic).
- `index.ts` wraps `server.tool()` once, before any `register*Tools(server)` call, so
  every tool response gets a lazily-computed staleness check with zero per-tool-file
  changes.
- Warning is embedded as an explicit "relay this to the user" instruction in the tool's
  own response content. Remediation text branches on `CLAUDE_PLUGIN_ROOT` being set
  (Claude Code → `/reload-plugins`) vs. not (Gemini/Codex/Desktop → full restart).
- **Never self-restarts** — no `process.exit()`, no spawning a replacement process. The
  host owns the stdio-pipe-to-PID transport; this is a hard constraint, not a preference.
- Fail-open: every resolution/cache function returns `null` (never throws) when it can't
  confidently resolve a version, so a tool call never fails because of this check.

## Plan review history

Two Opus review passes on the implementation plan:
- Pass 1: found a blocking defect in the underlying design itself (the self-stat
  approach above) — corrected before the plan was written.
- Pass 2: found 3 blockers + 1 should-fix in the plan document — all fixed directly in
  the plan file.

## Key constraints (full detail in the plan file)

- Branch `v0.6.21-fix-stale-mcp-process-warning`, created from **`main`, not `v0.7.0`**
  — this is an independent patch fix, no dependency on ADR-067 landing first.
- Version bump `0.6.20` → `0.6.21` in `package.json`, `mcp-server/package.json`,
  `.claude-plugin/plugin.json` — all three, synced.
- Shared-file collision risk: both this plan and the ADR-067/v0.7.0 plan (Thread B)
  touch `mcp-server/src/index.ts`. This plan adds one import + one function call
  immediately after `const server = new McpServer(...)`. Whichever branch merges second
  will need a small manual rebase at that one insertion point — already flagged in the
  plan, not a surprise to discover later.
- No new runtime dependencies (hand-written `compareSemver`, no `semver` package).
- Cross-platform coverage is honestly scoped: the sibling-directory scan is confirmed
  only for Claude Code on this machine; Codex/Gemini fail open (return `null`) if their
  install layout differs, rather than breaking.

## Source files

- `knowledge/issues/issue-32/issue-32-description.md` — full problem statement, repro,
  prior art (claude-mem #2246, claude-hud's version-check pattern), design rationale.
- `knowledge/issues/issue-32/v0.6.21-plan.md` — implementation-ready plan, 1038 lines,
  both Opus review rounds already folded in.

## Next step

Review the plan (optionally one more Opus pass, or trust the two prior reviews already
applied), then say "Proceed" or "Start" to begin implementation on branch
`v0.6.21-fix-stale-mcp-process-warning` off `main`.
