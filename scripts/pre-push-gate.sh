#!/usr/bin/env bash
# pre-push-gate.sh — PreToolUse:Bash hook
#
# Fires before any Bash tool call. Acts only when the command contains
# the 'git push' token — non-interference with pre-commit-knowledge-gate.sh
# (which matches 'git commit'). Handles chained commands (git commit && git push).
#
# Gate 2 — Version sync:
#   Compares version in package.json against .claude-plugin/plugin.json,
#   .codex-plugin/plugin.json, and .claude-plugin/marketplace.json's embedded
#   plugin entry via jq. Also checks mcp-server/package.json, but only when
#   mcp-server/src/ actually changed on this branch — mcp-server versions in
#   lockstep with the plugin release whenever its source changes (every
#   recent release per CHANGELOG.md), so treating it as unconditionally
#   independent was itself a source of drift. Emits drift message on
#   mismatch. Advisory CHANGELOG version-presence check. README/INSTALL
#   checks are advisory with ENH-016 silent skip when absent.
#
# Gate 3 — docs-impact-scan completion flag:
#   Checks for /tmp/kmgraph-docs-scan-<branch>-<sha>.flag written by the
#   kmgraph:kmg-docs-impact-scan skill (Step 8). Injects reminder when absent.
#   Detached-HEAD fallback: SHA-only flag name.
#
# Gate 5 — KG index-count drift + backlink symmetry (ENH-052):
#   Compares each knowledge/<area>/README.md's declared "Total X" count
#   against the real directory count. Also checks, for issue/ENH docs changed
#   on this branch, whether every cross-reference to another issue/ENH is
#   reciprocated by a backlink in the referenced doc. Both mechanically
#   checkable — no LLM judgment required, so they belong in the hook, not a
#   skill; see rationale below.
#
# Gate 6 — Paperwork-audit completion flag (ENH-052):
#   Same flag-file pattern as Gate 3, for the parts of ENH-052's scope that
#   DO require judgment (issue status: resolved accuracy, session-summary
#   currency) and can't be mechanically verified in bash. A companion skill
#   (not yet built) would write the completion flag after running.
#
# Why gates, not a smarter skill (ADR-043, ADR-050):
#   ADR-043: "Previous fix attempts via CLAUDE.md edits and ADRs failed
#   because they depend on model attention during skill execution — the
#   skill's structured checklist dominates." ADR-050 (Gate 3's own origin):
#   "the kmgraph:docs-impact-scan skill is not wired as a pre-push gate; a
#   push can happen without the scan ever running." Both times this project
#   tried phrase-triggered skill enforcement first, found it unreliable, and
#   replaced it with a PreToolUse hook matched on the actual git command —
#   deterministic, not dependent on the model recognizing a trigger phrase.
#   Gates 5/6 follow the same pattern rather than repeating the known failure
#   mode as a "smarter" docs-impact-scan.
#
# Output channel: hookSpecificOutput.additionalContext (PreToolUse event).
# Advisory injection only — always exits 0, never blocks the push.

set -euo pipefail

INPUT=$(cat)

# ── Parse command ─────────────────────────────────────────────────────────────

if command -v jq &>/dev/null; then
  BASH_CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null || true)
else
  # Graceful fallback when jq absent
  BASH_CMD=$(printf '%s' "$INPUT" \
    | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 \
    | sed 's/.*"\([^"]*\)".*/\1/' || true)
fi

# Act only when command contains 'git push' token
case "$BASH_CMD" in
  *"git push"*)
    : # proceed
    ;;
  *)
    exit 0
    ;;
esac

# Exclude --dry-run (advisory gate — not needed for dry runs)
case "$BASH_CMD" in
  *"--dry-run"*)
    exit 0
    ;;
esac

FINDINGS=""

# ── Gate 2: Version sync ──────────────────────────────────────────────────────

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || true)}"
PKG_JSON="${REPO_ROOT}/package.json"
PLUGIN_JSON="${REPO_ROOT}/.claude-plugin/plugin.json"

CODEX_PLUGIN_JSON="${REPO_ROOT}/.codex-plugin/plugin.json"
MARKETPLACE_JSON="${REPO_ROOT}/.claude-plugin/marketplace.json"
MCP_PKG_JSON="${REPO_ROOT}/mcp-server/package.json"

if [ -f "$PKG_JSON" ] && command -v jq &>/dev/null; then
  PKG_VER=$(jq -r '.version // ""' "$PKG_JSON" 2>/dev/null || true)

  # Compare package.json against every other file that should carry the same
  # plugin version. Each entry: "label|path|jq filter for the version field".
  VERSION_TARGETS="plugin.json|${PLUGIN_JSON}|.version
