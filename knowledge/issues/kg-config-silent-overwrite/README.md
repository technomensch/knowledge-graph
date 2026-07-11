# Meta-Issue: `~/.claude/kg-config.json` Silently Overwritten With a Test Fixture

**Domain:** data-loss / tooling / mcp-server
**Severity:** High — silent, undetected data loss in a file the whole plugin depends on for KG routing; unknown root cause; unknown blast radius (could affect any user/machine running this plugin, not just this one)
**Created:** 2026-07-10
**Status:** ✅ Resolved and merged to `main`. Fix (`ac70b490`) shipped as part of PR #164 (`c968c1d5`, 2026-07-11). GitHub issue [#163](https://github.com/technomensch/knowledge-graph/issues/163) auto-closed on merge via the commit's `Closes #163`.
**Shipped version:** `v0.6.18` (folded back in, 2026-07-10 — briefly split to `v0.6.19` when this and the chat-extraction post-merge regressions were treated as separate releases; user then chose to ship both as one combined branch/PR instead of two. The `v0.6.19` fix commit (`ac70b490`) was merged onto `v0.6.18-fix-extraction-regressions`; the standalone `v0.6.19-fix-kg-config-silent-overwrite` branch/worktree was retired.) See [related-issues/github-links.md](related-issues/github-links.md).

---

## Navigation

- [Problem Description](description.md) — Living document (updated as understanding evolves)
- [Implementation Log](implementation-log.md) — All investigative attempts chronologically
- [Attempts](attempts/) — Numbered folders with detailed results
- [Analysis](analysis/) — Root cause evolution, timeline, lessons
- [Related Issues](related-issues/github-links.md) — ENH / PR / GitHub references

---

## Quick Summary

**Problem:**
Discovered 2026-07-10 while investigating why `kg_search`/`kg_recall` weren't finding content in this project: `~/.claude/kg-config.json` — the global config every kmgraph MCP tool call reads to resolve the "active" knowledge graph — contains only one registered graph, `test-kg`, pointing at a temp scratch path (`/var/folders/.../tmp.aNi6rlXFnx/test-kg`). The user confirms other KGs were previously registered (this project among them) and that recall had been working before. The real registrations are gone, replaced by what looks like a test fixture: `test-kg`'s `createdAt`/`lastUsed` fields are both the literal placeholder `2026-01-01T00:00:00.000Z`, not real activity timestamps.

**Why this matters beyond one user's inconvenience:**
- The overwrite was **silent** — no error, no warning, nothing surfaced to the user before this session's manual investigation caught it via `kg_fts5_status` returning an unexpected `test-kg` path.
- The file's **mtime is recent** (2026-07-10, same day as discovery) — this is not old, long-standing drift; something wrote to this file recently.
- If the root cause is in the kmgraph plugin or its MCP server (not something local/one-off to this machine), **any user who has this plugin installed could have their real KG registrations silently clobbered** the same way, with no indication anything went wrong until they notice search/recall isn't finding content.

**Current Status:**
- **Root cause CONFIRMED (2026-07-10):** `scripts/hooks-master.sh:12` hardcodes `CONFIG_PATH="$HOME/.claude/kg-config.json"` with no environment-variable override. Two bash test scripts that exercise this hook — `tests/test-hooks.sh` and `tests/test-stop-hook.sh` — therefore have no way to sandbox it, and instead temporarily overwrite the REAL config file in place (`cp "$TEST_CONFIG" "$REAL_CONFIG"`, and in one case `rm -f "$REAL_CONFIG"` outright to test the "no config" scenario), relying on a single `trap cleanup EXIT` to restore from a backup afterward. If that trap ever doesn't fire cleanly (script killed, terminal closed, process group killed, any non-graceful termination), the real file is left permanently in whatever test-fixture state it was clobbered to. The surviving `test-kg` entry's shape (name, placeholder `2026-01-01T00:00:00.000Z` timestamps) matches fixtures constructed inline in `test-hooks.sh` and `tests/fixtures/valid-config.json` exactly.
- **Not the cause:** the kmgraph MCP server's TypeScript test suite (`mcp-server/tests/*.test.ts`) properly mocks `readConfig`/`writeConfig` (jest.mock) in the files that touch config (`capture.test.ts`, `upgrade.test.ts`), and the MCP server itself supports a `KG_CONFIG_PATH` env override that `tests/test-mcp-edge-cases.sh`/`test-mcp-resources.sh` correctly use to sandbox their runs. `fts5.test.ts`'s `rebuildIndex()` calls don't touch `kg-config.json` at all. This session's own `kg_fts5_rebuild` MCP tool call did write back to the real config (adding an `fts5: true` flag to the already-present `test-kg` entry) but did not cause the original wipe — that had already happened before this session's first read.
- **When introduced / current status on `main` (confirmed via git, 2026-07-10):**
  - `tests/test-hooks.sh`'s risky pattern: introduced 2026-03-03 (`094e74434`).
  - `tests/test-stop-hook.sh`'s risky pattern: introduced 2026-04-29 (`35348c3b`).
  - Both **still present, unpatched, on `main`** as of the latest commit touching either file (`824b3968`, 2026-05-25) — confirmed identical between `main` and this branch (`git diff main -- tests/test-hooks.sh` is empty). This is not historical drift; it is live on `main` today.
