---
id: issue-14
title: Investigation Log — config-path split-brain (blast-radius findings)
status: tracked
github-issue: "#171"
updated: 2026-07-14
---

## Findings — 2026-07-14 (foreground blast-radius audit)

### Finding 1 — Triage-method flaw (root cause of the misses)

**What was found:** issue-14's original tiering classified files by COUNTING the literal string `~/.claude/kg-config.json`. But write operations frequently go through a `$CONFIG_PATH` VARIABLE (defined once from the literal, then used throughout). A file with only 1 literal ref (its definition) but many writes-via-variable was mis-filed as LOW.

**Evidence:** N/A — this is a methodology finding, evidenced by Finding 2 below.

**Severity/disposition:** Systemic — this is the root cause of the kmg-switch miss (and potentially others). Correct method is behavior classification (does the file WRITE vs only READ the config), which was redone for every config-referencing file.

**Where handled:** Drove the re-triage documented in Finding 2; to be reflected in issue-14-description.md during the gated issue-tracking batch.

---

### Finding 2 — kmg-switch.md mis-triaged LOW→HIGH (CONFIRMED, being fixed in c1)

**What was found:** kmg-switch.md is a config WRITE. It wrote the active-graph switch to the OLD path while the MCP server reads the NEW path — the single most user-visible symptom of the split-brain (switching graphs silently not taking effect).

**Evidence:**
- `kmg-switch.md:30` — `CONFIG_PATH="$HOME/.claude/kg-config.json"`
- `kmg-switch.md:98-100` — `jq ".active=… | .lastUsed=…" > "$CONFIG_PATH.tmp"; mv "$CONFIG_PATH.tmp" "$CONFIG_PATH"`
- `CONFIG_PATH` is defined once (line 30) but used across 5 fences: lines 29-51, 55-68, 72-89, 93-101, 105-128 — each fence needs the canonical preamble applied.

**Severity/disposition:** Originally filed LOW (c3) because it has only 1 literal ref to the config path (its definition). CONFIRMED HIGH under behavior classification (it writes to the split-brain path).

**Where handled:** Moved to c1 (HIGH) as Task 5. The issue-14-description.md triage should be corrected (move kmg-switch from LOW to HIGH) during the gated issue-tracking batch.

---

### Finding 3 — FTS5 stray-index write to deprecated path (NEW, CONFIRMED, separate concern — NOT #171)

