---
id: issue-59
type: Bug
status: deferred
github-issue: "#252"
branch: none
created: 2026-09-01
---

# Issue-59: Chat-Extraction Health Check False-Positives on Multi-Byte UTF-8 Metadata Read

## Summary

`check_extraction_health.py` (invoked by `/kmgraph:kmg-extract-chat`'s Step 0.5
first-run repair check, and independently by the extractor's own metadata-parse
step on re-run) flagged `2026-08-21-claude.md` as having corrupted metadata:

```
Warning: Could not parse metadata from
/Users/mkaplan/GitHub/knowledge-graph/knowledge/chat-history/2026-08/2026-08-21-claude.md:
'utf-8' codec can't decode byte 0x94 in position 0: invalid start byte
```

This triggered the extractor's `--rebuild`-style auto-repair path: the file was
overwritten and a timestamped backup was created
(`.2026-08-21-claude.md.bak-20260901T152649-53621`).

## Root Cause

Byte-for-byte comparison of the backup against the freshly-written file showed
they are **identical except for the `Export Generated` timestamp line** — no
message content was lost or different. The file was never actually corrupted.

The `0x94` byte the decoder choked on is not standalone garbage: it's the third
byte of a valid 3-byte UTF-8 em-dash sequence (`\xe2\x80\x94`, i.e. "—") that
appears inside ordinary message text at byte offset 1661 of the file
("...need the flag." — requires..."). The error message reports this as
"position 0," which suggests the metadata-parse routine reads/seeks a fixed
byte window (or byte offset) rather than decoding from a character-safe
boundary — landing mid-multibyte-character and raising a spurious
`UnicodeDecodeError`.

## Impact

- **Low severity, but causes unnecessary churn:** every date containing a
  message with an em-dash (or other multi-byte UTF-8 character) landing near
  a byte offset the metadata reader seeks to is at risk of being flagged
  "corrupted" and rewritten/backed-up even when nothing is wrong.
- Backups accumulate (`--rebuild` keeps up to 3 most recent per date) for
  files that were never actually damaged, adding manual cleanup work.
- Erodes trust in the extractor's health-check warnings — a real corruption
  signal could get lost in false-positive noise.

## Suspected Location

`check_extraction_health.py` and/or the metadata-read helper in
`chat_extractor_base.py` under
`core/scripts/` (see `/kmgraph:kmg-extract-chat` command doc, Step 0.5) —
wherever the "read installed/stamped version" or per-file metadata parse opens
the `.md` file and decodes a byte slice instead of the full file / a
character-safe slice.

## Proposed Fix Direction (not yet investigated in depth)

- Decode the whole file (or a chunk `.decode('utf-8', errors='ignore')`) rather
  than seeking to a fixed byte offset.
- Or read using a line-based / text-mode open so Python's UTF-8 stream decoder
  handles multi-byte boundaries correctly instead of raw byte-offset seeking.

## How Found

Discovered while reviewing a chat-extraction re-run for
`/kmgraph:kmg-extract-chat -claude -project=knowledge-graph` (August 2026,
worktrees included). User asked to check the auto-generated backup before
deleting it; diff showed no real content difference, prompting this write-up.

## Status

Filed as **Track only** (Mode 3, deferred) — no branch, no immediate
implementation. Low severity, workaround (backup diff-check before delete)
already applied this session.