- **Is this live in production? Yes, in the sense that matters:** no `.npmignore`/`files` field/`.gitattributes export-ignore` excludes `tests/` from what ships with the repo. Confirmed directly: this machine's actual installed plugin cache (`~/.claude/plugins/cache/stayinginsync-knowledge-graph/kmgraph/0.6.16/tests/`) contains these exact files, pulled straight from the repo. No postinstall script, CI workflow, or hook auto-runs them, so ordinary end users of the *installed plugin* are not automatically exposed just by using it. **However**, `tests/run-all-tests.sh` — the standard aggregate test runner — explicitly lists both scripts in its suite (`"test-hooks.sh|Hooks — SessionStart hook validation|no"`, `"test-stop-hook.sh|Stop hook flag — kg-name+date dedup|no"`), so any contributor running the normal full test suite before a PR hits this every time.
- **Blast radius (corrected — this is not a one-time historical event):** this is a live, currently unpatched bug on `main`, exposed every single time any contributor runs the standard test suite, on any machine, since 2026-03-03 (`test-hooks.sh`) / 2026-04-29 (`test-stop-hook.sh`). Every contributor to this repo, on every machine, on every test run since those dates, has been one interrupted `Ctrl-C`/killed-process away from silently losing their real `~/.claude/kg-config.json` — a repeated, ongoing exposure window, not a single incident. Ordinary installed-plugin end users are not automatically exposed (nothing auto-runs these scripts), but anyone who clones the repo to contribute, or who manually pokes at `tests/` in their plugin cache, is.
- User's own registrations are not a priority to recover (locally recreatable) — the priority (now satisfied) was finding the root cause; next is deciding on and shipping a fix.

---

## Historical Context / Provenance (added 2026-07-10, after root cause)

**Question:** Is `hooks-master.sh` / the test suite that exercises it abandoned code, or something actively maintained with real intent behind it? Answer determines whether the fix should be a minimal patch or should honor the original design.

**Answer: Not abandoned. Both sides are live, deliberate, and still in active use.**

- `scripts/hooks-master.sh` — the SessionStart hook itself. Per [ADR-020](../../decisions/ADR-020-lifecycle-hooks-suite-automated-capture.md): "remains separate and unchanged" since v0.0.9, still the current session-start config/health-check/auto-switch mechanism. Not legacy.
- `tests/test-hooks.sh` / `tests/test-stop-hook.sh` — introduced deliberately, not as scratch/throwaway scripts:
  - `test-hooks.sh`: commit `094e74434`, `test(beta-prep): add comprehensive pre-beta test suite (v0.0.11-alpha) #29` — a 113-test suite built specifically to validate the codebase before the beta release.
  - `test-stop-hook.sh`: commit `35348c3b`, `fix(hooks): v0.5.5` — added/updated to verify the ADR-020-amendment fix for issue #106 (Stop-hook flag dedup keying bug). Real bug, real fix, real regression test.
  - Both are still enumerated in `tests/run-all-tests.sh` today and still identical between `main` and this branch — actively exercised by any contributor running the standard suite, not orphaned.
- **Governing ADR:** [ADR-012](../../decisions/ADR-012-hook-security-model.md) already states the constraint these tests violate — hook scripts must make "no modifications to files outside the active KG path" and must be idempotent. The clobber-and-restore pattern was never a sanctioned design; it's a violation of an existing decision that slipped through because `hooks-master.sh` had no path override to sandbox against.

**Implication for the fix:** since neither side is dead code, the fix should restore the *intended* behavior (real config-path sandboxing per ADR-012) rather than patch around symptoms (e.g., just hardening the `trap` cleanup). This also means the fix must preserve what `test-hooks.sh`/`test-stop-hook.sh` are actually validating — SessionStart hook config resolution and Stop-hook dedup keying — not just stop them from touching the real file.

**Distribution note (2026-07-10):** this repo itself is locked down (no other collaborators have write access, no unauthorized commits here). However, the user confirms several clones of this repo exist externally. Since the vulnerable code has been live and unpatched on `main` since 2026-03-03/2026-04-29, **any clone taken on or after those dates carries the bug**, independent of this repo's own access controls. This raises the fix from "protect this repo" to "ship a fix and consider whether cloned copies need any advisory," since clones won't auto-receive a `main` fix.

---

## Initial Hypothesis

Some MCP kmgraph tool call made during this session (`kg_fts5_status`, `kg_fts5_rebuild`) may have triggered a write to `~/.claude/kg-config.json`, possibly via a test/fixture code path that doesn't correctly sandbox its target path.

