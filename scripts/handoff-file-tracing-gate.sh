#!/usr/bin/env bash
# handoff-file-tracing-gate.sh — Stop hook: block session end if a handoff
# package's own embedded manifest names files that weren't all opened this
# session (issue-33's first gap: pointer-layer-only reading).
#
# ADR-068 pilot. Deliberate departure from this repo's advisory-only (exit 0
# always) hook convention — every other hook in scripts/, including the
# PreToolUse gates, only ever exits 0 (confirmed by grep during this plan's
# review). This hook exits 2 (blocking) when a START-HERE.md-pattern file was
# read this session AND its embedded manifest names files that were never
# Read in the same session. Fails open (exit 0) whenever no such file was
# read — never blocks a session that never touched a handoff package.
#
# No separate flag file: the manifest lives inside the handoff artifact
# itself (embedded by commands/kmg-handoff.md), because the session that
# produces a handoff package and the session that consumes it are two
# different sessions with two different session_ids — a flag file keyed to
# either session_id would be invisible to the other.

set -euo pipefail

INPUT=$(cat)

TRANSCRIPT_PATH=""
if command -v jq &>/dev/null; then
  TRANSCRIPT_PATH=$(printf '%s' "$INPUT" | jq -r '.transcript_path // ""' 2>/dev/null || true)
fi

# Fail open: no transcript, no jq — nothing to check against.
if [[ -z "$TRANSCRIPT_PATH" ]] || [[ ! -f "$TRANSCRIPT_PATH" ]] || ! command -v jq &>/dev/null; then
  exit 0
fi

# Real transcripts nest tool_use entries under .message.content[] — verified
# against a live transcript file, not the flat shape an earlier draft assumed.
READ_FILES=$(jq -r 'select(.message.content != null) | .message.content[]? | select(.type == "tool_use" and .name == "Read") | .input.file_path // empty' "$TRANSCRIPT_PATH" 2>/dev/null || true)

[[ -z "$READ_FILES" ]] && exit 0

STARTHERE_PATH=$(printf '%s\n' "$READ_FILES" | grep -F "START-HERE.md" | tail -1 || true)

# Fail open: no handoff-package file was opened this session — check never fires.
[[ -z "$STARTHERE_PATH" ]] && exit 0
[[ ! -f "$STARTHERE_PATH" ]] && exit 0

MANIFEST_JSON=$(awk '/<!-- kmgraph-handoff-manifest/{flag=1; next} /-->/{flag=0} flag' "$STARTHERE_PATH" | grep -v '```' || true)
[[ -z "$MANIFEST_JSON" ]] && exit 0

MANIFEST_FILES=$(printf '%s' "$MANIFEST_JSON" | jq -r '.[]?' 2>/dev/null || true)
[[ -z "$MANIFEST_FILES" ]] && exit 0

MISSING=""
while IFS= read -r manifest_file; do
  [[ -z "$manifest_file" ]] && continue
  if ! printf '%s\n' "$READ_FILES" | grep -qxF "$manifest_file"; then
    MISSING="${MISSING}${manifest_file}"$'\n'
  fi
done <<< "$MANIFEST_FILES"

[[ -z "$MISSING" ]] && exit 0

MSG="HANDOFF FILE-TRACING GATE: the following linked file(s) from this session's handoff package were never opened:
${MISSING}
Open every file above before finalizing a \"caught up\" summary — reading only the pointer layer is exactly the gap issue-33 documented. This check is mechanical (was the file opened, not whether it was understood) per ADR-068's Non-Goals."

echo "$MSG" >&2
exit 2
