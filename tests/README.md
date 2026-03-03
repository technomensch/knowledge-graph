# Tests: Pre-Beta Validation Suite

Comprehensive automated tests for plugin features, MCP server functionality, and extraction scripts.
Introduced in v0.0.11-alpha as a pre-beta validation gate.

## Quick Start

```bash
# Build MCP server first (required for MCP tests)
cd mcp-server && npm install && npm run build && cd ..

# Run all suites
./tests/run-all-tests.sh

# Skip MCP integration tests (structural tests only)
./tests/run-all-tests.sh --quick

# Run suites matching a pattern
./tests/run-all-tests.sh --suite mcp
./tests/run-all-tests.sh --suite commands
```

---

## Test Suites

### `run-all-tests.sh` — Master Runner

Executes all 9 suites in sequence and reports per-suite and overall results.

```
SUITE REGISTRY
──────────────────────────────────────────────────────────────────
Suite                     Requires MCP Build   Tests
──────────────────────────────────────────────────────────────────
test-mcp-direct.sh        yes                  Smoke test (connectivity)
test-mcp-tools.sh         yes                  All 7 MCP tools
test-mcp-resources.sh     yes                  Both MCP resources
test-mcp-offload.sh       yes                  KG at non-local path
test-mcp-edge-cases.sh    yes                  Error handling
test-commands.sh          no                   25 commands structure + syntax
test-skills-agents.sh     no                   6 skills + 3 agents structure
test-hooks.sh             no                   SessionStart hook
test-extraction.sh        no                   Python extraction scripts
──────────────────────────────────────────────────────────────────
```

---

### `test-mcp-direct.sh` — Smoke Test (existing)

Sends raw JSON-RPC to the MCP server and verifies 7 tools are registered. Runs in ~1 second.
Not part of the pre-beta suite per se, but included in the master runner as a first gate.

---

### `test-mcp-tools.sh` — All 7 MCP Tools (~29 tests)

Functional tests for every MCP tool using isolated temp config (`KG_CONFIG_PATH` env var).

| Section | Tests |
|---------|-------|
| `kg_config_init` | Creates dirs, writes config, sets active, rejects duplicates, custom categories |
| `kg_config_list` | Shows graphs, active marker, empty config message |
| `kg_config_switch` | Switches active, updates config, rejects unknown name |
| `kg_config_add_category` | Creates dir, rejects duplicates, fails with no active KG |
| `kg_search` | Finds content, no-results message, detailed format, paths format, no active KG |
| `kg_scaffold` | Creates file, substitutes variables, fills date, rejects invalid template, rejects existing file |
| `kg_check_sensitive` | Passes clean KG, detects email, detects API key, applies custom patterns |

---

### `test-mcp-resources.sh` — MCP Resources (~9 tests)

Tests both MCP resources using `resources/read` and `resources/templates/list` JSON-RPC methods.

| Resource | Tests |
|----------|-------|
| `kg://config` | No config hint, returns config, reflects tool changes, valid JSON |
| `kg://templates/{name}` | Count ≥ 12, lesson template, ADR template, invalid name error, matches source file |

---

### `test-mcp-offload.sh` — KG Offloading (~6 tests)

Verifies that a KG stored at a **non-local path** (simulating external storage) works correctly.
This is the core test for the MCP offloading claim in the documentation.

| Test | Assert |
|------|--------|
| Init at remote path | Creates directories at `$REMOTE_DIR`, not project dir |
| Search on remote KG | Finds content in remote files |
| Scaffold to remote path | Creates output at remote path |
| Sanitization scans remote path | Detects sensitive data in remote KG |
| KG switching isolation | Each KG searches only its own files |
| Tilde path expansion | `~/.../kg` path expands correctly |

---

### `test-mcp-edge-cases.sh` — Error Handling (~10 tests)

| Test | Assert |
|------|--------|
| Corrupt `kg-config.json` | Server exits with error rather than hanging |
| Missing `kg-config.json` | Returns no-graphs message, no crash |
| Active KG points to non-existent dir | Search/sanitization return clear error |
| Empty KG (valid dirs, zero files) | Search → "No results", sanitization → clean |
| KG path with spaces | All tools work correctly |
| Very long search query (1000 chars) | No crash, returns response |
| Regex special chars in search (`.`, `*`, `[`) | No crash, handled safely |
| Empty graph name | Rejected with Zod validation error |
| Config with extra/unknown fields | Reads without error (forward compatibility) |
| Add category to non-existent KG path | Returns response, does not hang |

---

### `test-commands.sh` — Command Structural Validation (~12 tests)

Validates all 25 slash command files in `commands/` without requiring Claude Code runtime.
Commands are markdown files with YAML frontmatter and embedded bash scripts.

| Test | Assert |
|------|--------|
| All 25 expected files present | Lists 25 specific filenames |
| Exact count is 25 | `find commands/ -name "*.md" | wc -l` == 25 |
| No zero-byte files | `find -empty` returns nothing |
| YAML frontmatter present | All files start with `---` |
| Frontmatter properly closed | All files have ≥ 2 `---` delimiters |
| No deprecated `/knowledge:` namespace | `grep -r "/knowledge:"` = 0 hits |
| All namespace refs use `/kmgraph:` format | Negative grep check |
| Bash code blocks pass `bash -n` | No syntax errors in embedded scripts |
| No hardcoded `/Users/<name>` paths | Grep returns 0 hits |
| `help.md` references key commands | capture-lesson, recall, sync-all, session-summary |
| `sync-all.md` references sub-commands | ≥ 2 of: update-graph, session-summary, capture-lesson |

