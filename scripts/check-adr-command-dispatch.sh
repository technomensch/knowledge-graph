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
if grep -qF 'context_provided: true' "$TARGET"; then
  findings+=("re-passes context_provided: true to create-adr-agent — this collapses the agent's own wizard, which is exactly the dual-implementation risk this fix removed (see plan Step 3's chosen resolution)")
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
