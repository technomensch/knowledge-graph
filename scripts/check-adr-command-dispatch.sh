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
#      drift actually happened. These are matched only where no exemption
#      GOVERNS the match, so boundary prose ("Do not re-implement the file
#      write here") does not trip them. See the governance scan below.

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
#
# Boundary prose that forbids something ("Do not re-implement the index update
# here") is not a re-implementation, and ownership prose that attributes the
# work to the agent ("the agent appends to decisions/README.md itself") is not
# either. But an earlier "do not"/"no longer" in a sentence must NOT blanket-
# excuse a later independent instruction in that same sentence — "Since the
# agent no longer updates decisions/README.md, append the new entry to
# decisions/README.md from this command" genuinely re-adds the behavior.
#
# So the rule is GOVERNANCE, not mere presence: a marker hit is excused only if
# an exemption phrase (negation or agent-ownership) appears BEFORE the hit and
# within the same instruction segment. A segment ends where a new imperative
# clause begins — a comma/semicolon/colon followed by a bare-form verb
# ("..., append the entry"). Bare form is the signal: imperative "updates the
# index" (third person, descriptive) does not open a new instruction, while
# "update the index" does. Coordinated noun lists under a negation ("Do not
# re-implement the wizard, the Write of decisions/ADR-NNN files, the
# decisions/README.md index update") never open a segment, so they stay
# excused.
#
# Markdown hard-wraps sentences across lines, so each paragraph is unwrapped
# and re-split on sentence boundaries first. The splitter is abbreviation-aware
# ("e.g.", "i.e.", "etc." are not sentence ends) and requires the next sentence
# to start with a capital, so "decisions/README.md index update" is not torn in
# half at the file extension. Splitting too eagerly would strand a marker in a
# fragment that no longer contains its governing negation.
GOVERNANCE_AWK=$(cat <<'AWK'
function check(s,   sl, tmp, off, i, vstart, abs, ss, se, prefix) {
  sl = tolower(s)
  gsub(SEP, ".", sl)          # restore protected abbreviation periods
  sl = sl " "                 # sentinel so a trailing word still has a delimiter

  # Instruction-segment starts: sentence start, plus every clause-initial
  # bare-form verb after a comma/semicolon/colon.
  split("", resets); nres = 1; resets[1] = 1
  tmp = sl; off = 0
  while (match(tmp, /[,;:] +/)) {
    vstart = RSTART + RLENGTH
    abs = off + vstart
    if (substr(tmp, vstart) ~ VERB) resets[++nres] = abs
    off = off + vstart - 1
    tmp = substr(tmp, vstart)
  }

  # A marker hit fires unless an exemption phrase precedes it in its segment,
  # or an explicit ownership predicate appears anywhere in that segment (those
  # read the same before or after the marker: "the index update belongs to the
  # agent" == "the agent owns the index update").
  tmp = sl; off = 0
  while (match(tmp, marker)) {
    abs = off + RSTART
    ss = 1; se = length(sl) + 1
    for (i = 1; i <= nres; i++) {
      if (resets[i] <= abs && resets[i] > ss) ss = resets[i]
      if (resets[i] >  abs && resets[i] < se) se = resets[i]
    }
    prefix = substr(sl, ss, abs - ss)
    if (prefix !~ EXEMPT && substr(sl, ss, se - ss) !~ OWNS) return 1
    off = off + RSTART
    tmp = substr(tmp, RSTART + 1)
  }
  return 0
}
BEGIN {
  SEP = sprintf("%c", 1)
  CONN = "(so|then|therefore|instead|now|next|finally|also|and) +"
  VERB = "^(" CONN ")*(append|add|apply|assemble|build|call|commit|construct|copy|create|derive|edit|emit|generate|insert|invoke|make|modify|output|pass|patch|prepend|produce|put|record|register|run|save|set|stage|store|update|use|write)([^a-z]|$)"
  EXEMPT = "(do not|don.t|does not|did not|never|no longer|not re-implement|is not|are not|was not|must not|cannot|can.t|rather than|instead of|no need to|create-adr-agent|the agent|agent.s)"
  OWNS   = "(belongs? to|owned by|agent owns|handled by|the job of)"
  RS = ""
  hit = 0
}
{
  para = $0
  gsub(/\n/, " ", para)
  gsub(/—/, ";", para)              # em dash is a clause boundary like ;
  gsub(/ -- /, "; ", para)
  # Protect abbreviation periods so they are not read as sentence ends.
  gsub(/[Ee]\.[Gg]\./,   "e" SEP "g" SEP, para)
  gsub(/[Ii]\.[Ee]\./,   "i" SEP "e" SEP, para)
  gsub(/[Ee]tc\./,       "etc" SEP, para)
  gsub(/[Vv]s\./,        "vs" SEP, para)
  gsub(/[Cc]f\./,        "cf" SEP, para)
  gsub(/[Aa]pprox\./,    "approx" SEP, para)
  gsub(/[Ff]ig\./,       "fig" SEP, para)
  gsub(/[Ee]t al\./,     "et al" SEP, para)

  rest = para
  while (match(rest, /[.!?][]"')`*]* +[A-Z]/)) {
    cut = RSTART + RLENGTH - 1
    s = substr(rest, 1, cut - 1)
    sub(/ +$/, "", s)
    if (check(s)) hit = 1
    rest = substr(rest, cut)
  }
  if (check(rest)) hit = 1
}
END { if (hit) print "HIT" }
AWK
)

# Marker regexes below are matched case-insensitively (awk lowercases each
# sentence first), so they are written in lower case.
scan() { [ -n "$(awk -v marker="$1" "$GOVERNANCE_AWK" "$TARGET")" ]; }

if scan 'adr-\{nnn\}-\{slug\}\.md|derive.{0,20}slug'; then
  findings+=("re-embeds ADR filename/slug derivation — filename generation belongs to create-adr-agent (Phase 5)")
  FAIL=1
fi
if scan 'decisions/readme\.md'; then
  findings+=("re-embeds a decisions index (decisions/README.md) update — the index belongs to create-adr-agent (Phase 6)")
  FAIL=1
fi
if scan 'git add [^ ]*decisions/'; then
  findings+=("re-embeds staging of the ADR file — committing belongs to create-adr-agent (Phase 7)")
  FAIL=1
fi
if scan '(^|[^a-z])write([^a-z])[^.]{0,80}(decisions/|adr-)'; then
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
