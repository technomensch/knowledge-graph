---
id: issue-28
type: Hardening
status: deferred
github-issue: "#192"
branch: none
created: 2026-07-18
---

# issue-28: No Dev-Loop Mechanism Between Local Rebuilds and Live Plugin Behavior (`mcp-server/dist/`, Hooks)

## Problem

While testing the `applyStrayKnowledgeDir` fix (issue-27) in `mcp-server/src/tools/upgrade.ts`, it was discovered that the live `kg_upgrade` MCP tool calls in this Claude Code session were not backed by this repo's own rebuilt `mcp-server/dist/index.js`. They were backed by a completely separate, already-installed copy of the plugin at:

```
~/.claude/plugins/cache/stayinginsync-knowledge-graph/kmgraph/0.6.16/mcp-server/dist/index.js
```

— an older version (0.6.16) that predates this branch's work entirely and did not contain the fix.

Confirmed directly:

```bash
grep -c "already exists with different content" \
  ~/.claude/plugins/cache/stayinginsync-knowledge-graph/kmgraph/0.6.16/mcp-server/dist/index.js
# → 0 (fix string absent)

grep -c "already exists with different content" \
  /Users/mkaplan/GitHub/knowledge-graph/mcp-server/dist/index.js
# → 1 (fix string present, in the repo's own rebuilt copy — never invoked by live kg_upgrade calls)
```

## Why This Matters

When actively developing this plugin's own `mcp-server` code (i.e., working in this exact repo, on this exact machine), fixing and rebuilding `mcp-server/dist/` does **not** make the live MCP tools (`kg_upgrade`, `kg_config_switch`, and every other `kg_*` tool, as called through the actual Claude Code session) reflect that fix. The live tools stay pinned to whatever version was last installed via the plugin marketplace/update mechanism.

This is easy to miss: a developer can fix a bug, rebuild, run `tsc --noEmit` and the full test suite, see everything pass, and reasonably conclude the live tool now behaves correctly — when it is actually still running the old installed code. Nothing in the normal build/test loop surfaces the discrepancy.

## What Was and Wasn't Investigated

Searched `docs/`, `CLAUDE.md`, `INSTALL.md`, and `knowledge/decisions/` for any existing, documented dev-loop mechanism covering this — a local-link install mode, a "restart plugin from repo" command, or similar. Findings:

