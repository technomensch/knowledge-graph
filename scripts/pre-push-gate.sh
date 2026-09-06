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
# Gate 8 — docs-build broken-link check (issue-13, advisory only):
#   Runs `npm run build` (Docusaurus) and surfaces broken-link warnings
#   (onBrokenLinks: 'warn' in docusaurus.config.js -- this gate does not flip
#   that to 'throw'; issue-13's own text says that must wait until link
#   clusters 2+3 are fixed first, or CI hard-fails on unrelated pre-existing
#   breaks). Bounded by a timeout since a full build inside a PreToolUse hook
#   otherwise adds real latency to every push; the build runs as a background
#   job with its exit captured via `wait ... || VAR=$?`, so a nonzero/killed
#   build can't abort the rest of this script under `set -e` (same guard
#   idiom Gate 4b uses via command substitution).
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

  # Advisory: CHANGELOG's latest release header should match package.json.
  # Anchor-compare against the top ## [X.Y.Z] header, not a substring search
  # across the whole file — a presence check matches ANY historical mention
  # of the version string (e.g. inside an older changelog-style entry),
  # which silently passes even when the real "current version" is stale.
  CHANGELOG="${REPO_ROOT}/CHANGELOG.md"
  if [ -n "$PKG_VER" ] && [ -f "$CHANGELOG" ]; then
    CHANGELOG_VER=$(grep -m1 -E '^## \[[0-9]' "$CHANGELOG" 2>/dev/null | sed -E 's/^## \[([0-9A-Za-z.+-]+)\].*/\1/')
    if [ -z "$CHANGELOG_VER" ]; then
      FINDINGS="${FINDINGS}CHANGELOG ADVISORY: no versioned release header (## [X.Y.Z]) found. Add a release entry before pushing.
"
    elif [ "$PKG_VER" != "$CHANGELOG_VER" ]; then
      FINDINGS="${FINDINGS}CHANGELOG ADVISORY: latest release header is [${CHANGELOG_VER}], but package.json is ${PKG_VER}. Add/update the release entry before pushing.
"
    fi
  fi

  # Advisory: README's version declaration lines should match package.json.
  # Same anchor-compare fix as CHANGELOG above — checks the actual
  # **Version:** and **Current Version:** declaration lines, not a
  # substring search that can match a stale historical mention elsewhere
  # in the file (the exact miss that let a real README drift ship silently:
  # a changelog-style entry inside README.md happened to contain the current
  # version string while both real declaration lines were stale).
  README="${REPO_ROOT}/README.md"
  if [ -n "$PKG_VER" ] && [ -f "$README" ]; then
    README_VER=$(grep -m1 -E '^\*\*Version:\*\*' "$README" 2>/dev/null | sed -E 's/^\*\*Version:\*\* *v?//')
    README_CURRENT_VER=$(grep -m1 -E '^\*\*Current Version:\*\*' "$README" 2>/dev/null | sed -E 's/^\*\*Current Version:\*\* *v?([0-9.]+).*/\1/')
    if [ -z "$README_VER" ] && [ -z "$README_CURRENT_VER" ]; then
      FINDINGS="${FINDINGS}README ADVISORY: no '**Version:**' or '**Current Version:**' declaration line found. Update the version reference before pushing.
"
    else
      if [ -n "$README_VER" ] && [ "$PKG_VER" != "$README_VER" ]; then
        FINDINGS="${FINDINGS}README ADVISORY: '**Version:**' line reads ${README_VER}, but package.json is ${PKG_VER}. Update the version line before pushing.
"
      fi
      if [ -n "$README_CURRENT_VER" ] && [ "$PKG_VER" != "$README_CURRENT_VER" ]; then
        FINDINGS="${FINDINGS}README ADVISORY: '**Current Version:**' line reads ${README_CURRENT_VER}, but package.json is ${PKG_VER}. Update the version line before pushing.
"
      fi
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
# Note (issue-52, comment-only, 2026-09-05): issue-52 researches a related but
# distinct gap -- superpowers:brainstorming-originated specs still bypassing
# kmg-start-issue-tracking's GitHub-issue creation entirely (this gate only
# checks sync for docs that already claim a github-issue field, not whether
# one was ever created). Track-only/research, no fix decided yet as of this
# note -- see knowledge/issues/issue-52/issue-52-description.md before
# touching this gate next, to avoid re-doing the hotspot discovery work.

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

# ── Gate 8: docs-build broken-link check (issue-13, advisory only) ────────────
# Note: Gate numbers stay in original discovery order (7 already exists below
# this historically); placed here so it runs alongside the other content
# checks rather than reordering existing gates.
#
# Corrected 2026-09-05 (Opus review): DOCS_BUILD_TIMEOUT_SECS must stay well
# under this hook's own PreToolUse timeout (hooks/hooks.json, currently 90s --
# raised from 10s in the same pass, since 10s left ~0 margin for a real build
# plus every other gate). If this script is ever killed externally before it
# reaches the emit block below, Gates 2-7's output is lost too, not just
# Gate 8's -- so the internal bound must be the one that actually fires.
#
# Corrected 2026-09-05 (2nd Opus review): this script is distributed via
# ${CLAUDE_PLUGIN_ROOT}/scripts/ and fires in every consumer project that
# installs this plugin, not just this repo -- REPO_ROOT above resolves to
# whatever project the hook runs in. Raising the hook timeout to 90s (this
# same pass) widened the exposure: any consumer repo with its own `npm run
# build` script would otherwise run it (looking for a Docusaurus-specific
# "broken link" string that will never appear there) on every single push,
# for up to 76s, for no benefit. Gate 8 is specifically a Docusaurus
# broken-link check (issue-13's own scope) -- guard it on this repo actually
# being a Docusaurus site, same graceful-no-op-when-absent convention as
# every other optional check in this file (Gate 4/4b's `[ -x ... ]` guards).

