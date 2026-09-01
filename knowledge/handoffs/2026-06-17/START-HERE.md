# Start Here — Project Handoff

**Branch:** main
**Commit:** d8a0aee1
**Continues from:** No session summary for today — run `/kmgraph:kmg-session-summary` for current state.

---

For current state, open issues, and in-progress work: run `/kmgraph:kmg-session-summary` or check `knowledge/sessions/` for the most recent entry.
For project structure and architecture: see DOCUMENTATION-MAP.md and ARCHITECTURE-SNAPSHOT.md in this package.

---

## Active Work (2026-06-17)

Two bug fixes completed today, merged to local `main`, not yet pushed to origin:

| Branch | Fix | Status |
|---|---|---|
| `v0.6.1-fix-recommendation-gate-schema` | Stop hook platform-aware JSON output (`CLAUDECODE` env var detection) | Merged to main |
| `v0.6.2-fix-upgrade-template-check` | `checkTemplates`/`applyTemplates` mapping: `knowledge/` → `concepts/` in `upgrade.ts` | Merged to main |

**Version files:** All at `0.6.0` — not yet bumped for these fixes.

**Upgrade template path mismatch still under investigation:** The MCP `kg_upgrade` tool maps templates to `lessons-learned/`, `decisions/`, `sessions/` directly, but v0.5.0+ installs store them at `knowledge/templates/`. The slash command (`kmg-upgrade-inspector.md`) handles this correctly; the MCP tool does not. Follow-up fix needed in `upgrade.ts`.