**What was found:** kmg-init.md Block A (the non-gitignored "legacy stray" branch) moves a project-root stray search index into the DEPRECATED `~/.claude/kg-fts5/` location instead of deleting it. The location is dead — the server never copies/moves the old file forward, and the filename scheme changed, so the stray is not reusable (it's a rebuildable cache). Moving it is pointless and also falsely triggers Block B's index-migration consent prompt.

**Evidence:**
- `kmg-init.md:96-107` (Block A) — `mkdir -p "$HOME/.claude/kg-fts5"` + `mv "$KG_ROOT/.fts5.db" "$HOME/.claude/kg-fts5/$kg_name.db"`
- `mcp-server/src/tools/fts5.ts` — `getFTS5DbPath()` (→ `~/.claude/kg-fts5/`) is marked `@deprecated`
- Live paths: `getPersonalDbPath()` → `~/.kmgraph/index/personal.db`; `getProjectDbPath()` → `~/.kmgraph/index/projects/<kg>.db`, both resolved via `resolveDbPath()`
- `kmg-init.md:112-147` (Block B) — index-migration consent prompt, falsely triggered by Block A's stray move

**Severity/disposition:** Confirmed bug, but scoped separately from #171 (this is about a dead/deprecated cache path, not the config split-brain). ADR-063-safe: the stray is a derivable cache; rebuild is the confirmed re-write path.

**Where handled:** c1 Task 7 — Block A should DELETE the stray (`rm -f "$KG_ROOT/.fts5.db"`); a rebuild recreates the index at `~/.kmgraph/index/`. Block B is left untouched — its `~/.claude/kg-fts5/` references are intentional detection of genuine old installs.

---

### Finding 4 — KG content storage location (OPEN — needs user decision, item 3, not yet resolved)

**What was found:** Two KG content storage roots are still set under `~/.claude/`, and it's unclear whether this is intentional or a further split-brain instance.

**Evidence:**
- `kmg-init.md:1039` — `KG_PATH="$HOME/.claude/knowledge-graphs/$kg_name/"` ("Global topic-based" storage mode)
- `kmg-init.md:1042` — `KG_PATH="$HOME/.claude/cowork-knowledge/$kg_name/"` ("Claude Cowork" storage mode)
- Storage-mode menu at `kmg-init.md:920-921`
- Echoed at `kmg-list.md:33` and `kmg-list.md:38`

**Question:** Did global-topic storage migrate to `~/.kmgraph/`, or is `~/.claude/` still correct (cowork is arguably Claude-Code-specific, not a generic KG-content location)? This is an intent decision, not clearly a bug.

**Severity/disposition:** Unresolved, awaiting user direction. Not yet assigned to a cycle.

**Where handled:** Open — see Open items below.

---

### Finding 5 — Blast-radius boundary (CONFIRMED bounded)

**What was found:** The MCP server owns exactly TWO migrated locations. Every other `~/.claude/*` path in the prompt/script layer is a genuine Claude Code / plugin path the server never owned and must NOT be changed.

**Evidence:**
- Confirmed by grepping all `.kmgraph` path literals in `mcp-server/src`
- Migrated locations: `~/.kmgraph/kg-config.json` and `~/.kmgraph/index/`
- Paths that are NOT in scope (genuine Claude Code / plugin paths): `~/.claude/CLAUDE.md` (user global instructions), `~/.claude/projects/…` (chat history + Claude-native memory used by kmg-extract-chat and kmg-capture-router), `~/.claude/memory/`, `~/.claude/plugins`, `~/.claude/skills`, `~/.claude/plans`, `~/.claude/context-mode/`

**Severity/disposition:** Confirms the total in-scope surface = the two migrated paths only: (1) `kg-config.json` → c1/c2/c3, (2) FTS5 index → c1 Task 7, plus the open storage-location question (Finding 4).

**Where handled:** Bounds the remaining c1/c2/c3 work; no further path audit needed beyond Finding 4.

---

### Finding 6 — Plan verification greps unreliable under ugrep (plan-quality; being fixed in foreground)

**What was found:** The user's `grep` is a shell function wrapping ugrep in regex mode, where `$` is the end-of-line anchor. Any verification grep containing a literal `$` (e.g. `$HOME`, `$CONFIG_PATH`) silently returns 0 / "no output", which reads as a FALSE PASS.

**Evidence:** Demonstrated — `grep -c '$HOME/.claude/kg-fts5' kmg-init.md` → 0, but `grep -Fc '$HOME/.claude/kg-fts5' kmg-init.md` → 3.

**Severity/disposition:** Plan-quality risk — false-pass verification steps could let broken fixes look validated.

**Where handled:** RESOLUTION in progress — all fixed-string verification greps in the c1/c2/c3 plans are being switched to `grep -F` (or anchored on stable no-`$` patterns), and a note is being added to each plan's Global Constraints.

---

### Finding 7 — Adversarial review status (context)

**What was found:** Both remediation plans have been through Opus adversarial review.

**Evidence:**
- **c1 plan:** Opus-reviewed twice. Pass 1 found 1 BLOCKING (fresh-install mkdir) + 3 SHOULD-FIX (inventory over-split, un-migrated seed window, weak verification) + 1 NIT. Pass 2 confirmed all fixed, empirically verified fence maps + awk assertion, surfaced 3 NITs of which N-b (`2>/dev/null` silence) was applied.
- **c2 plan:** Opus-reviewed once — no BLOCKING findings; 3 SHOULD-FIX: (A) `2>/dev/null` inconsistency, (B) `git add dist/` scope gate to avoid unrelated bundle churn, (C) harden seed `cp` to atomic `mv` for the concurrent-PostToolUse-hook race.

**Severity/disposition:** c1 fully addressed across two passes. c2 A/B/C are being applied.

**Where handled:** c1 closed out; c2 A/B/C in progress (see Open items).

---

### Finding 8 — Content-storage location: recall-verified, no ADR, and a live init-flow divergence (refines Finding 4; OUT OF SCOPE, needs its own ADR)

**What was found:** A recall pass (recall-agent, `--scope=all`, 2026-07-14) confirmed there is **no ADR** — accepted or proposed — that relocates the global-topic (`~/.claude/knowledge-graphs/`) or cowork (`~/.claude/cowork-knowledge/`) *content* stores to `~/.kmgraph/`. The platform-agnostic principle exists (ADR-028) and justifies such a move, but it has never been decided for these paths. Additionally, the two `kmg-init` implementations have **diverged**: the MCP server's init already migrated, the slash-command wizard did not.

**Evidence (recall citations):**
- **ADR-028** (`knowledge/decisions/ADR-028-me-and-rules-as-platform-agnostic-source-of-truth.md`) — Accepted; its v0.3.5-beta amendment moved the **personal KG home** to `~/.kmgraph/` and states the platform-agnostic rationale, but names neither `knowledge-graphs/` nor `cowork-knowledge/`.
- **ADR-001** (`.../ADR-001-centralized-multi-kg-configuration.md`) — 2026-07-11 update; scope = `kg-config.json` only.
- **Spec** `docs/specs/2026-07-11-kg-config-location-refactor-design.md` — scope = config+index only; content relocation not mentioned (neither included nor deferred).
- **Version correction:** the migration chain was ADR-028 (v0.3.5-beta) + config/index (v0.6.18, `654c13fb`), **not v0.0.7** (which was docs consolidation only).
- **Live init-flow divergence (correction to an earlier claim that these were "just examples"):**
  - `mcp-server/src/cli.ts:63-110` — MCP init offers only `1. ./docs/`, `2. ~/.kmgraph/`, `3. custom`; grep of `mcp-server/src` for `knowledge-graphs`/`cowork-knowledge` = 0 hits. The global-topic and cowork modes were **dropped** here.
  - `commands/kmg-init.md` — slash-command wizard STILL live-assigns `KG_PATH="$HOME/.claude/knowledge-graphs/$kg_name/"` (line 1039) and `KG_PATH="$HOME/.claude/cowork-knowledge/$kg_name/"` (line 1042), and still lists them in its menu (lines 920-921). So the two init paths offer **different storage choices and different locations**.

**Severity/disposition:** Genuine inconsistency, but **out of scope** for the config-path split-brain fix (c1/c2/c3). Resolving it is a **product/architecture decision**, not a path swap: (1) do the global-topic and cowork storage modes still exist as concepts? (cli.ts dropped them, kmg-init.md kept them); (2) if they exist, do their content stores relocate to `~/.kmgraph/` per the ADR-028 principle?; (3) reconcile the two `kmg-init` implementations. ADR-028 supplies the rationale but not the decision.

**Where handled:** PARKED — recommend its own ADR + issue. Not folded into c1/c2/c3. No code touched.

**Bonus flag (verify separately, likely already fixed):** recall surfaced a v0.6.18 spec note that `readConfig()` had no legacy fallback (would make `handleUpgrade` fail before migration ran). Session history shows legacy-fallback commits `2d0aba01`/`dd62385b` landed afterward — so this is probably already resolved; confirm before acting.

---

### Finding 9 — Completeness method (dataflow, not string-grep) + directory-creation verification (2026-07-15)

**Why the original miss happened (method root cause):** issue-14's triage — and my first several audit passes — classified files by grepping the literal path string `~/.claude/kg-config.json`. Writes that go through a shell **variable** (`CONFIG_PATH="…"` on one line, `… > "$CONFIG_PATH.tmp"; mv "$CONFIG_PATH.tmp" "$CONFIG_PATH"` on later lines) are **invisible** to a path-string grep because the write lines never contain the path. This is precisely why `kmg-switch` was mis-filed LOW. A path-string classifier structurally cannot find variable-indirection writers.

**The completeness-correct method (run 2026-07-15):**
1. **Closed set (bounding guarantee):** a config/index split-brain can only exist where code names a migrated path OR a variable bound to one. `grep -rlE 'kg-config\.json|kg-fts5|knowledge-graphs/|cowork-knowledge/'` over commands/agents/scripts/skills/core/mcp-server/src → **41 files**. Nothing outside this finite set can be affected. Completeness is by enumeration, not diligence.
2. **Classify by dataflow:** for each file, (a) find variables bound to a migrated path (`^\s*VAR=.*(kg-config\.json|kg-fts5|KG_CONFIG_PATH|…)`), then (b) count writes through those vars (`> "$VAR"`, `mv …"$VAR"`, `cat > "$VAR"`) plus literal-path writes.

**Result:** **7 true writers**: 6 in c1 — `kmg-init.md`, `kmg-init-personal-kg.md`, `kmg-add-category.md`, `kmg-init-shared/kmg-config-entry-write.md`, `kmg-init-shared/kmg-upgrade-inspector.md`, `kmg-switch.md` — plus `scripts/hooks-master.sh:227`, an `fs.writeFileSync` inside an embedded `node -e` autoSwitch block, fixed by c2 Task 1. Four apparent "gaps" (`create-adr-agent.md:31`, `lesson-capture-agent.md:29`, `recall-agent.md:28`, `session-summary-agent.md:44`) were verified as **prose** (`--named=<kg> → read ~/.claude/kg-config.json…`; the regex matched the `>` inside `<kg>` markup).

**Directory-creation sub-finding (answers "was ~/.kmgraph only created by personal-init?"):**
- **Server:** `mcp-server/src/utils.ts:79-84` `writeConfig()` runs `mkdirSync(dir,{recursive:true})` before every write → creates `~/.kmgraph/` on any config write, any KG type. Index writers (`getPersonalDbPath`/`getProjectDbPath`/`getFTS5DbPath`) also `mkdirSync`. Server side is safe.
- **Command/bash side:** the file-level `mkdir` scan shows `kmg-switch.md` and `kmg-init-shared/kmg-config-entry-write.md` have **NO `mkdir`** today — latent because they currently write to `~/.claude` (which exists). After migration they'd write to `~/.kmgraph` and could fail on a machine where it doesn't exist. **c1's canonical preamble fixes this** — it adds `mkdir -p "$(dirname "$CONFIG_PATH")"` to every writer fence, so project-local init / switch / add-category all create `~/.kmgraph/`, not just personal-init.

**Method limits (stated honestly):** (a) single-file dataflow only — a var set in file A and used in file B would be missed; holds here because command prompts are self-contained. (b) Covers writers (silent corruption risk); reads-on-absence are a separate, milder class handled by c2 seeding + server legacy-fallback. (c) Scoped to kg-config + FTS5 paths; content-storage is the parked ADR-066 exception. (d) The dataflow write-pattern set must also include `writeFileSync|copyFileSync|tee|>>` inside embedded interpreters (`node -e`/`python -c`) — shell-write patterns alone are blind to them, the same blind-spot class Finding 1 exists to correct (this is exactly how `scripts/hooks-master.sh:227` was initially missed). **This must be fixed before the method is adopted as the standard.** **Recommendation:** adopt this dataflow-classification method — with the embedded-interpreter write patterns included — as the standard for any future path/value migration blast-radius audit (candidate lesson-learned / ADR).

---

## Open items

- (a) **Finding 8 (content-storage) PARKED** — captured 2026-07-14 as **ADR-066 (Proposed, context + open decision only)** and in ROADMAP "Needs its own dedicated brainstorm/ADR". Decision still pending (do global-topic/cowork modes survive; relocate to `~/.kmgraph/`; reconcile `cli.ts` vs `kmg-init.md`). Not in c1/c2/c3.
- (b) c2 Opus A/B/C — **applied** (atomic seed cp, dist-scope gate, `2>/dev/null` consistency).
- (c) grep-`-F` hardening — **applied** across c1/c2 verification steps (c3 unaffected); verified against real files.
- (d) issue-14-description.md triage correction (kmg-switch LOW→HIGH) — pending, to be done in the gated issue-tracking batch.
- (e) Verify the `readConfig()` legacy-fallback bonus flag (Finding 8) is already closed by `2d0aba01`/`dd62385b`.
- (f) **Operational acceptance-test matrix drafted** (`knowledge/issues/issue-14/acceptance-test-matrix.md`, 2026-07-15) — 13 rows (init/switch/read/write × personal/project + bleed-isolation + env-edges), both surfaces (MCP + command). This is the real acceptance gate for c1/c2/c3 (static greps only prove path-reference correctness, not operational correctness). NOT yet executed. Row 3 (global/cowork content) blocked on ADR-066.
- (g) **ADR-067 (proposed) captured** — mutable `.active` switch vs context-derived KG resolution (cross-KG bleed concern). Explicitly deferred beyond this session; would supersede kmg-switch + its c1 fix if adopted.
