---
id: ENH-035
type: Enhancement
status: proposed
---

# ENH-035: Chat-history-and-lessons-to-KG backfill extractor (standalone, consolidates the now-retired kmg-update-graph)

**Status:** 🟡 Proposed
**Discovered:** 2026-07-03
**Governed by:** [ADR-058](../../decisions/ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings.md)
**Related:** [ADR-057](../../decisions/ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md) (the DETECT-layer / auto-capture pipeline this ENH is deliberately NOT coupled to), [ENH-032](../ENH-032/ENH-032-specification.md) (resolved — establishes the extractor-never-writes / coordinator-confirms-then-writes pattern this ENH's command must preserve), [ENH-034](../ENH-034/ENH-034-specification.md) (its `kmg-update-graph` removal decision (Option C) is made unconditionally safe by this ENH's consolidation — coordinate implementation order so `knowledge-extractor`'s KG Entry Extraction Mode isn't deleted twice or left half-updated), [ENH-025](../ENH-025/ENH-025-specification.md) (proposed, found via 2026-09-04 open-ticket overlap check — its `kg_extract` MCP tool design is adopted as this ENH's cross-platform-parity answer; implement together), `commands/kmg-extract-chat.md`, `commands/kmg-update-graph.md`, `commands/kmg-init.md` (Step 1.10), `agents/knowledge-extractor.md`, `docs/pillars/organizing/backfill.md`

---

## Problem

**Corrected 2026-09-04 — original problem statement below was partially wrong.** It claimed "nothing extracts lessons/decisions/KG-entries FROM `chat-history/`." That's false: `commands/kmg-init.md` Step 1.10 ("Optional Backfill from Existing Project") already does exactly this — its `sources[]` array checks `chat-history/` first (before `plans/`, `research/`, `specs/`, `README.md`, `CHANGELOG.md`), invokes the `knowledge-extractor` subagent in `"init-backfill"` mode, gets back structured lesson/decision/pattern/gotcha candidates, and writes only after user confirmation (per [ENH-032](../ENH-032/ENH-032-specification.md)'s resolved coordinator-confirms pattern).

