---
title: "ENH-024: Add Codex CLI Chat History Extraction Support"
number: 024
status: proposed
version_target: null
github_issue: null
created: 2026-06-12
related_adrs: ["ADR-044"]
related_enhs: []
---

# ENH-024: Add Codex CLI Chat History Extraction Support

## Problem

`/kmgraph:extract-chat` currently supports only Claude Code (`-claude`) and Gemini CLI (`-gemini`) as log sources. OpenAI Codex CLI stores chat sessions in a structured JSONL format under `~/.codex/sessions/`, but there is no `extract_codex.py` module and the `run_extraction.py` `--source` argument does not accept `codex`. Codex sessions are therefore excluded from the unified chat history archive.

## Discovery (Dry-Run Investigation — 2026-06-12)

A dry-run investigation of the Codex CLI log format was completed on 2026-06-12 without touching any implementation files. Findings:

### Log File Location and Naming

- Base path: `~/.codex/sessions/YYYY/MM/DD/`
- Filename pattern: `rollout-YYYY-MM-DDTHH-MM-SS-{uuid}.jsonl`
- Date is encoded in both the directory path and the filename timestamp
- One `.jsonl` file = one Codex session

### Event Types per File

| Event type | Count per file | Action |
|---|---|---|
| `session_meta` | 1 (always first) | Extract metadata |
| `response_item` | Many | Extract `user` and `assistant` turns |
| `event_msg` | Variable | Skip (tool events) |
| `turn_context` | Variable | Skip (context injections) |

### `session_meta` Payload Fields

- `cwd` — working directory at session start
- `originator` — who launched the session
- `cli_version` — Codex CLI version string
- `model_provider` — e.g., `openai`
- `git.branch` — git branch at session start
- `git.commit_hash` — HEAD commit hash at session start

### `response_item` Extraction Rules

Extract these roles:
- `user` with `content_type: input_text` — human turn
- `assistant` with `content_type: output_text` — model reply

Skip these roles:
- `developer` — system/permissions injections (tool definitions, capability grants)
- anonymous role with `encrypted_content` — tool call payloads (encrypted, not readable)

### Output File Convention

Extracted output follows the existing per-date naming pattern: `YYYY-MM-DD-codex.md`

## Scope

### In Scope

1. New `core/scripts/extract_codex.py` module implementing `extract_codex_sessions()` with the same signature convention as `extract_claude_sessions()` and `extract_all_gemini()`
2. Patch `core/scripts/run_extraction.py`:
   - Add `codex` to `--source` choices: `['all', 'claude', 'gemini', 'codex']`
   - Add `if args.source in ['all', 'codex']:` dispatch block
   - Import `extract_codex_sessions` alongside existing imports
3. Update `commands/extract-chat.md` (requires explicit user permission per PROTECTED-file rule):
   - Add `-codex` flag to Usage section
   - Add `Codex History Files` subsection to Output Format
   - Add Example for `-codex` extraction
   - Update `--source` description in How it works

### Out of Scope

- Encrypted tool call payloads (`encrypted_content`) — skip without attempting decryption
- Codex project filtering (analogous to Claude's `--project` flag) — defer to a follow-on
- `split_file_if_oversized` integration — reuse the existing base class call site pattern (same as Claude/Gemini extractors)

## Implementation Notes

- The `extract_codex.py` module should subclass or import from `chat_extractor_base.py` for `get_output_path` and `split_file_if_oversized` — same pattern as `extract_claude.py` and `extract_gemini.py`
- Date filtering (`--date`, `--after`, `--before`, `--today`) should work via directory path scanning (`~/.codex/sessions/YYYY/MM/DD/`) — efficient because the date is encoded in the path
- Session ID for deduplication: use the `{uuid}` portion of the filename
- `session_meta` fields (`cwd`, `git.branch`) provide useful header metadata for each extracted session block

## Open Questions

1. Should `-codex` be included in `all` by default immediately, or gated behind an explicit flag until the extractor is validated?
2. Should `session_meta.cwd` and `session_meta.git.branch` appear in the markdown output header per session?
3. Does `--project` filtering apply to Codex via `session_meta.cwd` path matching?

## Related

- `core/scripts/run_extraction.py` — add `codex` to `--source` choices and dispatch block
- `core/scripts/extract_claude.py` — reference implementation for new module
- `core/scripts/extract_gemini.py` — reference implementation for new module
- `commands/extract-chat.md` — PROTECTED: requires explicit user permission for edits
- ADR-044 — Split Oversized Daily Chat History Files (applies to Codex output too)
