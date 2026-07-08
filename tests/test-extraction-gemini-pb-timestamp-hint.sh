#!/bin/bash
# test-extraction-gemini-pb-timestamp-hint.sh — proves _find_epoch_hint()
# (ENH-046) correctly picks a plausible embedded timestamp out of a
# schemaless-decoded protobuf structure, so a .pb session's date can be
# derived from content instead of unreliable file mtime (which changes
# whenever the file is copied, moved, or restored from backup).
#
# blackboxprotobuf is an optional dependency not installed in every
# environment (confirmed absent here), so this tests _find_epoch_hint()
# directly against synthetic decoded-structure shapes rather than round-
# tripping a real .pb file through the BBP decoder.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PASS=0
FAIL=0
pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

RESULT=$(KG_OUTPUT_DIR=/tmp python3 - "$REPO_ROOT" <<'PYEOF'
import sys, time
sys.path.insert(0, sys.argv[1] + "/core/scripts")
from extract_gemini import _find_epoch_hint

now = time.time()
old_epoch = now - 200 * 86400  # ~200 days ago, plausible real conversation
old_epoch_ms = old_epoch * 1000

results = []

# 1. Plausible epoch-seconds value nested in a dict/list tree is found.
structure = {"1": {"2": [{"3": int(old_epoch)}, {"4": "some other field"}]}}
hint = _find_epoch_hint(structure, now=now)
results.append(("nested_epoch_seconds_found", hint is not None and abs(hint - old_epoch) < 2))

# 2. Plausible epoch-milliseconds value is also recognized.
structure_ms = {"1": {"2": int(old_epoch_ms)}}
hint_ms = _find_epoch_hint(structure_ms, now=now)
results.append(("epoch_milliseconds_found", hint_ms is not None and abs(hint_ms - old_epoch) < 2))

# 3. An implausible small int (e.g. a counter, id, or enum value) is ignored.
structure_noise = {"1": 42, "2": [1, 2, 3], "3": {"flag": 1}}
hint_noise = _find_epoch_hint(structure_noise, now=now)
results.append(("implausible_small_ints_ignored", hint_noise is None))

# 4. A bool is never mistaken for a timestamp (bool is an int subclass in Python).
structure_bool = {"1": True, "2": False}
hint_bool = _find_epoch_hint(structure_bool, now=now)
results.append(("bool_not_mistaken_for_timestamp", hint_bool is None))

# 5. Structure with no plausible timestamp returns None (caller should fall back to mtime).
structure_empty = {"1": "just a string", "2": [1.5, "another string"]}
hint_empty = _find_epoch_hint(structure_empty, now=now)
results.append(("no_plausible_timestamp_returns_none", hint_empty is None))

# 6. When multiple plausible values exist, the earliest is chosen (session
#    start time is a safer bet than a later "last updated" field).
newer_epoch = now - 50 * 86400
structure_multi = {"1": int(old_epoch), "2": int(newer_epoch)}
hint_multi = _find_epoch_hint(structure_multi, now=now)
results.append(("earliest_plausible_value_chosen", hint_multi is not None and abs(hint_multi - old_epoch) < 2))

for name, ok in results:
    print(f"{name}:{'OK' if ok else 'FAIL'}")
PYEOF
)

while IFS=: read -r name status; do
  case "$status" in
    OK) pass "$name" ;;
    FAIL) fail "$name" ;;
    *) ;; # ignore unrelated stdout (e.g. the optional blackboxprotobuf import warning)
  esac
done <<< "$RESULT"

echo ""
echo "GEMINI-PB-TIMESTAMP-HINT: $PASS passed, $FAIL failed (total: $((PASS + FAIL)))"
[ $FAIL -eq 0 ] && exit 0 || exit 1