**The real, narrower gap:** that extraction only exists **inside the one-shot `kmg-init` flow**. There is no standalone, independently re-invocable command to backfill from `chat-history/` later — e.g., months after init, once new chat-history has accumulated that was never captured as lessons. Today the only documented way to re-trigger it is to re-run `kmg-init` itself (see `docs/pillars/organizing/backfill.md`'s troubleshooting section, "re-run init on the same project — it detects the existing KG and jumps directly to the backfill offer").

Separately, the docstring problem still stands as originally described:
- `kmg-extract-chat`'s own docstring claims it is **"ideal for backfilling knowledge graphs from large chat histories."** In reality it only **archives raw session transcripts** as markdown into `chat-history/`. It does not extract anything. Confirmed via direct code inspection: `commands/kmg-extract-chat.md` archives only; performs no lesson/decision/KG-entry extraction itself.
- The same overclaim appears a second place: `docs/pillars/organizing/backfill.md`'s "From chat history" section says `kmg-extract-chat` "locates chat logs, extracts lessons and decisions, and presents them for review before writing" — also false, for the same reason. This doc-page instance needs the same fix as the docstring.

---

## Proposed Behavior

Build a **standalone, re-invocable** extractor, have `kmg-init`'s Step 1.10 **delegate to it** for the chat-history portion instead of carrying its own duplicate copy of the same scan→extract→confirm→write logic, and separately fix the misleading docstring/doc-page claims. These are three related but independently shippable pieces.

1. **New standalone extractor command: `kmg-backfill`** (name decided 2026-07-03, revised 2026-09-04 — see "Naming decision" below). Scope **broadened 2026-09-04** to absorb `kmg-update-graph`'s job (see decided resolution above). It:
   - Reads files under `chat-history/`, `knowledge/lessons-learned/`, and `knowledge/decisions/` (single file, date folder/category, or range).
   - Drafts candidate lesson / decision / KG-entry artifacts from `chat-history/`; for already-existing `lessons-learned/`/`decisions/` files, extracts quick-reference KG index entries pointing back to them (the behavior formerly unique to `kmg-update-graph`/`knowledge-extractor`'s `update-graph` mode).
   - **Before any write, prints the resolved target path(s) and destination KG** — reuses the confirmation-line pattern established in ENH-033 (step 3a): `Drafting from: {source file(s)} → Writing to: {target KG path}`.
   - **Presents drafts for human confirmation before any write** — a simple present-for-confirmation flow, aligned with the project's reversibility/explicit values. It does **not** auto-write. This preserves [ENH-032](../ENH-032/ENH-032-specification.md)'s resolved pattern (extractor is read-only/extract-only; the coordinator session shows the final "write N files?" confirmation and does the writing) — the refactor in point 2 must not regress that fix.

2. **Refactor `kmg-init` Step 1.10, fixing its `sources[]` gap in the same pass.** Step 1.10 currently builds a `sources[]` array checking only `chat-history/`, `plans/`, `research/`, `specs/`, `README.md`, `CHANGELOG.md` — despite `knowledge-extractor.md`'s own Init-Backfill Mode doc claiming `lessons-learned/`/`decisions/` are scanned too (they never actually were; see the bug found above). Fix: add `knowledge/lessons-learned/` and `knowledge/decisions/` detection to `sources[]`, and route all three of `chat-history/`/`lessons-learned/`/`decisions/` through the new standalone `kmg-backfill` command instead of a direct `knowledge-extractor` call. Step 1.10 continues handling the other five source types (`plans/`, `research/`, `specs/`, `README.md`, `CHANGELOG.md`) itself — drafting brand-new lesson/decision candidates from raw docs is a different job than indexing already-existing ones. This eliminates the duplicate/inconsistent implementation of "scan → delegate to knowledge-extractor → present → confirm → write" that would otherwise exist (and, for lessons/decisions, never actually existed correctly) in two places.

3. **Fix the docstring AND doc-page overclaims.** `kmg-extract-chat`'s docstring, and `docs/pillars/organizing/backfill.md`'s "From chat history" section, both currently claim `kmg-extract-chat` extracts lessons/decisions. Reword both to describe what it actually does (archive raw transcripts) and point to `kmg-backfill` for actual extraction. Independent of when the command itself lands.

---

## Explicitly Out of Scope

- **Any dependency on `capture_mode`**, the parent auto-capture pipeline, or the DETECT-layer classifier ([ENH-036](../ENH-036/ENH-036-specification.md)). Per the second-opinion finding recorded in ADR-058's context: batch classification over raw, unbounded chat transcripts is harder than live-hook detection (no discrete trigger boundary, high noise), and coupling a simple extractor to the still-unresolved `capture_mode` keystone would recreate the exact piecemeal-coupling problem ADR-057 diagnosed.
- **Do not architect this as "pipeline slice 1."** It is a narrow, self-contained fix. Any classifier-design insight gained is a bonus, not an architectural commitment.
- Auto-writing without review (even absent `capture_mode`, use the simple confirmation flow).

---

## Options — DECIDED: Option A

### Option A: New dedicated command, `kmg-backfill` (chosen)
A separate command so the archive step (`kmg-extract-chat`) and the extract step stay cleanly distinct.

**Why decided now (2026-07-03):** `kmg-update-graph` (Option B's target) is already flagged in ENH-034 as an actively-misleading name and a rename candidate. Extending a command that's already earmarked for its own rename would double the change surface on that file across two ENHs. A new standalone command also keeps each command's job narrow — consistent with the detection/routing separation already established in ADR-034 and ADR-057 — rather than mixing two source shapes (structured `lessons-learned/` vs. raw, noisy `chat-history/`) with different signal profiles into one command.

**Update (2026-09-04):** ENH-034 has since re-contextualized `kmg-update-graph` from a rename candidate to a **removal candidate** (Option C — confirmed-dead orchestration pipeline via `kmg-sync-all`/`sync-all-agent`, no recall evidence of manual invocation, and provenance tracing it to an unrelated prior project's inherited scaffold). This makes the decision below stronger, not weaker: it was already wrong to extend a command flagged for rename; it is even more clearly wrong to extend one flagged for removal. The Option A choice (new standalone `kmg-backfill` command) stands unchanged.

**DECIDED (2026-09-04): `kmg-backfill` absorbs `knowledge-extractor`'s `update-graph` mode logic — and a real bug was found while validating this.** Checked whether `kmg-init`'s existing backfill already covers pre-existing `lessons-learned/`/`decisions/` content (as originally assumed) before deciding to consolidate:

- `agents/knowledge-extractor.md`'s own **Init-Backfill Mode** section documents its Input as including `knowledge/lessons-learned/` and `knowledge/decisions/` directories, with Behavior steps "Scan lessons-learned/ → extract existing lessons" and "Scan decisions/ → extract ADRs."
- But `commands/kmg-init.md`'s actual Step 1.10 `sources[]` array — the code that really drives what gets scanned — only ever adds `chat-history/`, `plans/`, `research/`, `specs/`, `README.md`, `CHANGELOG.md`. It never adds `knowledge/lessons-learned/` or `knowledge/decisions/`.
- **This is a genuine spec/code mismatch**, independent of anything else in this ENH: the agent's documented behavior for init-backfill mode is broader than what `kmg-init` ever actually triggers. In practice, init-backfill has never scanned pre-existing lessons/decisions — so the overlap that looked like it made `kmg-update-graph` redundant was illusory; removing it as-is today would leave a real gap.

**Resolution:** `kmg-backfill` becomes the single consolidated extractor for **all three** already-exists-as-narrative-content sources: `chat-history/` (its original scope), plus `knowledge/lessons-learned/` and `knowledge/decisions/` (absorbed from `knowledge-extractor`'s `update-graph` mode — this was `kmg-update-graph`'s actual unique job before it was retired: turning already-written lesson/decision files into quick-reference KG index entries). `kmg-init`'s Step 1.10 keeps owning the *other* five source types (`plans/`, `research/`, `specs/`, `README.md`, `CHANGELOG.md` — raw project docs used to draft brand-new lesson/decision candidates from scratch) and, per point 2 below, is fixed to route `chat-history/` **and now also `lessons-learned/`/`decisions/`** through `kmg-backfill` instead of the never-actually-wired-up direct scan. This closes the gap and makes `kmg-update-graph`'s removal (ENH-034 Option C) unconditionally safe — no orphaned capability, just relocated.

**Naming decision:** `kmg-backfill` passes the ADR-058 check — audience: end users, not contributor-only; collision: none found against existing command names (`kmg-extract-chat`, `kmg-update-graph` — since retired, see ADR-071 — checked directly, `kmg-backfill` bare form re-checked 2026-09-04 — also clean); accuracy: name describes exactly what it does (backfills the graph from existing chat-history), and its docstring must be written to match that claim exactly — this ENH exists because a prior command's docstring didn't.

**Renamed from `kmg-backfill-graph` (2026-09-04).** The original `-graph` suffix had exactly one stated reason (ENH-034 line 40, pre-edit): pairing conceptually with `kmg-ingest-graph`, the then-rename-candidate for `kmg-update-graph`. ENH-034 has since re-contextualized `kmg-update-graph` to a removal candidate, not a rename — `kmg-ingest-graph` will never exist, so the pairing rationale is gone and no other reason for the suffix survives. Dropped to the shorter `kmg-backfill`.

**Naming disambiguation risk (flagged, not a blocker; scope updated 2026-09-04):** `kmg-init` already has its own internal "backfill" offer. After this ENH's consolidation, the split is: `kmg-init`'s Step 1.10 owns drafting brand-new lesson/decision candidates from raw project docs (`plans/`, `research/`, `specs/`, `README.md`, `CHANGELOG.md`); `kmg-backfill` owns everything that's already narrative content needing indexing/drafting into the KG (`chat-history/`, `lessons-learned/`, `decisions/`) — and `kmg-init` calls `kmg-backfill` for that portion rather than duplicating it. The docstring for both commands must make this split explicit so users aren't unsure which one to reach for.

---

## Flags (approved 2026-09-04, per independent second-opinion review)

An Opus-model review (given full context: this spec, `kmg-extract-chat`'s flag set, and ADR-062) was asked whether `kmg-backfill` needs a flag set similar to `kmg-extract-chat`'s, and pushed back on most of it — most of `kmg-extract-chat`'s flags solve *its own* problems (multi-platform log formats, machine-wide directory globs) that don't carry downstream to a command consuming its already-clean output. The real problem `kmg-backfill` faces is volume: `chat-history/` measured at 146 files / 65 MB, some single files up to 1.5 MB — an unbounded run would blow context before producing a single draft.

**Approved:**
- **Positional `[path]`** — a single file, date folder (chat-history), or category folder (`lessons-learned/architecture/`, `decisions/`) now that scope is broadened. Also covers a non-default archive location `kmg-extract-chat --output-dir` created, so no separate input-dir flag is needed.
- **`--date=YYYY-MM-DD` / `--after=` / `--before=`** — applies to `chat-history/`'s date-named files specifically; `lessons-learned/`/`decisions/` files aren't date-named, so these flags are a no-op/inapplicable there — scope by `[path]`/category instead for those two sources. Reuse `kmg-extract-chat`'s exact spellings for the chat-history case.
- **`--delegate knowledge-extractor`** — the highest-value flag. Reading a 1.5 MB file into main context is the real failure mode; the subagent is already read-only and approval-gated, matching the confirm-before-write requirement exactly. Worth considering as the default behavior rather than opt-in.

**Rejected (with reason):**
- `--source` — a lesson is a lesson regardless of which CLI produced the transcript; claude/gemini/codex is an ingestion-time artifact, not relevant once chat-history is merged.
- `--output-dir` — destinations are structural per artifact type (lesson/decision/entry) and already resolved + printed via the ENH-033 confirmation-line pattern.
- `--today` — backfill is retrospective by definition; doesn't fit.
- `--rebuild` — presupposes per-date processing state this command doesn't and shouldn't have; would recreate exactly the "pipeline slice 1" machinery this ENH's Out of Scope section forbids.
- `--dry-run` — redundant; the command is dry-by-default (confirm-before-write is the whole design).
- `--yes` / `--no-confirm` — rejected outright; would violate the never-auto-write acceptance criterion.
- `--project` / `--confirm-unscoped` (the ADR-062 fail-closed pair) — the risk that pair guards against doesn't exist here. ADR-062 exists because `kmg-extract-chat`'s *read* side globs every project on the machine while only the *write* side respects cwd — a real trust-boundary crossing. `kmg-backfill` reads and writes within the same already-resolved graph; there's no foreign source to leak in. Adding the pair here would be cargo-culting a gate onto an operation that already has a stronger one (human review of every draft).

### Option B: Extend `kmg-update-graph` to also read `chat-history/` (rejected)
**Rejected because:** overloads a command already flagged for rename (now removal, per ENH-034's 2026-09-04 update) in ENH-034, and mixes two source shapes with different noise profiles into one command's responsibility.

---

## Blast Radius — deep-dive (2026-09-04)

Requested check: what else does introducing `kmg-backfill` and refactoring `kmg-init` Step 1.10 touch. Full repo scan (`init-backfill`, `backfill`, `Step 1.10` across commands/, agents/, skills/, docs/, tests/, mcp-server/, core/) found:

**Confirmed in scope:**
- `commands/kmg-init.md` Step 1.10 — refactored per point 2 above; also fixes the `sources[]` gap (never actually scanned `lessons-learned/`/`decisions/` despite the agent doc claiming it did).
- `agents/knowledge-extractor.md` — its **Init-Backfill Mode** section's Input/Behavior text (currently claims `lessons-learned/`/`decisions/` scanning that never actually ran) needs correcting to match what actually happens post-refactor: those two sources are now reached via `kmg-init` → `kmg-backfill`, not directly by `knowledge-extractor` in init-backfill mode. Its separate **KG Entry Extraction Mode** section (the `update-graph`-mode logic being absorbed into `kmg-backfill`) should be removed or marked deprecated once `kmg-backfill` implements the equivalent behavior — coordinate with ENH-034's removal of `kmg-update-graph` so this isn't deleted twice or left half-updated.
- `docs/pillars/organizing/backfill.md` — needs multiple fixes, not just the docstring-echo already noted:
  - "After init" section used to tell users to run `/kmgraph:kmg-update-graph --auto --sync-all` — that command has since been removed (ENH-034 Option C, see ADR-071); the doc now points to `kmg-backfill` instead.
  - Troubleshooting → "Backfill ran but produced no candidates" used to tell users to run `kmg-update-graph --source research/` as a remedy — same stale-command problem, now fixed (see `docs/pillars/organizing/backfill.md`).
  - Troubleshooting → "Init completed but backfill was skipped" names "Step 1.10" explicitly and documents re-running `kmg-init` (Claude Code) / `/kmg-init` (Gemini CLI) / `kg_capture` MCP tool (Codex/other) as the only recovery paths. Once `kmg-backfill` exists as a standalone command, this section should offer it directly instead of "re-run the entire init wizard."
- `docs/reference/commands.md` line ~92 (`kmg-init` row: "optionally backfills from existing project context") — needs a new row for `kmg-backfill`, already noted generally, called out specifically here.
- [ENH-032](../ENH-032/ENH-032-specification.md) (resolved) — not a file to edit, but its Option D pattern (extractor never writes, coordinator confirms-then-writes) is the architecture Step 1.10 already relies on. The refactor must preserve it, not reintroduce the pre-ENH-032 relay-approval deadlock.

**Checked, ruled out as unrelated (different meaning of "backfill"):**
- `mcp-server/src/tools/upgrade.ts` — "backfill" here refers to `kg_upgrade`'s version-migration backfix categories (e.g. `missing-root-readme`), unrelated to chat-history extraction.
- `core/scripts/extract_claude.py` — "backfilled" here refers to date-fallback logic for untimestamped log records, unrelated.

**Checked, low/no risk:**
- `tests/test-skills-agents.sh` (Test 15) and `tests/README.md` — assert only that `knowledge-extractor.md` contains generic "read-only"/"approval" wording. Not coupled to Step 1.10's specific implementation; should still pass after the refactor, but re-run to confirm no regression.

**Resolved via existing overlap, not a fresh open question (2026-09-04):** `docs/pillars/organizing/backfill.md`'s troubleshooting section documents a Codex/other-platform recovery path via the `kg_capture` MCP tool rather than a prose slash command — implying non-Claude-Code platforms reach backfill through `kg_*` MCP tools, not `commands/*.md` files. A ticket check found **[ENH-025](../ENH-025/ENH-025-specification.md)** (proposed, 2026-06-12, previously unrelated to this ENH) already designs exactly this: a `kg_extract` MCP tool that reads chat-history files server-side, returns structured lesson candidates, never writes, and is scoped to touch `agents/knowledge-extractor.md` and `kmg-init` Step 1.10 — the same files this ENH refactors. Rather than answering the MCP-parity question from scratch, this ENH adopts ENH-025's `kg_extract` design as the answer, with one scope update: `kg_extract` should read `lessons-learned/`/`decisions/` too, matching `kmg-backfill`'s now-broadened 3-source scope (see ENH-025 itself for its update note). Implement `kg_extract` alongside `kmg-backfill` so cross-platform parity lands in the same pass, not a second one.

---

## Affected Files

| File | Role |
|---|---|
| `commands/kmg-extract-chat.md` | Fix overclaiming docstring — describe actual archive behavior; point to the extractor |
| `commands/kmg-backfill.md` (new) | New standalone, consolidated extractor: `chat-history/` + `lessons-learned/` + `decisions/` → drafted/indexed KG entries with target-confirmation line + confirm-before-write. Absorbs `kmg-update-graph`'s job. |
| `commands/kmg-init.md` | Step 1.10 refactored to delegate `chat-history/` **and** `lessons-learned/`/`decisions/` (fixing the `sources[]` gap) to `kmg-backfill` instead of duplicating/half-implementing the scan/extract/confirm/write logic; continues handling `plans/`/`research/`/`specs/`/`README.md`/`CHANGELOG.md` itself |
| `agents/knowledge-extractor.md` | Init-Backfill Mode doc corrected to match actual post-refactor behavior; KG Entry Extraction Mode (`update-graph` mode) removed/deprecated as its logic moves into `kmg-backfill` — coordinate with ENH-034 |
| `docs/pillars/organizing/backfill.md` | Fix "From chat history" overclaim; replace `kmg-update-graph` references (2 spots) with current guidance; update "Init completed but backfill was skipped" to offer `kmg-backfill` directly, not just re-running `kmg-init` |
| `docs/reference/commands.md` | Document the new extractor and corrected `kmg-extract-chat` description |

**Docs-impact-scan (2026-09-04):** the 19-file list of docs referencing `kmg-update-graph`/`kmg-sync-all` as live behavior is tracked in full under ENH-034's Affected Files (same scan, run once for both ENHs). Any of those 19 that document the replacement workflow (e.g. `docs/pillars/recalling/session-memory.md`'s "run kmg-update-graph after capturing lessons," `docs/templates/meta-issue/README.md`'s "sync to KG" instruction) should point to `kmg-backfill` going forward, not just have the old reference deleted — implement as part of this ENH's docs pass, coordinated with ENH-034's removal pass so each file is edited once, not twice.

---

## Acceptance Criteria

- [ ] `kmg-extract-chat`'s docstring no longer claims backfill/extraction; it describes only its actual archive behavior.
- [ ] `docs/pillars/organizing/backfill.md`'s "From chat history" section no longer claims `kmg-extract-chat` extracts lessons/decisions; both `kmg-update-graph` references there (After-init section, "no candidates" troubleshooting) are updated to current guidance.
- [ ] `kmg-backfill` exists as a new standalone command that reads `chat-history/`, `lessons-learned/`, and `decisions/`, drafting lesson/decision candidates from the former and KG-index entries from the latter two — absorbing `kmg-update-graph`'s prior job.
- [ ] `kmg-init` Step 1.10's `sources[]` array is fixed to detect `knowledge/lessons-learned/` and `knowledge/decisions/` (bug: previously never checked, despite `knowledge-extractor.md` documenting otherwise) and delegates all three of `chat-history/`/`lessons-learned/`/`decisions/` to `kmg-backfill` instead of duplicating/half-implementing that logic; the other five source types (`plans/`, `research/`, `specs/`, `README.md`, `CHANGELOG.md`) remain Step 1.10's own responsibility.
- [ ] `agents/knowledge-extractor.md`'s Init-Backfill Mode doc no longer claims `lessons-learned/`/`decisions/` scanning that doesn't happen there post-refactor; its KG Entry Extraction Mode section is removed/deprecated in the same pass as ENH-034's `kmg-update-graph` removal (not left dangling either direction).
- [ ] `docs/pillars/organizing/backfill.md`'s "Init completed but backfill was skipped" troubleshooting offers running `kmg-backfill` directly as a recovery path, not only re-running all of `kmg-init`.
- [ ] Supports positional `[path]` and `--date=`/`--after=`/`--before=` for scoping input; supports `--delegate knowledge-extractor` (or defaults to it) for large-file reads.
- [ ] Does NOT implement `--source`, `--output-dir`, `--today`, `--rebuild`, `--dry-run`, `--yes`/`--no-confirm`, or `--project`/`--confirm-unscoped` — see "Flags" section for rejection reasons on each.
- [ ] Docstring explicitly distinguishes this command from `kmg-init`'s own backfill offer (narrower, chat-history-specific vs. `kmg-init`'s broader setup-time scan).
- [ ] Before any write, the command prints the resolved source file(s) and destination KG path (reused ENH-033 step-3a pattern).
- [ ] The extractor presents drafts for human confirmation and never auto-writes — preserves ENH-032's resolved coordinator-confirms-then-writes pattern; the extractor subagent itself never writes.
- [ ] The extractor has **no** code dependency on `capture_mode`, the auto-capture pipeline, or the ENH-036 classifier.
- [ ] `kmg-update-graph` is untouched by this ENH (Option B rejected) — its removal is tracked separately under ENH-034 Option C.
- [ ] `tests/test-skills-agents.sh` (Test 15) and `tests/README.md`'s `knowledge-extractor` assertions still pass after the Step 1.10 refactor (no regression, generic wording only — verify, do not need to change).

**Post-implementation ticket sync (do not skip — these were left "pending"/"not yet implemented" specifically so this work would close them):**
- [ ] `ENH-025` updated from `accepted` to `implemented` — its `kg_extract` tool ships as part of this ENH's implementation.
- [ ] `issue-37` updated from `accepted` to `resolved`/closed, pointing at the shipped removal (tracked primarily under ENH-034, cross-check here since this ENH ships the replacement).
- [ ] `docs/pillars/organizing/backfill.md`'s fixes (all three: "From chat history" overclaim, "After init" `kmg-update-graph` reference, "no candidates" troubleshooting reference, "backfill was skipped" section) are confirmed landed, not left as open TODOs in the doc itself.
- [ ] `ADR-071` status moved from `Proposed` to `Accepted` once this ENH and ENH-034 both ship.
</content>
