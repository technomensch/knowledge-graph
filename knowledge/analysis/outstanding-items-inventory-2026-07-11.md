# Outstanding Items Inventory — 2026-07-11

Prep work for a future `ROADMAP.md` reconciliation pass. Sweeps `knowledge/decisions/`, `knowledge/enhancements/`, `knowledge/issues/`, `knowledge/sessions/`, `ROADMAP.md`, and `CHANGELOG.md` (raw `chat-history/` excluded per ADR-060) and cross-checks every candidate against actual repo state (`mcp-server/src/`, `commands/`, `skills/`, `core/default-templates/`, `git log`, `gh issue list`). Verdicts below reflect verified current-state checks, not the status label on the source doc — several labels turned out stale in both directions.

## Config / Platform-Agnostic

| Item | Source | Verdict | Size | Why |
|---|---|---|---|---|
| Add `version` field to `kg-config.json`, auto-migrate on `kg_config_init` | ROADMAP.md:55 | ALREADY IMPLEMENTED — UNDOCUMENTED | SMALL PATCH | `mcp-server/src/utils.ts:29-38` `KgConfig` interface already has `version: string`, `DEFAULT_CONFIG.version = "1.0.0"`. ROADMAP still lists it as future (High priority, "activate when v1.1 ships"). |
| FTS5 database relocation to user-level cache (`~/.claude/kg-fts5/`) | ENH-005-specification.md (status: proposed); GH issue #46 (OPEN) | ALREADY IMPLEMENTED — UNDOCUMENTED | SMALL PATCH | `mcp-server/src/tools/fts5.ts:32-37` already stores DB at `~/.claude/kg-fts5/<kgName>.db`. GH #46 never closed, ENH spec status never flipped. |
| Remove `chat-history/*.md` from `kg_search` / `kg_fts5_rebuild` indexing scope | ADR-060 (Proposed) + ENH-040 (🟡 Proposed) | STILL OUTSTANDING | MEDIUM | `mcp-server/src/tools/search.ts:86` and `fts5.ts:323` both still include `"chat-history"` in their scanned dirs. Confirmed live in code. |

## Rules / Governance Docs (me.md, rules.md, triggers.md)

