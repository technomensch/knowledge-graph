<!-- Created: 2026-09-04 (ADR-071) -->

# Backfill Knowledge Graph from Existing Content

Extracts lesson/decision/KG-entry candidates from three already-existing narrative sources — `chat-history/`, `knowledge/lessons-learned/`, and `knowledge/decisions/` — and presents them for confirmation before writing. Consolidates the prior `kmg-update-graph`'s job (indexing already-written lessons/decisions) with chat-history extraction into one command.

**Not the same as `kmg-init`'s own backfill offer:** `kmg-init` Step 1.10 handles drafting brand-new lesson/decision candidates from raw project docs (`plans/`, `research/`, `specs/`, `README.md`, `CHANGELOG.md`) at setup time, and delegates its `chat-history/`/`lessons-learned/`/`decisions/` portion to *this* command. Run `kmg-backfill` directly, any time, to (re-)index those three sources on demand — you don't need to re-run all of `kmg-init` to do that. See ADR-071.

---

## Usage

```bash
/kmgraph:kmg-backfill
/kmgraph:kmg-backfill knowledge/chat-history/2026-08/
/kmgraph:kmg-backfill knowledge/lessons-learned/architecture/
/kmgraph:kmg-backfill --date=2026-08-20
/kmgraph:kmg-backfill --after=2026-08-01 --before=2026-08-31
```

**Parameters:**
- `[path]` (optional): a single file, a chat-history date folder, or a `lessons-learned/`/`decisions/` category folder. Omit to scan all three sources in the active KG.
- `--date=YYYY-MM-DD` (optional): chat-history only — scope to one date.
- `--after=YYYY-MM-DD` / `--before=YYYY-MM-DD` (optional): chat-history only — scope to a date range. Inapplicable to `lessons-learned/`/`decisions/` (not date-named); use `[path]` to scope those instead.
- `--delegate knowledge-extractor` (default: **on**): reads via the `knowledge-extractor` subagent instead of inline, to avoid pulling large files into main context. Only disable for a single small known-good file.

**Explicitly does NOT support** (see ENH-035 "Flags" section for the reasoning behind each): `--source`, `--output-dir`, `--today`, `--rebuild`, `--dry-run`, `--yes`/`--no-confirm`, `--project`/`--confirm-unscoped`.

---

## Step 0: Resolve Target Graph

```
kg_resolve
```

Take the returned `path` as `$kg_path`. If `kg_resolve` errors (no graph registered for this directory), tell the user and offer `/kmgraph:kmg-init`. Do not proceed until resolved.

---

## Step 1: Resolve Source Scope

```bash
# Default (no [path], no --date/--after/--before): scan all three sources fully
sources=("${kg_path}/chat-history/" "${kg_path}/lessons-learned/" "${kg_path}/decisions/")

# If [path] given: scope to that single path only
# If --date/--after/--before given (chat-history only): scope chat-history/ to that range,
#   still include the full lessons-learned/ and decisions/ scan (those flags don't apply there)
```

If none of the three source directories exist under `$kg_path`, report "No sources found to backfill from — `chat-history/`, `lessons-learned/`, and `decisions/` are all empty or missing" and stop.

---

## Step 2: Delegate to `knowledge-extractor` (default) or Read Inline

**If `--delegate knowledge-extractor` (default):**

Invoke the `knowledge-extractor` subagent in `init-backfill` mode, passing the resolved `sources[]` array from Step 1. The subagent reads the files, drafts candidates, and returns a structured list (category, title, problem/solution or KG-index-entry text, source reference) — it does **not** write. See `agents/knowledge-extractor.md`'s Init-Backfill Mode section.

**If `--delegate` disabled (single small file only):**

Read the file directly and draft the same structured candidate shape inline.

---

## Step 3: Print Confirmation Line, Present Drafts

Before any write:

```
Drafting from: {source file(s)} → Writing to: {target KG path}
```

Then present the full candidate list to the user. For each candidate, the user may approve, reject, or edit before it's written — no candidate is written without explicit confirmation (this command never auto-writes).

---

## Step 4: Write Approved Candidates

The coordinator session (not the `knowledge-extractor` subagent) performs the write for each approved candidate:
- `chat-history/`-sourced candidates → new files under `lessons-learned/` or `decisions/` as appropriate to the candidate's category.
- `lessons-learned/`/`decisions/`-sourced candidates → new/updated KG-index entries pointing back to the existing source file (the former `kmg-update-graph` behavior).

Report a summary table of what was written.

---

## Integration with Other Commands

- `/kmgraph:kmg-init` Step 1.10 calls this command for its `chat-history/`/`lessons-learned/`/`decisions/` sources (see `commands/kmg-init.md`).
- `kg_extract` (MCP tool) is this command's cross-platform equivalent for Codex/Gemini — same read/draft/confirm contract, no subagent spawning required.

---

**Created:** 2026-09-04
**Version:** 1.0
**Purpose:** Consolidated, re-invocable extraction from chat-history/lessons-learned/decisions into KG entries — replaces `kmg-update-graph` (see ADR-071)