codex-plugin.json|${CODEX_PLUGIN_JSON}|.version
marketplace.json (embedded plugin entry)|${MARKETPLACE_JSON}|.plugins[0].version"

  while IFS='|' read -r LABEL TARGET_PATH JQ_FILTER; do
    [ -n "$LABEL" ] || continue
    [ -f "$TARGET_PATH" ] || continue
    TARGET_VER=$(jq -r "${JQ_FILTER} // \"\"" "$TARGET_PATH" 2>/dev/null || true)
    if [ -n "$PKG_VER" ] && [ -n "$TARGET_VER" ] && [ "$PKG_VER" != "$TARGET_VER" ]; then
      FINDINGS="${FINDINGS}VERSION DRIFT: package.json (${PKG_VER}) and ${LABEL} (${TARGET_VER}) disagree. Sync before pushing.
"
    fi
  done <<< "$VERSION_TARGETS"

  # mcp-server/package.json versions in lockstep with the plugin release
  # whenever mcp-server/src/ actually changes — only check it then, to avoid
  # false-flagging a legitimately-unversioned mcp-server on unrelated pushes.
  DEFAULT_BRANCH=""
  for candidate in main master; do
    if git show-ref --verify --quiet "refs/heads/${candidate}" 2>/dev/null; then
      DEFAULT_BRANCH="$candidate"
      break
    fi
  done
  if [ -n "$DEFAULT_BRANCH" ] && [ -f "$MCP_PKG_JSON" ]; then
    MERGE_BASE=$(git merge-base "$DEFAULT_BRANCH" HEAD 2>/dev/null || true)
    if [ -n "$MERGE_BASE" ]; then
      MCP_SRC_CHANGED=$(git diff --name-only "$MERGE_BASE" HEAD -- 'mcp-server/src/' 2>/dev/null | wc -l | tr -d ' ')
      if [ "${MCP_SRC_CHANGED:-0}" -gt 0 ]; then
        MCP_VER=$(jq -r '.version // ""' "$MCP_PKG_JSON" 2>/dev/null || true)
        if [ -n "$PKG_VER" ] && [ -n "$MCP_VER" ] && [ "$PKG_VER" != "$MCP_VER" ]; then
          FINDINGS="${FINDINGS}VERSION DRIFT: mcp-server/src/ changed on this branch but mcp-server/package.json (${MCP_VER}) doesn't match package.json (${PKG_VER}). Sync before pushing.
"
        fi
      fi
    fi
  fi

  # Advisory: CHANGELOG should reference the version being pushed
  CHANGELOG="${REPO_ROOT}/CHANGELOG.md"
  if [ -n "$PKG_VER" ] && [ -f "$CHANGELOG" ]; then
    if ! grep -qF "$PKG_VER" "$CHANGELOG" 2>/dev/null; then
      FINDINGS="${FINDINGS}CHANGELOG ADVISORY: version ${PKG_VER} not found in CHANGELOG.md. Add a release entry before pushing.
"
    fi
  fi

  # Advisory: README should reference the version being pushed
  README="${REPO_ROOT}/README.md"
  if [ -n "$PKG_VER" ] && [ -f "$README" ]; then
    if ! grep -qF "$PKG_VER" "$README" 2>/dev/null; then
      FINDINGS="${FINDINGS}README ADVISORY: version ${PKG_VER} not found in README.md. Update the version reference before pushing.
"
    fi
  fi
fi

# ── Gate 3: docs-impact-scan completion flag ──────────────────────────────────

BRANCH=$(git branch --show-current 2>/dev/null | tr '/' '-' || true)
SHA=$(git rev-parse --short HEAD 2>/dev/null || true)

if [ -n "$BRANCH" ] && [ -n "$SHA" ]; then
  SCAN_FLAG="/tmp/kmgraph-docs-scan-${BRANCH}-${SHA}.flag"
elif [ -n "$SHA" ]; then
  # Detached-HEAD fallback
  SCAN_FLAG="/tmp/kmgraph-docs-scan-${SHA}.flag"
else
  SCAN_FLAG=""
fi

if [ -n "$SCAN_FLAG" ] && [ ! -f "$SCAN_FLAG" ]; then
  FINDINGS="${FINDINGS}STOP: docs-impact-scan has not run on this branch at this commit. Invoke the kmgraph:kmg-docs-impact-scan skill before pushing, or confirm no user-facing docs are affected.
"
fi

# ── Gate 4: github-issue-sync invariant (issue-11) ────────────────────────────

SYNC_CHECK="${REPO_ROOT}/scripts/check-github-issue-sync.sh"
if [ -x "$SYNC_CHECK" ]; then
  SYNC_FINDINGS=$("$SYNC_CHECK" --findings 2>/dev/null || true)
  if [ -n "$SYNC_FINDINGS" ]; then
    FINDINGS="${FINDINGS}${SYNC_FINDINGS}
"
  fi
fi

# ── Gate 4b: kmg-create-adr dual-implementation regression guard (issue-48) ───

ADR_DISPATCH_CHECK="${REPO_ROOT}/scripts/check-adr-command-dispatch.sh"
if [ -x "$ADR_DISPATCH_CHECK" ]; then
  ADR_DISPATCH_OUT=$("$ADR_DISPATCH_CHECK" 2>&1) || FINDINGS="${FINDINGS}${ADR_DISPATCH_OUT}
