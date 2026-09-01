---
title: Troubleshooting
---

# Troubleshooting

## Plugin update not taking effect

After a plugin update from the Claude Code marketplace, commands from the old version may still be loaded. The fix is to clear the plugin cache and reinstall.

**macOS / Linux:**

```bash
# 1. Clear the stale cache
rm -rf ~/.claude/plugins/cache/stayinginsync-knowledge-graph

# 2. In Claude Code, run:
/plugin uninstall kmgraph
/reload-plugins
/plugin update stayinginsync
/plugin install kmgraph
/reload-plugins
```

Then fully quit and relaunch Claude Code, restart the MCP server (`/mcp restart kmgraph`), and verify with `/kmgraph:kmg-init` (select option 1 — Verify/upgrade).

**Windows (PowerShell):**

```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\.claude\plugins\cache\stayinginsync-knowledge-graph"
```

Then follow the same `/plugin uninstall` → `/plugin install` steps above.

> 👍 **Tip**
>
> The marketplace may still show the older version number after `/plugin update stayinginsync`. That is expected — continue with the reinstall.

---

## Commands do not appear in Claude Code autocomplete

- Verify the plugin is loaded: start Claude Code with `claude --plugin-dir /path/to/knowledge-graph`
- Commands use a colon, not a hyphen: `/kmgraph:kmg-init` (correct), `/knowledge-init` (incorrect)
- Restart Claude Code completely if commands still do not appear after the above

---

## MCP server does not start

```bash
# Verify Node.js is installed (18+ required)
node --version

# Check the MCP server binary exists
ls mcp-server/dist/index.js

# Test the MCP server directly
./tests/test-mcp-direct.sh
```

If the binary is missing, rebuild it:

```bash
cd mcp-server && npm install && npm run build
```

> **Note (v0.5.10.5+):** The MCP server is now pre-bundled and committed to `mcp-server/dist/`. Marketplace installs (Claude Code, Codex CLI) should have the binary without running `npm install`. The rebuild command above is only needed for local development or manual git-clone installs that modify the server source.

---

## Upgrading to v0.7.0 (cwd-derived resolution + config schema migration)

v0.7.0 (ADR-067) moves graph resolution from a single `active` pointer in `kg-config.json` to per-graph `status`/`statusChangedAt`/`graphId` fields, with the graph in scope for a session derived from your current working directory (`resolveGraph`) rather than a global "active" switch. This also retires the legacy `~/.claude/kg-config.json` config location in favor of the platform-neutral `~/.kmgraph/kg-config.json`.

Run `kg_upgrade` (or `/kmgraph:kmg-init`, option 1 — Verify/upgrade) to migrate automatically:

- Both the primary and any leftover legacy config file are backed up to `~/.kmgraph/backups/` unconditionally, before anything is changed.
- Every graph whose path is still reachable (`checkGraphPathHealth` reports `"ok"`) is migrated to the new schema and set to `status: "active"`; the old top-level `active` key is removed.
- A graph whose path is no longer reachable is **not** silently activated — it is left unmigrated and listed under "Needs attention" in the `kg_upgrade` result so you can decide whether to relocate, archive, or remove it.
- The leftover legacy `~/.claude/kg-config.json` file is deleted as part of this same migration step (after the backup above, and only with confirmation — pass `confirmMigration: true` when calling `kg_upgrade` non-interactively). This happens regardless of whether every graph was migrated — a graph left under "Needs attention" does not block the legacy file's deletion, since it's already safely backed up and the "Needs attention" graph was never depending on that legacy file in the first place.

If you see a "Needs attention" entry after migrating, the fastest path is usually to fix the graph's `path` field (or remove the stale entry) in `~/.kmgraph/kg-config.json` and re-run `kg_upgrade` to pick it up.

---

## Upgrading to v0.6.7 (template apply protection)

v0.6.7 fixes a bug where `kg_upgrade apply templates` unconditionally overwrote existing files, including user-modified READMEs (`decisions/README.md`, `lessons-learned/README.md`). If you were affected, recover with:

```bash
git checkout HEAD -- knowledge/decisions/README.md knowledge/lessons-learned/README.md
```