- **`ADR-054-document-cache-clear-upgrade-workaround.md`** (formerly ADR-006) documents the general stale-plugin-cache-after-*update* problem and its accepted mitigation (`rm -rf` the cache directory + reinstall via marketplace + reconnect MCP). This addresses the case where a user updates an already-installed plugin to a new released version. It does not address active local development of the plugin's own source against an already-installed copy — there is no "update" event in that scenario, so the documented workaround doesn't naturally apply (rebuilding `dist/` locally is not a marketplace update).
- **`knowledge/lessons-learned/debugging/Lessons_Learned_Debugging_Plugin_Cache_Not_Synced_From_Local_Repo.md`** covers the same cache-vs-repo split for `commands/`, `core/`, and `skills/` — its workaround is `cp -r` the changed directories into the cache path, then `/reload-plugins`. This is a viable pattern for those file types but was not verified against `mcp-server/dist/` (a compiled binary tree rather than markdown/config files) in this session.
- **`knowledge/lessons-learned/process/local-marketplace-testing-workflow.md`** covers a similar two-location sync problem for an older local-marketplace testing setup (rsync between a dev directory and a separate local marketplace directory) — a different installation topology than the current `~/.claude/plugins/cache/...` marketplace-cache model, but the same underlying "two copies, no live link" pattern.
- **`knowledge/lessons-learned/process/claude-code-plugin-cache-stale-after-update.md`** documents the same platform-level stale-cache behavior with links to the relevant upstream Claude Code GitHub issues (#14061, #15642, #19197, #29074) — again scoped to the post-*update* case, not active local `mcp-server` development.
- No file in `docs/`, `CLAUDE.md`, or `INSTALL.md` documents a "local-link" or "point the installed plugin at my repo" dev-install mode. None was found.

**Conclusion: this appears to be a genuine, undocumented gap for `mcp-server` specifically** — not merely an existing solution that went unused this session. The closest prior art (`cp` files into the cache + `/reload-plugins`) is documented for `commands/`/`core/`/`skills/` but was not exercised or confirmed working for a compiled `mcp-server/dist/` tree, which may have different reload semantics (MCP server connections may need an explicit reconnect, not just a plugin reload).

## Workaround Found This Session

Direct stdio JSON-RPC call to the repo's own `dist/index.js`, bypassing the installed plugin entirely:

1. Spawn `node dist/index.js` directly from the repo's `mcp-server/` directory.
2. Leave `CLAUDE_PLUGIN_ROOT` unset in that subprocess's environment — `getPluginRoot()`'s fallback path resolution then resolves to the repo root instead of the plugin cache path.
3. Send `initialize` followed by `tools/call` over stdin as raw JSON-RPC, per the MCP stdio protocol.
4. Read the JSON-RPC response from stdout.

This confirms a rebuilt fix works without needing a marketplace reinstall or cache-clear cycle, but it is a manual, ad hoc verification step — not an integrated part of the normal build/test loop, and easy to forget to do.

## Broader Scope Confirmed (2026-07-21) — Not Just `mcp-server`, Hooks Too

While functionally testing new gates added to `scripts/pre-push-gate.sh` (for `ENH-052`), the exact same bug surfaced on a completely different mechanism: Claude Code's `PreToolUse` hook for this script fired live during testing (a test command's string happened to contain the literal substring `"git push"`, matching the hook's own trigger pattern) and returned a shorter, different result than directly invoking the locally-edited script produced.

Checked `hooks/hooks.json`: the hook is wired as `${CLAUDE_PLUGIN_ROOT}/scripts/pre-push-gate.sh` — the exact same `CLAUDE_PLUGIN_ROOT`-resolves-to-installed-cache pattern already documented above for `mcp-server`. Confirmed directly: the cached copy at `~/.claude/plugins/cache/stayinginsync-knowledge-graph/kmgraph/0.6.15/scripts/pre-push-gate.sh` — **on version 0.6.15, one version further behind than the `mcp-server` case (0.6.16)** — contains zero occurrences of "Gate 5", "Gate 6", or "KG INDEX DRIFT". The newly-added gates exist only in this repo's working tree; the live hook that actually governs this session's own pushes has never seen them.

**This means the original title ("Live `kg_*` Tool Calls") undersold the scope.** Any project mechanism wired via `${CLAUDE_PLUGIN_ROOT}` — not just MCP tools — is subject to this gap: hooks, and likely anything else in `hooks.json` that references the same variable. Retitled to reflect this.

## Related

- [issue-27](../issue-27/issue-27-description.md) — the bug fix being tested when this gap was discovered
- **Companion lesson note (2026-08-04 correction):** a "MCP Server Rebuild Not Reflected In Live Plugin Tool Calls" companion lesson was previously linked here but was never actually captured — a 2026-08-04 KG-index audit found no such file was ever written to disk (gitignored `debugging/` category, never touched git, and no chat-history evidence corroborates it existing). The link has been removed rather than pointed at a nonexistent file; this issue's own write-up above remains the full record of the gotcha, detection pattern, and workaround.
- [ADR-054: Document Cache-Clear as Official Upgrade Path](../../decisions/ADR-054-document-cache-clear-upgrade-workaround.md) — closest existing governing decision; addresses the post-*update* stale-cache case, not this active-local-development case. No new ADR filed for this issue — see [Task 3 judgment call] below.
- [Lesson: Plugin Cache Not Synced From Local Repo](../../lessons-learned/debugging/Lessons_Learned_Debugging_Plugin_Cache_Not_Synced_From_Local_Repo.md) — same family, scoped to `commands/`/`core/`/`skills/`, not verified against `mcp-server/dist/`
- [Lesson: Local Marketplace Testing - Two-Location Sync Required](../../lessons-learned/process/local-marketplace-testing-workflow.md) — same underlying pattern under an older local-marketplace testing topology
- [ENH-052](../../enhancements/ENH-052/ENH-052-specification.md) — names this issue directly as the reason its Gates 5/6 don't yet protect a real push (they run from this working tree, not the installed plugin cache). Backlinked 2026-07-26 (paperwork-audit backlink-symmetry check).

### On the ADR question

No new ADR was created for this finding. This is judged to be a process/dev-tooling gap — there is no real architectural alternative being weighed here (the fix, if one is ever built, would most likely be "document the JSON-RPC bypass" or "extend the existing cp-to-cache workaround to cover `mcp-server/dist/`," both of which are documentation/tooling additions consistent with the ADR-054 direction already accepted, not a new decision point). If a future investigation finds this needs an actual architectural choice (e.g., a symlink-based local-install mode with real trade-offs), it should get its own ADR at that time.