---

### `test-skills-agents.sh` — Skills and Agents (~17 tests)

Structural validation for all 6 skills and 3 agents.

#### Skills (6)

| Test | Assert |
|------|--------|
| All 6 skill dirs exist | lesson-capture, kg-recall, session-wrap, adr-guide, gov-execute-plan, knowledge-graph-usage |
| No empty skill directories | Each has ≥ 1 file |
| No deprecated `/knowledge:` namespace | `grep -r "/knowledge:" skills/` = 0 |
| lesson-capture references capture-lesson | Content check |
| kg-recall references recall or kg_search | Content check |
| session-wrap references session-summary | Content check |
| adr-guide references create-adr | Content check |

#### Agents (3)

| Test | Assert |
|------|--------|
| All 3 agent dirs exist | knowledge-extractor, session-documenter, knowledge-reviewer |
| No empty agent directories | Each has ≥ 1 file |
| No deprecated `/knowledge:` namespace | `grep -r "/knowledge:" agents/` = 0 |
| knowledge-extractor has read-only constraint | Content contains "read-only" or "approval" |
| session-documenter has approval-gated git | Content contains "approval" or "gated" |
| knowledge-reviewer references sonnet model | Content contains "sonnet" |

---

### `test-hooks.sh` — SessionStart Hook (~7 tests)

Tests `scripts/hooks-master.sh` directly with isolated configs.

| Test | Assert |
|------|--------|
| No config file → exit 0 | Exits cleanly, prints "no knowledge graph configured" |
| Config with no active KG → warning | Exits 1, output contains "No active" |
| Active KG path does not exist → error | Output contains "does not exist" or "not found" |
| Valid config + valid path → exit 0 | Exits 0, prints active KG name |
| Recent lessons fixture displayed | Output contains lesson title from fixture |
| Stale MEMORY.md detected | Output contains "stale" |
| Fresh MEMORY.md passes | Output contains "synced" or no stale warning |

---

### `test-extraction.sh` — Python Chat Extraction (~6 tests)

Tests `core/scripts/run_extraction.py` with a simulated Claude session fixture.

| Test | Assert |
|------|--------|
| Python 3 available | `python3 --version` exits 0 |
| Extraction script exists and is executable | File present, `python3 -m py_compile` passes |
| Extract from fixture .jsonl | Output `.md` file created with User:/Assistant: sections |
| `--source claude` flag | Runs without error |
| Custom `--output-dir` | Files written to specified directory |
| Extraction handles empty/missing dirs | No crash on missing projects directory |

---

## Fixtures

| File | Purpose |
|------|---------|
| `fixtures/valid-config.json` | Well-formed `kg-config.json` with `__TEST_KG_PATH__` placeholder |
| `fixtures/corrupt-config.json` | Intentionally invalid JSON for crash/error testing |
| `fixtures/empty-config.json` | Valid JSON with `"active": null` and empty `"graphs"` |
| `fixtures/sample-lesson.md` | Full YAML frontmatter lesson file for search tests |
| `fixtures/sample-adr.md` | ADR file with title/status/context/decision structure |
| `fixtures/sample-claude-session.jsonl` | 4-line Claude session log for extraction tests |

---

## Test Isolation

All integration tests:
- Create an isolated temp directory (`mktemp -d`) with `trap cleanup EXIT`
- Override `~/.claude/kg-config.json` via `KG_CONFIG_PATH` env var
- Back up and restore the real config on completion
- Set `CLAUDE_PLUGIN_ROOT` to the repo root for template access

---

## Known Limitations

### Plugin Distribution (docs/ + tests/ ship to users)

`marketplace.json` uses `"source": "./"` to distribute the plugin. This means `docs/`, `tests/`,
`mkdocs.yml`, and other developer files ship to users who install via the Claude Code marketplace
and do not need them.

**Current status:** Claude Code's plugin spec does not document a file exclusion mechanism
(no `.claudeignore`, no `exclude` field). This is a known limitation of the distribution model.
Tracked for future resolution when the spec adds exclusion support.

**Practical impact:** Low — these files are read-only and do not execute automatically.
Users receive a slightly larger installation but no functional harm.

**Workaround:** None at this time. Future versions will apply exclusions if the spec adds support.

---

## Interactive MCP Inspector

For visual/exploratory testing:

```bash
./tests/test-mcp.sh
```

Launches the MCP Inspector at `http://localhost:5173`. Requires `npx` (comes with Node.js).

---

## Troubleshooting

**MCP server not built:**
```bash
cd mcp-server && npm install && npm run build && cd ..
ls mcp-server/dist/index.js  # Should exist
```

**All MCP tests skipped:**
```bash
# Verify build output exists
ls -la mcp-server/dist/index.js
```

**Hook tests failing — config path:**
`hooks-master.sh` reads `$HOME/.claude/kg-config.json` directly. Tests temporarily replace
this file and restore it on cleanup. Ensure no other process writes to that file during tests.

**Python extraction test failing:**
```bash
python3 --version  # Must be 3.7+
python3 -m py_compile core/scripts/run_extraction.py  # Check syntax
```