| Item | Source | Verdict | Size | Why |
|---|---|---|---|---|
| `me.md`/`rules.md` as canonical identity/rules home | ROADMAP.md:18-20 (listed under Future); ADR-028 (frontmatter status: Proposed) | ALREADY IMPLEMENTED — UNDOCUMENTED | SMALL PATCH | `knowledge/rules.md`, `knowledge/me.md`, `~/.kmgraph/rules.md`, `~/.kmgraph/me.md` all exist and are in active use (CLAUDE.md's own read-order references them as authoritative today). ADR-028 frontmatter status never flipped from Proposed; ROADMAP still lists as future work. |
| `triggers.md` platform-agnostic rule-timing companion file | ADR-033 (frontmatter: Proposed; body "## Status: Accepted") | ALREADY IMPLEMENTED — UNDOCUMENTED | SMALL PATCH | `knowledge/triggers.md` and 3 `core/default-templates/concepts/**/triggers.md` variants exist and are referenced live in CLAUDE.md's read order. Frontmatter/body status mismatch within the same ADR file — frontmatter never updated after body was marked Accepted. |
| Default graph-usage rules block (Decision Records / thin-pointer-memory / rules.md-cites-ADR) seeded at `/kmgraph:init` | ADR-037 (Proposed) | STILL OUTSTANDING | MEDIUM | Grepped `core/default-templates/concepts/rules.md` and both `templates/{user,project}/rules.md` for "Knowledge Governance" / "Graph Usage" / "Decision Records" — no matches. Not seeded anywhere in current scaffolds. |
| Rule-injection scripts (`pre-skill-rules-inject.sh` etc.) hardcode personal split-file names instead of discovering them | ENH-039 (🟡 Proposed) | ALREADY IMPLEMENTED — UNDOCUMENTED | SMALL PATCH | `scripts/pre-skill-rules-inject.sh:78-102` already has `_kmgraph_find_split_file()`, a discovery function that scans `~/.kmgraph/*.md` for the right split file per section rather than hardcoding names — exactly the fix this ENH asked for. |
| Rules file H2 structure hardening (promote H3s to H2s in split files) | ENH-018 (status: deferred) | ALREADY IMPLEMENTED — UNDOCUMENTED (likely) | SMALL PATCH | Current `core/default-templates/concepts/templates/user/governance-rules.md` already uses H2 for major sections ("## Review Audit Protocol", "## Plan Execution — Strict Mode", "## Review Protocol") with H3 subsections underneath — matches the requested structure. Spec still says deferred; worth a final visual diff before closing but code sample strongly suggests done. |
| Rename `kg-recall` skill to avoid `/kmgraph:recall` command autocomplete collision | ENH-013 (status: deferred) | ALREADY IMPLEMENTED — UNDOCUMENTED | SMALL PATCH | `skills/` now has `kmg-auto-recall` and `kmg-brainstorm-recall` — no skill named `kg-recall` or `kmg-recall` remains, collision resolved by the broader `kmg-` rename (ADR-053). Spec status never flipped. |

## Docs / Navigation

| Item | Source | Verdict | Size | Why |
|---|---|---|---|---|
| Template Directory Disambiguation — `core/templates/` → `core/default-templates/`, starter consolidation | ENH-022 (status: proposed) | ALREADY IMPLEMENTED — UNDOCUMENTED | SMALL PATCH | `core/` now only contains `default-templates/` (no `templates/` dir exists). Rename already done; spec status never flipped to implemented. |
| Broken nav breadcrumb (`GETTING-STARTED.md`/`WORKFLOWS.md`) baked into every index README scaffold | ENH-041 (🟡 Proposed) | STILL OUTSTANDING | SMALL PATCH (mechanical, but touches ~11 files) | Confirmed stale references still present in 11 files: `core/default-templates/{decisions,lessons-learned,enhancements,issues}/README.md`, `documentation/doc-template.md`, `meta-issue/README.md`, and the live `knowledge/{decisions,enhancements,issues,lessons-learned,plans}/README.md`. Root cause (ADR-027 deleted `GETTING-STARTED.md`) still not reflected in scaffolds. Session 2026-07-11 notes this was "being authored by a parallel agent as of 2026-07-05, never confirmed landed" — confirmed here: it has NOT landed. |
| Introduce concept+setup hybrid page type + document how-to guide pattern separately | ADR-046 (two conflicting frontmatter blocks: Proposed vs Accepted) | UNCLEAR — NEEDS HUMAN CALL | MEDIUM | File itself has a duplicated frontmatter block (first says `status: Proposed`, second says `status: Accepted`) — a merge/edit artifact, not just staleness. Grepped `docs/` for "concept+setup"/"hybrid page type"/how-to-guide naming pattern — no hits, so unclear whether the decision was executed in the docs site or only decided-on-paper. Needs a human check of the actual docs IA before triaging further. |
| Three disconnected release-doc-sync mechanisms leave README/version numbers out of sync | ENH-042 (🟡 Proposed) | STILL OUTSTANDING (confirmed live) | MEDIUM | Directly reproduced right now: `package.json` and `.claude-plugin/plugin.json` both read `0.6.18`, but `mcp-server/package.json` still reads `0.6.15` — the exact drift class this ENH describes. |

## MCP / Command Surface

| Item | Source | Verdict | Size | Why |
|---|---|---|---|---|
| KG Write Guard — add Step-0 CWD guard to `sync-all`/`update-graph`; move check into `run_extraction.py` (bypass-proof); supersede ADR-019 | ENH-026 (Proposed) | STILL OUTSTANDING (partial) | MEDIUM | `commands/kmg-update-graph.md:82` already has "Get active KG path and validate CWD match" — done for that command. `commands/kmg-sync-all.md` has no such guard at all. `core/scripts/run_extraction.py` has no CWD/`projectRoot` check (grepped for `cwd`, `getcwd`, `project_root`, `guard`, `mismatch` — no hits). ADR-019 not marked Superseded. Two of three scope items still open. |
| Extend `pre-skill-rules-inject.sh` to cover official marketplace skills (code-review bypass) | ENH-026-... / **ENH-023** (🟡 Proposed); GH issue #130 (OPEN) | STILL OUTSTANDING (partial) | SMALL PATCH | `scripts/pre-skill-rules-inject.sh:49-53` already routes `code-review`, `pr-review-toolkit:*`, and `caveman:caveman-review` into a `review-request` branch that injects an ADR Pre-Check + `kmgraph:recall` gate (lines 164-179) — this covers most of the ENH's "ADR-049 gate" ask. But the explicit "Protected files guard" (inline reminder that `commands/`, `core/templates/` require permission before edits) is NOT present anywhere in the script (grepped `PROTECTED`, `commands/`, `core/templates`, `core/default-templates` — no hits). One of three proposed injections still missing. |
| KG Remove / Unregister command | ENH-030 (🟡 Proposed) | STILL OUTSTANDING | MEDIUM | No `kg_remove`/`kg_unregister`/`config_remove` in `mcp-server/src/tools/*.ts` or `cli.ts`; no `commands/kmg-remove*` or `kmg-unregister*` file exists. `kmg-init`, `kmg-switch`, `kmg-list` exist but nothing to deregister a graph. |
| Cross-Platform Knowledge Extractor / chat-history-to-KG backfill extractor (standalone) | ENH-025 (proposed) and ENH-035 (🟡 Proposed, likely overlapping scope) | STILL OUTSTANDING (needs de-dup) | EARTH-SHAKING | `commands/kmg-extract-chat.md` exists but is the per-session extractor, not a standalone historical backfill tool either spec describes. Two separate ENH numbers (025 from June, 035 from July) appear to cover overlapping ground — needs reconciling into one before scheduling. Multi-platform extraction architecture change; touches `core/scripts/extract_*.py` for all three platforms. |
| Superpowers Brainstorming Spec → KG Linkage | ENH-027 (Proposed) | STILL OUTSTANDING | MEDIUM | No evidence found of brainstorm-spec-to-KG auto-linkage in `skills/kmg-brainstorm-recall` or elsewhere; not spot-checked exhaustively but no code artifact matched during this sweep. |
| Repo-context auto-detection for `kmg-update-doc`/`kmg-create-doc` | ENH-033 (🟡 Proposed) | STILL OUTSTANDING | MEDIUM | Listed in the 2026-07-11 session's own "Consolidated Open Items" as unresolved; governed by ADR-056 which itself rejected a plugin split (so this is the narrower remaining piece). Not independently re-verified against code this session but no contradicting evidence found. |
| Capture-pipeline command naming and grouping (`kmg-update-graph`→`kmg-ingest-graph`?, `kmg-update-issue-plan`→`kmg-propagate-issue-plan`?) | ENH-034 (🟡 Proposed) | STILL OUTSTANDING | EARTH-SHAKING | Confirmed still undecided per 2026-07-11 session notes — explicitly "held pending ENH-035/036 stabilizing; ENH-036 now Withdrawn, so gate has cleared, can likely be revisited." Renaming multiple user-facing commands is version-bump-worthy and touches docs/commands/skills together. |
| Whether `kmg-update-issue-plan` should be a hook/skill instead of a command, and/or whether the ~20+ command surface should be reduced | Session 2026-07-11 (steps 16, Action Items) | UNCLEAR — NEEDS HUMAN CALL (currently untracked) | EARTH-SHAKING | Explicitly confirmed via `kg_search` (per the session's own note) that no ENH currently owns this framing. Closest related-but-distinct: ENH-034 (naming only, explicitly excludes behavioral change) and ENH-036 (withdrawn, skill-only). Needs its own brainstorm/ADR before any ENH is drafted — user has not confirmed they want this tracked yet. |

## Process / Meta-Issue Hygiene

| Item | Source | Verdict | Size | Why |
|---|---|---|---|---|
| ENH-043's spec status line still reads 🟡 Proposed despite code/tests being complete | ENH-038-specification.md (self-reported); confirmed at `ENH-043/specification.md` header | STILL OUTSTANDING (trivial) | SMALL PATCH | Directly verified: `knowledge/issues/chat-extraction-reliability-saga/attempts/ENH-043/specification.md` header still says "**Status:** 🟡 Proposed." One-line fix, explicitly flagged twice already (2026-07-10 and 2026-07-11 sessions) but not yet done. |
| ADR-055 frontmatter says `status: Proposed` but body says "Accepted — implemented in v0.6.4 (Task 6)" | ADR-055 | ALREADY IMPLEMENTED — UNDOCUMENTED | SMALL PATCH | Confirmed in code: `mcp-server/src/tools/upgrade.ts:656` writes a `lastAppliedVersion` sentinel exactly as the ADR's Option 2 describes. Only the frontmatter `status:` field is stale — one-line fix. |
| GH issue #39 — [Meta] v0.2.1 backlog (kg_capture MCP tool, sync-all/update-graph refactor, skill modernization) | GH issue #39 (OPEN) | SUPERSEDED | SMALL PATCH (just close it) | All three sub-items already shipped: `kg_capture` MCP tool exists and is registered; `commands/kmg-sync-all.md` and `commands/kmg-update-graph.md` both exist (post `kmg-` rename); skills have been extensively modernized (20+ current skills vs. the original handful this issue was filed against in March). Stale meta-issue, safe to close. |
| ENH-006 — Sequential prompts, decoupled decisions, and skill trigger gaps in `start-issue-tracking`/`adr-guide`/`lesson-capture` | ENH-006 (proposed); GH issue #47 (OPEN) | UNCLEAR — NEEDS HUMAN CALL | MEDIUM | Written in March against pre-rename command/skill names (`start-issue-tracking`, `adr-guide`, `lesson-capture` — now `kmg-start-issue-tracking`, `kmg-adr-guide`, `kmg-lesson-capture`). The skill-trigger-gap complaints may be subsumed by the newer hard-block override mechanism in `pre-skill-rules-inject.sh`, but this wasn't independently re-verified line-by-line against current `kmg-start-issue-tracking.md`'s Step 6.2/6.4 enforcement. Needs a fresh read against current command text before deciding outstanding vs. superseded. |
| "Wrong session captured" symptom — distinct, still-open `--today` session-selection issue in Claude chat extraction | `knowledge/issues/chat-extraction-reliability-saga/README.md` (Attempt 003); reaffirmed in 2026-07-10 and 2026-07-11 session Action Items | STILL OUTSTANDING | MEDIUM | Explicitly reaffirmed twice as the "oldest unresolved investigative thread in the entire saga" — not re-verified against code this sweep (out of scope: this is a live bug investigation, not a doc/status mismatch), but both source sessions agree it's real and open. |
| `session-summary-agent` scans `docs/plans/` for active plans, but real convention is `~/.claude/plans/` copied to `knowledge/plans/` | Session 2026-07-11 "Untracked gaps" | STILL OUTSTANDING (untracked — no ENH filed) | SMALL PATCH | Confirmed via CLAUDE.md itself: "Plans... Work in `~/.claude/plans/` first, then copy to `knowledge/plans/`" — `docs/plans/` is not the convention. No ENH currently owns this per the session's own admission. |
| Multiple same-day Claude session UUIDs (via `/branch`/`/resume`) never merged/deduplicated into one logical session | Session 2026-07-11 "Untracked gaps" (originally noted 2026-07-03) | UNCLEAR — NEEDS HUMAN CALL | MEDIUM | Session note itself flags this as unresolved: unclear whether ENH-047's later per-message date-bucketing fix incidentally subsumed it. Needs an explicit check before scoping any fix — do not assume resolved. |
| Real-data-validation checkpoint for the `--rebuild` backup-vs-destroy behavior on any date crossing the 900KB/30k-line split threshold while source `.jsonl` still exists | Session 2026-07-11 Action Items (from chat-extraction-reliability-saga README § Outstanding) | STILL OUTSTANDING | SMALL PATCH (a manual check, not new code) | No automated hook exists yet per the session's own note; trigger condition (a real split-eligible date appearing) has not yet occurred as of 2026-07-11. Still pending, no code change needed until triggered. |
| `ROADMAP.md` reconciliation itself — 926 lines, chronological ordering broken, stale in-progress markers (e.g. `v0.2.2-beta (In Progress: 2026-03-29)`, 3+ months stale) | Session 2026-07-11 Action Items; this inventory's own motivating context | STILL OUTSTANDING | EARTH-SHAKING | This is the umbrella task this inventory is prep for — confirmed stale markers exist by direct read of ROADMAP.md. Deliberately out of scope for this sweep per instructions (do not edit ROADMAP.md here). |

## Recommended groupings for future commits/ENH

**Batch A — "flip stale status labels" (all SMALL PATCH, zero code risk, could be one commit):**
Fix frontmatter/status-line drift only, no behavior change:
- ADR-028 (Proposed → Accepted/Implemented)
- ADR-033 (frontmatter Proposed → Accepted, matching its own body)
- ADR-055 (frontmatter Proposed → Accepted/Implemented)
- ENH-005 (proposed → implemented; close GH #46)
- ENH-013 (deferred → implemented)
- ENH-022 (proposed → implemented)
- ENH-018 (deferred → implemented, pending final visual diff)
- ENH-039 (Proposed → Resolved)
- ENH-043 (🟡 Proposed → ✅ Resolved) — already twice flagged, just do it
- Config-schema-version-field ROADMAP line (mark done)
- Close GH #39 (superseded meta-issue)

**Batch B — "docs/nav scaffold parity" (MEDIUM, one ENH, touches ~11 files but mechanically identical fix):**
- ENH-041 (breadcrumb fix across all README scaffolds)
- ENH-042 (release-doc-sync — could ride along since both are "scaffold/doc consistency" fixes, though ENH-042's root-cause fix, a single sync script/pre-push check, is more involved than ENH-041's find/replace)

**Batch C — "small still-open governance/process gaps" (could become one ENH or a few tickets):**
- ADR-037 (seed default graph-usage rules block at init)
- `session-summary-agent` `docs/plans/` vs `~/.claude/plans/` path gap
- ENH-023's remaining "Protected files guard" injection (the one piece of that ENH not yet done)

**Earth-shaking items needing their own dedicated brainstorm/ADR before scheduling (do NOT bundle into a small commit):**
- **Command-surface reduction / `kmg-update-issue-plan` hook-vs-command question** — currently untracked, user hasn't confirmed wanting it tracked; needs a brainstorm session first.
- **ENH-034 command renames** (`kmg-update-graph`, `kmg-update-issue-plan`) — gate has cleared (ENH-036 withdrawn) but renaming live commands is version-bump-worthy and needs its own plan.
- **ENH-025/ENH-035 backfill-extractor overlap** — reconcile into a single spec before any implementation; touches all three platform extractors.
- **ENH-026 write guard completion** (`kmg-sync-all` guard + Python-layer bypass-proof check + ADR-019 supersession) — partial completion already shipped for `kmg-update-graph`; finishing it is multi-file but mechanical, could arguably be MEDIUM rather than earth-shaking — flagging here only because it explicitly proposes superseding an ADR, which this repo's own conventions treat as an architectural act.
- **ROADMAP.md reconciliation itself** — the motivating task for this inventory; 926 lines, needs restructuring/archiving, is its own project.