"
fi

# ── Gate 5: KG index-count drift + backlink symmetry (ENH-052) ────────────────

# Index-count drift: declared "Total X" in each area's README vs real count.
check_kg_index_count() {
  local area="$1" label="$2" find_args_str="$3"
  local readme="${REPO_ROOT}/knowledge/${area}/README.md"
  [ -f "$readme" ] || return 0
  local declared
  declared=$(grep -m1 "\*\*${label}:\*\*" "$readme" 2>/dev/null | grep -oE '[0-9]+' | head -1)
  [ -n "$declared" ] || return 0
  local actual
  # shellcheck disable=SC2086
  actual=$(eval find "${REPO_ROOT}/knowledge/${area}" ${find_args_str} 2>/dev/null | wc -l | tr -d ' ')
  if [ -n "$actual" ] && [ "$declared" != "$actual" ]; then
    FINDINGS="${FINDINGS}KG INDEX DRIFT: knowledge/${area}/README.md declares ${label} ${declared}, actual count is ${actual}. This means real entries are missing from the chronological list, not just a stale number — find and add each missing entry, don't just edit the count to match.
"
  fi
}

check_kg_index_count "decisions"       "Total ADRs"   "-maxdepth 1 -iname 'ADR-*.md'"
check_kg_index_count "enhancements"    "Total ENHs"   "-maxdepth 1 -type d -iname 'ENH-*'"
check_kg_index_count "issues"          "Total Issues" "-maxdepth 1 -type d -iname 'issue-*'"
check_kg_index_count "lessons-learned" "Total Lessons" "-mindepth 2 -iname 'Lessons_Learned_*.md'"

# Backlink symmetry: for issue/ENH docs changed on this branch, does every
# cross-reference to another issue/ENH get reciprocated? Scoped to the
# branch's own diff (not the whole KG) to keep this cheap on every push.
if [ -n "${DEFAULT_BRANCH:-}" ] && [ -n "${MERGE_BASE:-}" ]; then
  CHANGED_KG_DOCS=$(git diff --name-only "$MERGE_BASE" HEAD -- \
    'knowledge/issues/*/issue-*-description.md' \
    'knowledge/enhancements/*/ENH-*-specification.md' 2>/dev/null || true)

  if [ -n "$CHANGED_KG_DOCS" ]; then
    while IFS= read -r doc; do
      [ -n "$doc" ] || continue
      [ -f "${REPO_ROOT}/${doc}" ] || continue
      SELF_REF=$(basename "$doc" | grep -oE '^(issue-[0-9]+|ENH-[0-9]+)' | head -1)
      [ -n "$SELF_REF" ] || continue
      REFERENCED=$(grep -oE 'issue-[0-9]+|ENH-[0-9]+' "${REPO_ROOT}/${doc}" 2>/dev/null | sort -u || true)
      while IFS= read -r ref; do
        [ -n "$ref" ] && [ "$ref" != "$SELF_REF" ] || continue
        case "$ref" in
          issue-*) REF_DOC="${REPO_ROOT}/knowledge/issues/${ref}/${ref}-description.md" ;;
          ENH-*)   REF_DOC="${REPO_ROOT}/knowledge/enhancements/${ref}/${ref}-specification.md" ;;
          *) continue ;;
        esac
        [ -f "$REF_DOC" ] || continue
        if ! grep -qE "$SELF_REF" "$REF_DOC" 2>/dev/null; then
          FINDINGS="${FINDINGS}BACKLINK MISSING: ${doc} references ${ref}, but ${ref}'s own doc doesn't reference back.
"
        fi
      done <<< "$REFERENCED"
    done <<< "$CHANGED_KG_DOCS"
  fi
fi

# ── Gate 6: paperwork-audit completion flag (ENH-052) ──────────────────────────
# Same pattern as Gate 3. Judgment-requiring checks (issue status: resolved
# accuracy, session-summary currency) can't be verified in bash — a companion
# skill (not yet built) would write this flag after running.

if [ -n "$SCAN_FLAG" ]; then
  PAPERWORK_FLAG="${SCAN_FLAG/docs-scan/paperwork-audit}"
  if [ ! -f "$PAPERWORK_FLAG" ]; then
    FINDINGS="${FINDINGS}REMINDER: paperwork-audit has not run on this branch at this commit (ENH-052 — issue status accuracy, session-summary currency). Run it before pushing, or confirm not applicable.
"
  fi
fi

# ── Emit ──────────────────────────────────────────────────────────────────────

[ -z "$FINDINGS" ] && exit 0

# Trim trailing newline
FINDINGS=$(printf '%s' "$FINDINGS" | sed 's/[[:space:]]*$//')

if command -v jq &>/dev/null; then
  jq -n \
    --arg ctx "$FINDINGS" \
    '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "additionalContext": $ctx
      }
    }'
else
  printf '%s\n' "$FINDINGS"
fi

exit 0
