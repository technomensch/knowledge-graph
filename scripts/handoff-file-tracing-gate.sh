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
HOOK_CWD=""
if command -v jq &>/dev/null; then
  TRANSCRIPT_PATH=$(printf '%s' "$INPUT" | jq -r '.transcript_path // ""' 2>/dev/null || true)
  HOOK_CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // ""' 2>/dev/null || true)
fi
[[ -z "$HOOK_CWD" || ! -d "$HOOK_CWD" ]] && HOOK_CWD="$(pwd)"

# Anchor for the manifest's relative paths (see loop below). issue-43: inside
# a git worktree CLAUDE_PROJECT_DIR resolves to the MAIN checkout, not the
# worktree, so anchoring there re-creates issue-42's can-never-match shape
# against the transcript's in-worktree absolute Read paths. git rev-parse
# --show-toplevel is worktree-aware (each worktree is its own toplevel; only
# --git-common-dir is shared), so it gets first precedence — run against the
# session's cwd from the hook input, not this process's cwd, which is not
# guaranteed to be inside the worktree. CLAUDE_PROJECT_DIR remains the
# fallback for non-git contexts only.
REPO_ROOT="$(git -C "$HOOK_CWD" rev-parse --show-toplevel 2>/dev/null || echo "${CLAUDE_PROJECT_DIR:-$HOOK_CWD}")"

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

# issue-44: handoff-packages/ is gitignored, so a manifest generated in one
# checkout (main or a different worktree) is never present under a REPO_ROOT
# resolved from wherever THIS session happens to be running -- no anchor
# fixes that, the referenced files just aren't there. STARTHERE_PATH is the
# transcript's own absolute Read path for the file that WAS actually opened,
# so it names the package's true root directly, with no git call and no
# symlink-normalization risk (the same class of mismatch issue-42/43 fixed).
PKG_ROOT=""
if [[ "$STARTHERE_PATH" == */handoff-packages/* ]]; then
  PKG_ROOT="${STARTHERE_PATH%/handoff-packages/*}"
fi

MANIFEST_JSON=$(awk '/<!-- kmgraph-handoff-manifest/{flag=1; next} /-->/{flag=0} flag' "$STARTHERE_PATH" | grep -v '```' || true)
[[ -z "$MANIFEST_JSON" ]] && exit 0

MANIFEST_FILES=$(printf '%s' "$MANIFEST_JSON" | jq -r '.[]?' 2>/dev/null || true)
[[ -z "$MANIFEST_FILES" ]] && exit 0

MISSING=""
while IFS= read -r manifest_file; do
  [[ -z "$manifest_file" ]] && continue
  # Manifest paths are written relative to REPO_ROOT (commands/kmg-handoff.md's
  # output_dir is "./handoff-packages/..."), but Read always records an
  # absolute path in the transcript — an exact-string match against
  # READ_FILES here would never succeed even when the file genuinely was
  # opened. Anchor relative manifest paths at REPO_ROOT before comparing;
  # leave an already-absolute manifest path (e.g. a summary_file found
  # outside the repo tree) untouched.
  if [[ "$manifest_file" == /* ]]; then
    resolved_manifest_file="$manifest_file"
  else
    resolved_manifest_file="${REPO_ROOT}/${manifest_file#./}"
    # issue-44: gitignored handoff-package files don't exist under REPO_ROOT
    # when the package was generated somewhere else (main checkout, a
    # different worktree). Fall back to the package's actual root, derived
    # from STARTHERE_PATH above, before giving up on this file.
    if [[ ! -f "$resolved_manifest_file" && -n "$PKG_ROOT" && "$PKG_ROOT" != "$REPO_ROOT" ]]; then
      resolved_manifest_file="${PKG_ROOT}/${manifest_file#./}"
    fi
  fi
  if ! printf '%s\n' "$READ_FILES" | grep -qxF "$resolved_manifest_file"; then
    MISSING="${MISSING}${manifest_file}"$'\n'
  fi
done <<< "$MANIFEST_FILES"

[[ -z "$MISSING" ]] && exit 0

MSG="HANDOFF FILE-TRACING GATE: the following linked file(s) from this session's handoff package were never opened:
${MISSING}
Open every file above before finalizing a \"caught up\" summary — reading only the pointer layer is exactly the gap issue-33 documented. This check is mechanical (was the file opened, not whether it was understood) per ADR-068's Non-Goals."

echo "$MSG" >&2
exit 2
