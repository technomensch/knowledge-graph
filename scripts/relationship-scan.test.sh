#!/usr/bin/env bash
# Tests for the relationship scan (ENH-062). The scan is an inline bash block in
# skills/kmg-paperwork-audit/SKILL.md (Step 7), between two marker comments. This test
# extracts that exact block and runs it, so it checks the code users actually run.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SKILL="${SKILL_FILE:-$HERE/../skills/kmg-paperwork-audit/SKILL.md}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FAIL=0
ok()   { echo "PASS: $1"; }
bad()  { echo "FAIL: $1"; FAIL=1; }

# Extract the lines between the markers, dropping the code-fence lines.
BLOCK="$TMP/scan-block.sh"
BEGINS="$(grep -c '^<!-- relationship-scan:begin -->$' "$SKILL" 2>/dev/null || true)"
ENDS="$(grep -c '^<!-- relationship-scan:end -->$' "$SKILL" 2>/dev/null || true)"
if [ "${BEGINS:-0}" -ne 1 ] || [ "${ENDS:-0}" -ne 1 ]; then
  echo "FAIL: expected exactly one begin and one end marker in $SKILL (found ${BEGINS:-0} / ${ENDS:-0})"
  exit 1
fi
awk '/^<!-- relationship-scan:begin -->$/{on=1; next} /^<!-- relationship-scan:end -->$/{on=0} on && !/^```/' "$SKILL" > "$BLOCK"
if [ ! -s "$BLOCK" ]; then
  echo "FAIL: the block between the markers is empty"
  exit 1
fi

# run_scan GRAPH_DIR  (sets OUT, ERR, RC)
run_scan() {
  OUT="$(KG="$1" bash "$BLOCK" 2>"$TMP/stderr")"
  RC=$?
  ERR="$(cat "$TMP/stderr")"
}

# --- Main fixture: a graph folder called "knowledge" ---
G="$TMP/repo/knowledge"
mkdir -p "$G/issues/issue-1" "$G/issues/issue-2" "$G/enhancements/ENH-003" "$G/enhancements/ENH-004" "$G/enhancements/ENH-005"
cat > "$G/issues/issue-1/issue-1-description.md" <<'EOF'
---
id: issue-1
related_to: []
---
Touches `src/shared.ts`, `README.md`, `notes.md` and `hub/file.ts`.
EOF
cat > "$G/issues/issue-2/issue-2-description.md" <<'EOF'
---
id: issue-2
related_to: []
---
Also touches `src/shared.ts`, `README.md`, `notes.md` and `hub/file.ts`.
EOF
cat > "$G/enhancements/ENH-003/ENH-003-specification.md" <<'EOF'
---
id: ENH-003
related_issues: ["[[issue-1-description|issue-1]]"]
---
Touches `src/shared.ts` and `hub/file.ts`.
EOF
cat > "$G/enhancements/ENH-004/ENH-004-specification.md" <<'EOF'
---
id: ENH-004
---
Only touches `docs/other.md` and `hub/file.ts`.
EOF
cat > "$G/enhancements/ENH-005/ENH-005-specification.md" <<'EOF'
---
id: ENH-005
---
Only touches `hub/file.ts`.
EOF

run_scan "$G"
[ "$RC" -eq 0 ] && ok "exit code is always 0" || bad "exit code was $RC"
echo "$OUT" | grep -q "UNDECLARED: issue-1 <-> issue-2 (shared: src/shared.ts)" && ok "flags undeclared pair issue-1/issue-2" || bad "missing issue-1/issue-2 flag"
echo "$OUT" | grep -q "UNDECLARED: ENH-003 <-> issue-2 (shared: src/shared.ts)" && ok "flags undeclared pair ENH-003/issue-2" || bad "missing ENH-003/issue-2 flag"
echo "$OUT" | grep -q "ENH-003 <-> issue-1" && bad "declared pair ENH-003/issue-1 was flagged" || ok "declared pair is not flagged"
echo "$OUT" | grep -q "ENH-004" && bad "unrelated ENH-004 was flagged" || ok "unrelated doc is not flagged"
echo "$OUT" | grep -q "README.md" && bad "ignored path README.md was used" || ok "common paths are ignored"
echo "$OUT" | grep -q "notes.md" && bad "bare filename notes.md was flagged" || ok "bare filenames (no directory) are ignored"
echo "$OUT" | grep -q "hub/file.ts" && bad "hub path shared by 5 docs was flagged" || ok "hub paths shared by more than 4 docs are ignored"
[ "$(echo "$ERR" | grep -c .)" -eq 1 ] && echo "$ERR" | grep -q "reappear on every audit until a relationship is declared" \
  && ok "flagged pairs come with exactly one warning that dismissals are not remembered" || bad "expected the dismissal warning as the only stderr line, got: $ERR"
echo "$ERR" | grep -q "6 pair(s) flagged\|[0-9]* pair(s) flagged" && ok "the warning states how many pairs were flagged" || bad "warning does not state a pair count"

# --- A graph folder that is not called "knowledge", and is not inside a repo ---
G2="$TMP/elsewhere/my-notes"
mkdir -p "$TMP/elsewhere"
cp -R "$G" "$G2"
run_scan "$G2"
[ "$RC" -eq 0 ] && echo "$OUT" | grep -q "UNDECLARED: issue-1 <-> issue-2 (shared: src/shared.ts)" \
  && ok "a graph folder not named knowledge is scanned" || bad "graph folder named my-notes was not scanned"

