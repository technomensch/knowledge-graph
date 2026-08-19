#!/usr/bin/env bash
# check-adr-command-dispatch.sh — dual-implementation regression guard (issue-48)
#
# commands/kmg-create-adr.md and agents/create-adr-agent.md used to each
# independently build an ADR: derive a filename, assemble YAML frontmatter,
# write the file, update the index, and commit. issue-48 collapsed that to a
# single implementation (create-adr-agent.md) with the command reduced to a
# thin dispatch wrapper. This check fails if the command's markdown ever
# regains its own filename/frontmatter/write/commit logic — the same class
# of drift issue-48 fixed.
#
# Mode: report (default) — exit 1 with findings if the command re-embeds the
# old implementation (frontmatter, commit block, Step 4-7 headers, the old
# numbered wizard subsections, or a reintroduced context_provided: true) OR
# is missing the dispatch step; exit 0 otherwise.
#
# Two marker classes:
#   1. Verbatim literals from the pre-fix file — catch a wholesale revert.
#   2. Pattern-class markers — catch INCREMENTAL re-addition with new
#      phrasing, which is how issue-48's own root-cause analysis says the
#      drift actually happened. These are matched against non-negated lines
#      only, so boundary prose ("Do not re-implement the file write here")
#      does not trip them.

set -euo pipefail

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
TARGET="${REPO_ROOT}/commands/kmg-create-adr.md"

if [ ! -f "$TARGET" ]; then
  echo "check-adr-command-dispatch: SKIP — $TARGET not found" >&2
  exit 0
fi

FAIL=0
findings=()

# Markers that must be ABSENT — signatures of the old standalone implementation.
if grep -qF 'title: "ADR-{NNN}: {title}"' "$TARGET"; then
  findings+=("re-embeds YAML frontmatter construction (literal 'title: \"ADR-{NNN}: {title}\"' found)")
  FAIL=1
fi
if grep -qF 'git commit -m "docs(adr): create ADR-{NNN}' "$TARGET"; then
  findings+=("re-embeds a direct git commit block for the ADR file")
  FAIL=1
fi
if grep -qE '^## Step [4-7]:' "$TARGET"; then
  findings+=("re-embeds a numbered Step 4-7 (filename/write/index/commit) instead of dispatching")
  FAIL=1
fi
if grep -qE '^### 3\.[1-8] ' "$TARGET"; then
  findings+=("re-embeds the old inline wizard (numbered ### 3.N subsection found — the wizard now belongs entirely to create-adr-agent's own Phase 3)")
  FAIL=1
fi
# Tolerates quoting and `=` vs `:` — a JSON-shaped payload ("context_provided":
# true) or an assignment form (context_provided=true) is the same regression.
# The negation sentence (no `context_provided`) has no :/= + true after it and
# so does not match.
if grep -qE '["'"'"'`]?context_provided["'"'"'`]?[[:space:]]*[:=][[:space:]]*true' "$TARGET"; then
  findings+=("re-passes context_provided: true to create-adr-agent — this collapses the agent's own wizard, which is exactly the dual-implementation risk this fix removed (see plan Step 3's chosen resolution)")
  FAIL=1
fi

# --- Pattern-class markers: incremental re-addition with new phrasing ---
# Boundary prose that forbids something is not a re-implementation, so strip
# negated sentences before scanning. Markdown hard-wraps sentences across
# lines, so unwrap each paragraph and re-split on sentence boundaries first —
# a plain line filter would keep the tail of "Do not re-implement ... the
# decisions/README.md index update ..." and false-positive on it.
NON_NEGATED="$(
  awk 'BEGIN{RS="";ORS="\n"} {gsub(/\n/," "); gsub(/([.!?]) /,"&\n"); print}' "$TARGET" \
    | grep -vE '[Dd]o not|[Dd]on.t|[Nn]ever|no longer|not re-implement' || true
)"

scan() { printf '%s\n' "$NON_NEGATED" | grep -qiE "$1"; }

if scan 'ADR-\{NNN\}-\{slug\}\.md|derive.{0,20}slug'; then
  findings+=("re-embeds ADR filename/slug derivation — filename generation belongs to create-adr-agent (Phase 5)")
  FAIL=1
fi
if scan 'decisions/README\.md'; then
  findings+=("re-embeds a decisions index (decisions/README.md) update — the index belongs to create-adr-agent (Phase 6)")
  FAIL=1
fi
if scan 'git add [^ ]*decisions/'; then
  findings+=("re-embeds staging of the ADR file — committing belongs to create-adr-agent (Phase 7)")
  FAIL=1
fi
if scan '\bWrite\b[^.]{0,80}(decisions/|ADR-)'; then
  findings+=("re-embeds a direct Write-tool creation of the ADR file — the write belongs to create-adr-agent (Phase 5, via kg_capture)")
  FAIL=1
fi
if scan 'fallback[^.]{0,80}(writ|creat)|agent (is )?(unavailable|not available|fails)[^.]{0,80}(writ|creat)'; then
  findings+=("re-embeds a fallback that creates the ADR without the agent — a second implementation path is the exact regression this guard exists to catch")
  FAIL=1
fi

# Marker that must be PRESENT — the dispatch call this fix introduced.
if ! grep -qF 'Dispatch `create-adr-agent`' "$TARGET"; then
  findings+=("missing the dispatch call to create-adr-agent")
  FAIL=1
fi

if [ "$FAIL" -eq 1 ]; then
  echo "check-adr-command-dispatch: FAIL — dual-implementation regression (issue-48):" >&2
  for f in "${findings[@]}"; do echo "  - $f" >&2; done
  exit 1
fi

echo "check-adr-command-dispatch: OK — command dispatches, no re-embedded implementation"
exit 0