if [ -f "$REPO_ROOT/docusaurus.config.js" ]; then

DOCS_BUILD_TIMEOUT_SECS=75
DOCS_BUILD_LOG=$(mktemp 2>/dev/null || printf '/tmp/kmgraph-docs-build-%s.log' "$$")

( cd "$REPO_ROOT" && npm run build > "$DOCS_BUILD_LOG" 2>&1 ) &
DOCS_BUILD_PID=$!
DOCS_BUILD_ELAPSED=0
DOCS_BUILD_TIMED_OUT=false
while kill -0 "$DOCS_BUILD_PID" 2>/dev/null; do
  if [ "$DOCS_BUILD_ELAPSED" -ge "$DOCS_BUILD_TIMEOUT_SECS" ]; then
    DOCS_BUILD_TIMED_OUT=true
    # Kill the build's actual child (npm/docusaurus) first -- the backgrounded
    # job above is a subshell wrapper, so killing only its PID orphans the
    # real build process instead of stopping it.
    pkill -P "$DOCS_BUILD_PID" 2>/dev/null || true
    kill "$DOCS_BUILD_PID" 2>/dev/null || true
    break
  fi
  sleep 2
  DOCS_BUILD_ELAPSED=$((DOCS_BUILD_ELAPSED + 2))
done

DOCS_BUILD_EXIT=0
wait "$DOCS_BUILD_PID" 2>/dev/null || DOCS_BUILD_EXIT=$?
DOCS_BUILD_OUT=$(cat "$DOCS_BUILD_LOG" 2>/dev/null || true)
rm -f "$DOCS_BUILD_LOG" 2>/dev/null || true

if [ "$DOCS_BUILD_TIMED_OUT" = true ]; then
  FINDINGS="${FINDINGS}DOCS BUILD ADVISORY: npm run build did not finish within ${DOCS_BUILD_TIMEOUT_SECS}s and was killed. Broken-link check skipped for this push -- run 'npm run build' locally to check manually.
"
elif [ "$DOCS_BUILD_EXIT" -ne 0 ]; then
  FINDINGS="${FINDINGS}DOCS BUILD ADVISORY: npm run build failed (exit ${DOCS_BUILD_EXIT}). Broken-link check skipped for this push -- run 'npm run build' locally to see the full error.
"
else
  # Anchor to Docusaurus's actual per-link bullet format ("- Broken link on
  # source page path = ..."), not a loose 'broken link' substring match --
  # the latter also matches the build's own header/note lines ("[WARNING]
  # Docusaurus found broken links!", "Note: it's possible to ignore..."),
  # wasting slots in the capped display below on boilerplate instead of
  # actual per-link entries.
  DOCS_BROKEN_LINKS=$(printf '%s' "$DOCS_BUILD_OUT" | grep -E '^- Broken link on source page' || true)
  if [ -n "$DOCS_BROKEN_LINKS" ]; then
    DOCS_BROKEN_COUNT=$(printf '%s\n' "$DOCS_BROKEN_LINKS" | grep -c . || true)
    # Cap displayed lines -- ENH-052's own documented caution applies here too
    # ("a checker that produces false positives erodes trust... gets ignored
    # just as fast as a silent one"): a known, currently-unfixable set of
    # links (issue-13's clusters 2+3, deliberately deferred) would otherwise
    # repeat in full on every single push. Note the volume rather than
    # silently truncating, matching kmg-paperwork-audit's own house style
    # for large-output edge cases.
    DOCS_BROKEN_SHOWN=$(printf '%s\n' "$DOCS_BROKEN_LINKS" | head -5)
    # Each matched line names one source PAGE with at least one broken link,
    # not one broken link -- Docusaurus lists the actual target(s) on
    # indented sub-lines beneath each page. Label accordingly so the count
    # doesn't overstate/understate what it's actually counting.
    FINDINGS="${FINDINGS}DOCS BUILD ADVISORY: ${DOCS_BROKEN_COUNT} page(s) with broken link(s) detected by 'npm run build' (onBrokenLinks: warn, not blocking) -- showing first 5:
${DOCS_BROKEN_SHOWN}
"
    if [ "$DOCS_BROKEN_COUNT" -gt 5 ]; then
      FINDINGS="${FINDINGS}  ... and $((DOCS_BROKEN_COUNT - 5)) more. Run 'npm run build' locally for the full list.
"
    fi
  fi
fi

fi # end: docusaurus.config.js guard

# ── Gate 7: numbering collision detection (ADR-067 § Mechanism resolved 2026-08-23) ──

NUMBERING_CHECK="${REPO_ROOT}/scripts/check-numbering-collision.sh"
if [ -x "$NUMBERING_CHECK" ]; then
  NUMBERING_FINDINGS=$("$NUMBERING_CHECK" --findings 2>/dev/null || true)
  if [ -n "$NUMBERING_FINDINGS" ]; then
    FINDINGS="${FINDINGS}${NUMBERING_FINDINGS}
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