# --- Run from a different working directory with a resolved path ---
OUT="$(cd "$TMP" && KG="$G" bash "$BLOCK" 2>/dev/null)"
echo "$OUT" | grep -q "UNDECLARED: issue-1 <-> issue-2" && ok "works from a working directory outside the graph" || bad "depends on the working directory"

# --- A graph with no issues/ and no enhancements/ ---
G3="$TMP/empty-graph"
mkdir -p "$G3/decisions" "$G3/lessons-learned"
echo "# an ADR mentioning \`src/shared.ts\`" > "$G3/decisions/ADR-001-x.md"
run_scan "$G3"
[ "$RC" -eq 0 ] && ok "no issues/ or enhancements/: exit 0" || bad "no issues/ or enhancements/: exit $RC"
[ -z "$OUT" ] && ok "no issues/ or enhancements/: empty output" || bad "no issues/ or enhancements/: unexpected output"
echo "$ERR" | grep -q "nothing to scan" && ok "stderr says there is nothing to scan" || bad "stderr missing 'nothing to scan': $ERR"
echo "$ERR" | grep -qi "repo root\|KG_DIR" && bad "stderr still tells consumers to pass a repo root or KG_DIR" || ok "stderr does not mention repo root or KG_DIR"

# --- A graph with only enhancements/ ---
G4="$TMP/enh-only"
mkdir -p "$G4/enhancements/ENH-010" "$G4/enhancements/ENH-011"
printf -- '---\nid: ENH-010\n---\nTouches `lib/core.ts`.\n' > "$G4/enhancements/ENH-010/ENH-010-specification.md"
printf -- '---\nid: ENH-011\n---\nTouches `lib/core.ts`.\n' > "$G4/enhancements/ENH-011/ENH-011-specification.md"
run_scan "$G4"
[ "$RC" -eq 0 ] && echo "$OUT" | grep -q "UNDECLARED: ENH-010 <-> ENH-011 (shared: lib/core.ts)" \
  && ok "a graph with only enhancements/ is scanned" || bad "enhancements-only graph was not scanned"

# --- A graph where every pair is already declared: no output, and no warning ---
G5="$TMP/all-declared"
mkdir -p "$G5/enhancements/ENH-020" "$G5/enhancements/ENH-021"
printf -- '---\nid: ENH-020\nrelated_enhs: ["ENH-021"]\n---\nTouches `lib/core.ts`.\n' > "$G5/enhancements/ENH-020/ENH-020-specification.md"
printf -- '---\nid: ENH-021\n---\nTouches `lib/core.ts`.\n' > "$G5/enhancements/ENH-021/ENH-021-specification.md"
run_scan "$G5"
[ "$RC" -eq 0 ] && [ -z "$OUT" ] && [ -z "$ERR" ] && ok "nothing flagged: empty output and no warning" || bad "unexpected output or warning when nothing is flagged: $OUT / $ERR"

# --- KG unset ---
OUT="$(env -u KG bash "$BLOCK" 2>"$TMP/stderr")"; RC=$?; ERR="$(cat "$TMP/stderr")"
[ "$RC" -eq 0 ] && [ -z "$OUT" ] && echo "$ERR" | grep -q "nothing to scan" \
  && ok "KG unset: empty output, exit 0, nothing-to-scan message" || bad "KG unset was not handled"

# --- Run the block exactly the way the skill tells Claude to: KG=... bash -s <<'SCAN' ---
# (a command that reads stdin at the top level would swallow the rest of the script here)
BASHES="$(for b in /bin/bash "$(command -v bash)"; do [ -x "$b" ] && echo "$b"; done | sort -u)"
for B in $BASHES; do
  OUT="$(KG="$G" "$B" -s 2>"$TMP/stderr" <<SCAN
$(cat "$BLOCK")
SCAN
)"
  ERR="$(grep -v 'reappear on every audit' "$TMP/stderr")"
  echo "$OUT" | grep -q "UNDECLARED: issue-1 <-> issue-2 (shared: src/shared.ts)" && [ -z "$ERR" ] \
    && ok "heredoc form works, quietly, under $B" || bad "heredoc form (bash -s) failed under $B: $ERR"
  # the plain-file form under each bash too (the system bash on macOS is 3.2, Homebrew's is 5.x)
  OUT="$(KG="$G" "$B" "$BLOCK" 2>"$TMP/stderr")"
  ERR="$(grep -v 'reappear on every audit' "$TMP/stderr")"
  echo "$OUT" | grep -q "UNDECLARED: issue-1 <-> issue-2 (shared: src/shared.ts)" && [ -z "$ERR" ] \
    && ok "file form works, quietly, under $B" || bad "file form failed under $B: $ERR"
done

# --- Missing marker must fail the test, not pass silently ---
NOMARK="$TMP/no-marker.md"
grep -v '^<!-- relationship-scan:begin -->$' "$SKILL" > "$NOMARK"
if SKILL_FILE="$NOMARK" bash "${BASH_SOURCE[0]}" >/dev/null 2>&1; then
  bad "test passed even though the begin marker was removed"
else
  ok "test fails when a marker is missing"
fi

[ "$FAIL" -eq 0 ] && echo "ALL PASS" || { echo "SOME FAILED"; exit 1; }