**Confidence:** Low — `kg_fts5_status` is documented as read-only, and `kg_fts5_rebuild`'s documented behavior is to rebuild the FTS5 index db, not rewrite `kg-config.json`. This hypothesis is unconfirmed and needs verification against the actual MCP server source, not assumed from tool descriptions alone.

**Alternative hypotheses not yet ruled out:**
- A test suite (in this repo, the kmgraph plugin repo, or the MCP server repo) writes a `test-kg` fixture to the real `~/.claude/kg-config.json` path instead of a temp/mocked config path — a real bug in that test harness's isolation, not in normal runtime tool use.
- A plugin auto-update or reinstall reset the config as part of some migration/repair logic.
- Something entirely unrelated to kmgraph — another tool or process on this machine touched the file.

---

## Evidence Gathered So Far (2026-07-10)

- `~/.claude/kg-config.json` current contents: single entry `test-kg`, path `/var/folders/6j/q97zrwg916ddkqn23_jyy76c0000gp/T/tmp.aNi6rlXFnx/test-kg`, `createdAt`/`lastUsed` both `2026-01-01T00:00:00.000Z` (placeholder-looking, not real activity).
- File mtime: `2026-07-10 13:14:45` — same day as discovery, not stale.
- No git history available for `~/.claude/kg-config.json` (`~/.claude` is not a git repo).
- No usable Time Machine snapshot (only one found, dated 2025-12-15 — too old to help, and not attempted for recovery given the user's low priority on recovering the data itself).
- No shell-history hits for `kg-config` around the relevant time window.
- This session's actual MCP kmgraph tool calls, in order: `kg_fts5_status` (returned `exists: false`, `db_path` pointing at the `test-kg` path — first sign something was wrong), then `kg_fts5_rebuild` called with an explicit `kgPath` override (to work around the bad active pointer) — this succeeded and correctly rebuilt this project's real index at `~/.kmgraph/index/projects/knowledge.db`, unaffected by `kg-config.json`'s bad state.
- `/kmgraph:kmg-switch knowledge-graph` failed because no KG named `knowledge-graph` was registered — this is what surfaced the missing-registrations problem to the user.
- `/kmgraph:kmg-init` was invoked to re-register this project, but the user interrupted before any write happened (correctly — recovery/re-registration should wait until the root cause is understood, not proceed and potentially compound the problem or destroy evidence).

---

## Scope

**Included:**
- Root-causing why/when/how `~/.claude/kg-config.json` lost its real registrations and gained a lone `test-kg` fixture entry.
- Assessing whether this is a bug in the kmgraph plugin/MCP server that could affect other installations.
- Any fix needed in the plugin/MCP server to prevent recurrence (e.g., proper test-path sandboxing, write-guards, backup-before-write).

**Explicitly out of scope (for now, per user instruction):**
- Recovering this specific user's lost KG registrations — locally recreatable, not a priority.
- This is unrelated to the chat-extraction-reliability-saga issue (different subsystem: kmgraph's own config/MCP server, not the chat-history extractors) — do not conflate the two.

---

## Next Steps

**Root cause confirmed — remaining work is deciding and shipping a fix, not further investigation.**

1. **Give `hooks-master.sh` an environment-variable config-path override**, mirroring the pattern the MCP server (`mcp-server/src/utils.ts`) already uses correctly: `CONFIG_PATH="${KG_CONFIG_PATH:-$HOME/.claude/kg-config.json}"` instead of the current hardcoded literal at `scripts/hooks-master.sh:12`.
2. **Update `tests/test-hooks.sh` and `tests/test-stop-hook.sh`** to set `KG_CONFIG_PATH="$TEST_CONFIG"` when invoking the hook, removing every `cp "$TEST_CONFIG" "$REAL_CONFIG"` / `rm -f "$REAL_CONFIG"` call against the real file entirely — sandboxing at the source instead of clobber-and-restore.
3. As defense in depth (belt-and-suspenders, in case a similar pattern appears elsewhere later): make the backup/restore safer regardless — write the backup, then restore via `trap` on `EXIT INT TERM`, not `EXIT` alone, and consider an atomic write pattern (write to a temp file, then rename) for the real-path restore step so a killed process can't leave the real file half-written either.
4. Decide whether this needs a user-facing advisory: anyone who has run `tests/test-hooks.sh`/`test-stop-hook.sh` locally and had it interrupted may have silently lost real KG registrations the same way, with no error ever surfaced.
5. Once a fix lands and is verified (deliberately interrupt a test run mid-clobber and confirm the real config survives), re-register this project's KG via `/kmgraph:kmg-init`.

---

## How to Use This Meta-Issue

1. **Add attempt:** Create new `attempts/NNN-name/` folder as investigation proceeds.
2. **Update understanding:** Edit `analysis/root-cause-evolution.md` when beliefs shift.
3. **Log progress:** Update `implementation-log.md` with each attempt.
4. **Extract lessons:** Record reusable insights in `analysis/lessons-learned.md` once resolved.