After upgrading to v0.6.7, `kg_upgrade apply` skips any existing file with different content and reports it as "Skipped (user content): … (manual review required)". No more silent overwrites.

---

## Upgrading to v0.6.6 (init compliance gate)

v0.6.6 adds a mandatory STOP gate to `kmg-init` when an existing knowledge graph is detected. If the upgrade wizard previously skipped straight to FTS5/wiki steps without presenting the upgrade menu, upgrade to v0.6.6+ and re-run `/kmgraph:kmg-init` — the gate now forces the numbered menu to appear.

---

## Upgrading to v0.5.10.7 (starter relocation + concepts/ rename)

v0.5.10.7 renamed `core/default-templates/knowledge/` to `core/default-templates/concepts/` and moved starter templates from live dirs into `knowledge/templates/`. Running `/kmgraph:kmg-init` (option 1 — Verify/upgrade) applies both migrations automatically.

**If you prefer to migrate manually:**

*Starter relocation — move starters out of live dirs:*
```bash
mkdir -p /path/to/kg/templates
for f in lessons-learned/lesson-template.md decisions/ADR-template.md sessions/session-template.md knowledge/entry-template.md; do
  [ -f "/path/to/kg/$f" ] && mv "/path/to/kg/$f" "/path/to/kg/templates/$(basename "$f")"
done
```

*`knowledge/knowledge/` merge (only if this nested dir exists):*
```bash
# If the dir exists and files are unmodified vs. plugin source, merge:
mv /path/to/kg/knowledge/knowledge/*.md /path/to/kg/knowledge/concepts/
rmdir /path/to/kg/knowledge/knowledge
# Archive first if files have been edited — they represent your customizations.
```

---

## Templates are not found

Verify that `core/default-templates/` exists in the project directory and that templates were copied:

```bash
ls core/default-templates/
cp -r core/default-templates/. docs/templates/
```

---

## Which lesson category should I use?

| Category | Use for |
|---|---|
| `architecture` | System design decisions, component relationships |
| `process` | Workflow improvements, tool configurations, procedures |
| `patterns` | Reusable solutions discovered through experience |
| `debugging` | Bug investigations, troubleshooting sessions, root cause analysis |

When uncertain: use `debugging` for problem-solving and `process` for workflow-related insights.

---

## Is git required?

Git is recommended but not required. With git, the system automatically captures branch name, commit hash, and PR/issue numbers as lesson metadata. Without git, all features remain available — only automatic code linking is unavailable.

---

## I renamed my repo (or its containing folder) — is my KG still registered?

Yes, and `/kmgraph:kmg-init` fixes it automatically. GitHub repo renames and
local folder renames don't update `~/.kmgraph/kg-config.json` for you — the
registry still points at the old path under the old key. But the KG content
itself, including its `.kmgraph-id` marker file, moves with the folder, so
the fix is a repoint, not a fresh setup.

Run `/kmgraph:kmg-init` from inside the renamed folder. It detects this exact
situation — a fully-formed KG on disk with no config entry pointing at it,
whose `graphId` matches an existing (now-stale) registry entry — and offers
to fix the config entry in place rather than registering a duplicate:

- Renames the config key to match the folder's current name
- Repoints `path` to the folder's current location
- Preserves everything else on the entry — categories, git strategy,
  `lastUsed`, history

Accept the fix (option 1) and it's done in one step, with the original
config backed up first (`kg-config.json.bak.<timestamp>`) same as any other
config write.

**One follow-up worth doing right after:** the FTS5 search index is
local-only and doesn't move with the folder rename. `kmg-init` will offer to
rebuild it (`kg_fts5_rebuild`) once the config fix lands — accept that too,
or `kg_search`/`kg_recall` fall back to a slower linear scan until you
rebuild manually later.

If you renamed two repos in a swap (e.g. repo A → repo B's old name, repo B
→ a holding name) rather than a single rename, do the folder/`git remote`
renames locally first so they match GitHub, *then* run `/kmgraph:kmg-init` —
it resolves off whatever's actually on disk at the time it runs.

---

## Still stuck?

Open an issue at [github.com/technomensch/knowledge-graph/issues](https://github.com/technomensch/knowledge-graph/issues).
