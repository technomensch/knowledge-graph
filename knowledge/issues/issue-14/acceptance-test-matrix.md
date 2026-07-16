---
id: issue-14
title: Operational Acceptance-Test Matrix — config-path migration (c1/c2/c3)
status: tracked
github-issue: "#171"
created: 2026-07-15
---

# Operational Acceptance-Test Matrix — issue-14 config-path fix

**Purpose:** the per-file greps in c1/c2/c3 prove *static path-reference correctness* (the code names `~/.kmgraph/`). They do **not** prove *operational correctness* (init/switch/read/write actually work end-to-end, and personal vs project resolution doesn't bleed). This matrix is the real acceptance gate — run it after c1+c2+c3 land, before the fix is called done.

**Method:** every row runs in an **isolated throwaway `HOME`** (`TMPH=$(mktemp -d)`), so no real config/KG is touched. Every row asserts two things: (1) the operation's effect lands under `~/.kmgraph/` (or the correct content dir), and (2) **nothing** is written under `~/.claude/kg-config.json` — the anti-bleed / anti-split-brain assertion. Tear down `TMPH` after each row.

**Two execution surfaces** (a KG operation can be driven two ways, and BOTH must pass — that is the whole point of this issue):
- **MCP-tool surface** — `kg_*` tools via the server (`mcp-server/dist/cli.js` / node). Directly scriptable.
- **Command/prompt surface** — the slash-command embedded bash (`kmg-init`, `kmg-switch`, `kmg-add-category`, …). These are prompt files; drive by extracting the fixed bash fence and running it under the throwaway `HOME`, OR execute the command in a real Claude Code session against the throwaway config via `KG_CONFIG_PATH`.

---

## The linchpin

Every operation below first **reads the config to resolve the active KG and its path**. So a wrong config location breaks *all* of them — which is why the config path is the core fix — but each operation still needs its own row because a correct path string can still be wired to the wrong behavior (the kmg-switch lesson).

---

## Matrix

Legend — **Surface:** M = MCP tool, C = command/prompt, B = both. **Auto:** ✅ scriptable, 🖐 needs a live session or manual fence-extraction.

| # | Operation | KG type | Surface | Setup (throwaway HOME) | Action | PASS criteria |
|---|---|---|---|---|---|---|
| 1 | **Init — personal** | personal | B | empty HOME | create personal KG | config written to `$HOME/.kmgraph/kg-config.json`; entry `type:personal`, path under `$HOME/.kmgraph/`; **no** `$HOME/.claude/kg-config.json` created |
| 2 | **Init — project-local** | project | B | empty HOME + temp repo dir | create project KG in the repo | config at `$HOME/.kmgraph/kg-config.json`; entry `type:project-local`, path = repo `./knowledge/`; content dir created in repo, **not** under `.claude` |
| 3 | **Init — global / cowork** | global, cowork | C | empty HOME | create global-topic / cowork KG | ⚠️ **BLOCKED on ADR-066** — content-dir target undecided (`~/.claude/knowledge-graphs/` vs `~/.kmgraph/`). Row is a placeholder until ADR-066 resolves; do NOT assert a content path yet. Config-registration half still must land in `~/.kmgraph/kg-config.json`. |
| 4 | **Switch** A→B | personal↔project | B | config with 2 KGs (A active) | switch to B | `.active` = B in `$HOME/.kmgraph/kg-config.json`; `.lastUsed` updated; **no** write to `$HOME/.claude/…`; legacy file (if present) unchanged |
| 5 | **Read-after-write (switch round-trip)** | any | B | as #4 | switch to B, then run a *read* op (status/search) | the read resolves **B** as active (proves the write and the next read hit the same file — the split-brain's core failure) |
| 6 | **Write — config-mutating** (add-category) | active KG | B | config with active KG | add a category | category persisted in `$HOME/.kmgraph/kg-config.json`; re-read shows it; no `.claude` write |
| 7 | **Write — content** (capture / sync-all / extract) | personal & project | B | personal + project KG | write knowledge to each | personal content → `$HOME/.kmgraph/…`; project content → repo `./knowledge/…`; **index** updates under `$HOME/.kmgraph/index/` (personal.db / projects/<kg>.db) |
| 8 | **Read** (search / recall) | personal & project | B | KGs with content + index | search each | resolves the right KG's path from config; reads `$HOME/.kmgraph/index/…`; returns that KG's content only |
| 9 | **Isolation — no cross-KG bleed** | personal vs project | B | personal + project KG, switch active between them | write to active, inspect the *other* | the write lands ONLY in the active KG's content/index; the inactive KG is byte-unchanged (the "bleed" guard) |
| 10 | **Fresh machine** | any | B | HOME with neither `.kmgraph` nor `.claude` | run any init/switch | `mkdir -p` creates `$HOME/.kmgraph/`; operation succeeds; no crash (validates c1 preamble + server `mkdirSync`) |
| 11 | **Un-migrated machine** | any | B | HOME with only `$HOME/.claude/kg-config.json` (legacy) | run any config op | seed copies legacy → `$HOME/.kmgraph/kg-config.json`; op then uses `~/.kmgraph`; legacy file preserved (ADR-063) |
| 12 | **`KG_CONFIG_PATH` override honored** | any | B | `KG_CONFIG_PATH=/tmp/x.json` | any config op | reads/writes `/tmp/x.json`, ignores both defaults |
| 13 | **FTS5 stray-index cleanup** (kmg-init) | any | C | empty HOME + temp repo containing a **non-gitignored** stray `$REPO/.fts5.db` | run `kmg-init` (Block A) | stray `$REPO/.fts5.db` is **deleted**; **no** `$HOME/.claude/kg-fts5/` directory is created (the deprecated cache path the server no longer reads); Block B's "index is moving" consent prompt is **not** falsely triggered; a fresh index rebuilds under `$HOME/.kmgraph/index/` on next sync (asserts c1 Task 7 — a config-adjacent behavior, distinct from the kg-config path fix) |

---

## Coverage rationale (why these rows = "complete" for this fix)

- Rows **1-3** cover **initialization** across every KG type (with global/cowork gated on ADR-066).
- Row **4-5** cover **switching** + read-after-write consistency (the exact operation kmg-switch broke).
- Rows **6-8** cover **writing** (config-mutating and content) and **reading**, for **personal vs project** — the resolution axis you flagged.
- Row **9** is the explicit **anti-bleed** assertion.
- Rows **10-12** cover the environment edges (fresh, un-migrated, override) the c1/c2 preamble + server exist to handle.
- Row **13** covers the one **non-config** behavior a plan changes: c1 Task 7 stops `kmg-init` from moving a stray `.fts5.db` into the deprecated `~/.claude/kg-fts5/` and deletes it instead. It shares the "must not write under `~/.claude/`" invariant with the rest of the matrix, so it belongs here even though it touches an FTS5 cache path, not `kg-config.json`. Command-surface only (the MCP server has no equivalent stray-migration branch).
- **Installation** (plugin placement) is intentionally omitted — it does not touch the two migrated paths (verified in the blast-radius audit, investigation-log Finding 5); nothing to assert.
- **`cli.ts` config-display string + `dist/` integrity** (c2 Task 2) are intentionally omitted — a printed help line and a build-artifact rebuild are not operational path-resolution behaviors; they are fully covered by c2's own `typecheck` + `npm test` + grep gates, not by a throwaway-HOME row here.
- Row **12** (`KG_CONFIG_PATH` override) is **matrix-only** — the c1/c2 live tests exercise the `${KG_CONFIG_PATH:-…}` *default* branch but never set a custom `KG_CONFIG_PATH`, so the override path itself is asserted only here.
- `kmg-upgrade-inspector`'s config write-back (`wiki_pass_complete`, upgrade flow) is **not exercised by any operational row above** — static-only, covered by c1 Task 3 greps (its path-string correctness is proven there; its write behavior is not independently re-verified in a throwaway-HOME row in this matrix).

## Open dependencies

- Row 3 (global/cowork content path) is **blocked on ADR-066** and stays a placeholder until that decision lands.
- Both **surfaces** (MCP + command) must pass every applicable row — a single-surface pass is what let the split-brain hide (server was fine, command layer was not).

## Status

Drafted 2026-07-15. **Executed 2026-07-16 — PASSED.** All 12 applicable rows (Row 3 skipped, blocked on ADR-066) PASS on both required surfaces. MCP surface driven over real stdio JSON-RPC against the compiled `mcp-server/dist/index.js` (not a reimplementation); command surface driven by extracting and running the verbatim bash fences from the `.md` files. Zero writes to `~/.claude/kg-config.json` or `~/.claude/kg-fts5/` observed in any row. Rows 7/8's command-surface *content* operations delegate to the already-PASSing MCP tools via agents — path resolution independently verified, full agent-orchestration execution not run under a live session (the only structural gap, not a failure).

**One pre-existing, unrelated concern surfaced (not a migration failure, does not block resolution):** `handleCapture`'s `rebuildIndex(kgPath, kgName)` call (`mcp-server/src/tools/capture.ts` ~lines 286/347) omits `kgType`, so it defaults to `project-local` and writes a personal KG's index to `~/.kmgraph/index/projects/<name>.db` — but `kg_search` for a `type:personal` KG looks for `~/.kmgraph/index/personal.db` (`fts5.ts:resolveDbPath`). Personal-KG search silently falls back to correct-but-slower linear scan instead of using FTS5. Both paths live under `~/.kmgraph/`, so the anti-split-brain invariant this matrix guards holds — recommend a separate GitHub issue to thread `kgType` through.
