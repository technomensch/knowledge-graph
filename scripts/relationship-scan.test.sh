#!/usr/bin/env bash
# Tests for scripts/relationship-scan.sh (ENH-062)
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FAIL=0
ok()   { echo "PASS: $1"; }
bad()  { echo "FAIL: $1"; FAIL=1; }

mkdir -p "$TMP/issues/issue-1" "$TMP/issues/issue-2" "$TMP/enhancements/ENH-003" "$TMP/enhancements/ENH-004" "$TMP/enhancements/ENH-005"
cat > "$TMP/issues/issue-1/issue-1-description.md" <<'EOF'
---
id: issue-1
related_to: []
---
Touches `src/shared.ts`, `README.md`, `notes.md` and `hub/file.ts`.
EOF
cat > "$TMP/issues/issue-2/issue-2-description.md" <<'EOF'
---
id: issue-2
related_to: []
---
Also touches `src/shared.ts`, `README.md`, `notes.md` and `hub/file.ts`.
EOF
cat > "$TMP/enhancements/ENH-003/ENH-003-specification.md" <<'EOF'
---
id: ENH-003
related_issues: ["[[issue-1-description|issue-1]]"]
---
Touches `src/shared.ts` and `hub/file.ts`.
EOF
cat > "$TMP/enhancements/ENH-004/ENH-004-specification.md" <<'EOF'
---
id: ENH-004
---
Only touches `docs/other.md` and `hub/file.ts`.
EOF
cat > "$TMP/enhancements/ENH-005/ENH-005-specification.md" <<'EOF'
---
id: ENH-005
---
Only touches `hub/file.ts`.
EOF

OUT="$(KG_DIR="$TMP" bash "$HERE/relationship-scan.sh" "$TMP")"
RC=$?

[ "$RC" -eq 0 ] && ok "exit code is always 0" || bad "exit code was $RC"
echo "$OUT" | grep -q "UNDECLARED: issue-1 <-> issue-2 (shared: src/shared.ts)" && ok "flags undeclared pair issue-1/issue-2" || bad "missing issue-1/issue-2 flag"
echo "$OUT" | grep -q "UNDECLARED: ENH-003 <-> issue-2 (shared: src/shared.ts)" && ok "flags undeclared pair ENH-003/issue-2" || bad "missing ENH-003/issue-2 flag"
echo "$OUT" | grep -q "ENH-003 <-> issue-1" && bad "declared pair ENH-003/issue-1 was flagged" || ok "declared pair is not flagged"
echo "$OUT" | grep -q "ENH-004" && bad "unrelated ENH-004 was flagged" || ok "unrelated doc is not flagged"
echo "$OUT" | grep -q "README.md" && bad "ignored path README.md was used" || ok "common paths are ignored"
echo "$OUT" | grep -q "notes.md" && bad "bare filename notes.md was flagged" || ok "bare filenames (no directory) are ignored"
echo "$OUT" | grep -q "hub/file.ts" && bad "hub path shared by 5 docs was flagged" || ok "hub paths shared by more than 4 docs are ignored"

[ "$FAIL" -eq 0 ] && echo "ALL PASS" || { echo "SOME FAILED"; exit 1; }
