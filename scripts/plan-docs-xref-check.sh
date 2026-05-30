#!/usr/bin/env bash
# plan-docs-xref-check.sh — PostToolUse:Write|Edit hook
#
# Fires after writing or editing a plan file under *plans/*.md.
# Checks for a "## Docs Impact" heading (required by ADR-013).
# Outputs an advisory systemMessage if the heading is absent.
# Idempotency: per-file-content-hash; re-fires only when file content changes.
# Does not block — always exits 0.

set -euo pipefail

INPUT=$(cat)

# Extract file path via jq; fallback to grep when jq absent
if command -v jq &>/dev/null; then
  FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // ""' 2>/dev/null || true)
else
  FILE_PATH=$(printf '%s' "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)"/\1/' || true)
fi

# Only proceed for plan files
[[ "$FILE_PATH" == *"plans/"*.md ]] || exit 0

# Skip silently when file doesn't exist
[ -f "$FILE_PATH" ] || exit 0

# If heading present → silent, done
grep -q "^## Docs Impact$" "$FILE_PATH" && exit 0

# Heading absent — compute content hash for idempotency
if command -v md5 &>/dev/null; then
  CONTENT_HASH=$(md5 < "$FILE_PATH")
elif command -v md5sum &>/dev/null; then
  CONTENT_HASH=$(md5sum < "$FILE_PATH" | cut -d' ' -f1)
else
  CONTENT_HASH=$(cksum < "$FILE_PATH" | cut -d' ' -f1)
fi

# Compute path hash to namespace the flag file
if command -v md5 &>/dev/null; then
  PATH_HASH=$(printf '%s' "$FILE_PATH" | md5)
elif command -v md5sum &>/dev/null; then
  PATH_HASH=$(printf '%s' "$FILE_PATH" | md5sum | cut -d' ' -f1)
else
  PATH_HASH=$(printf '%s' "$FILE_PATH" | cksum | cut -d' ' -f1)
fi

HASH_FILE="/tmp/kmgraph-plan-xref-${PATH_HASH}.hash"
CACHED_HASH=""
[ -f "$HASH_FILE" ] && CACHED_HASH=$(cat "$HASH_FILE")

# Same content as last injection → skip
if [ "$CONTENT_HASH" = "$CACHED_HASH" ]; then
  exit 0
fi

# Update cached hash before injecting
printf '%s' "$CONTENT_HASH" > "$HASH_FILE"

MSG='--- Plan Docs Impact Check (advisory) ---
This plan file does not contain a "## Docs Impact" section.
ADR-013 requires all plan files to list affected user-facing docs under this heading.
Add a "## Docs Impact" section identifying which docs/ pages need updating for this change.
--- End Check ---'

if command -v jq &>/dev/null; then
  jq -n --arg msg "$MSG" '{"systemMessage": $msg}'
else
  printf '%s\n' "$MSG"
fi

exit 0
