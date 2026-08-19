#!/usr/bin/env bash
# check-adr-command-dispatch.test.sh — self-contained test for the issue-48
# dual-implementation regression guard. Builds fixture command files, drives
# check-adr-command-dispatch.sh against each, asserts pass/fail outcomes.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECK="${SCRIPT_DIR}/check-adr-command-dispatch.sh"
FAIL=0

pass() { printf 'ok   - %s\n' "$1"; }
fail() { printf 'FAIL - %s\n' "$1"; FAIL=1; }

FIX="$(mktemp -d)"
trap 'rm -rf "$FIX"' EXIT
mkdir -p "$FIX/commands"

export CLAUDE_PROJECT_DIR="$FIX"

# --- Fixed (post-issue-48) shape: dispatch present, no old-implementation markers ---
cat > "$FIX/commands/kmg-create-adr.md" <<'EOF'
## Step 3: Dispatch to create-adr-agent

Dispatch `create-adr-agent`, passing the resolved flag and model.
EOF
if "$CHECK" >/dev/null 2>&1; then pass "dispatch-only command passes"; else fail "dispatch-only command should pass"; fi

# --- Regression: re-embedded YAML frontmatter construction ---
cat > "$FIX/commands/kmg-create-adr.md" <<'EOF'
## Step 3: Dispatch to create-adr-agent

Dispatch `create-adr-agent`.

## Step 5: Create ADR File

```yaml
title: "ADR-{NNN}: {title}"
```
EOF
if "$CHECK" >/dev/null 2>&1; then fail "re-embedded frontmatter should fail"; else pass "re-embedded frontmatter fails (exit 1)"; fi
OUT="$("$CHECK" 2>&1 || true)"
printf '%s' "$OUT" | grep -q 'YAML frontmatter' && pass "findings name the frontmatter regression" || fail "findings missing frontmatter regression"
printf '%s' "$OUT" | grep -q 'Step 4-7' && pass "findings name the Step 4-7 regression" || fail "findings missing Step 4-7 regression"

# --- Regression: re-embedded direct commit block ---
cat > "$FIX/commands/kmg-create-adr.md" <<'EOF'
## Step 3: Dispatch to create-adr-agent

Dispatch `create-adr-agent`.

```bash
git commit -m "docs(adr): create ADR-{NNN}: {title}"
```
EOF
if "$CHECK" >/dev/null 2>&1; then fail "re-embedded commit block should fail"; else pass "re-embedded commit block fails (exit 1)"; fi

# --- Regression: dispatch missing entirely ---
cat > "$FIX/commands/kmg-create-adr.md" <<'EOF'
## Step 0: Resolve Target KG Path

Nothing else here.
EOF
if "$CHECK" >/dev/null 2>&1; then fail "missing dispatch should fail"; else pass "missing dispatch fails (exit 1)"; fi

# --- Missing target file entirely: SKIP (exit 0), not a false failure ---
rm -f "$FIX/commands/kmg-create-adr.md"
if "$CHECK" >/dev/null 2>&1; then pass "missing target file skips cleanly"; else fail "missing target file should not fail"; fi

exit $FAIL
