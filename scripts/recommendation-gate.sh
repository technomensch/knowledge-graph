#!/usr/bin/env bash
# recommendation-gate.sh — UserPromptSubmit hook
#
# Fires on every user prompt submission. Detects recommendation-seeking
# phrasing and injects a systemMessage preamble that gates the response
# behind recall, ADR pre-check, blast-radius analysis, and root-cause
# diagnosis before Claude produces inline recommendations.
#
# Debounce: per-session PID flag at /tmp/kmgraph-rec-gate-$$.flag
# ensures the preamble is injected at most once per Claude session.
# Subsequent matching prompts in the same session pass through silently.
#
# Marketplace-safe: graceful no-op if triggers.md absent or section
# not found; always exits 0.

set -euo pipefail

# ── Constants ────────────────────────────────────────────────────────────────

TRIGGERS_FILE="${HOME}/.kmgraph/triggers.md"
FLAG_FILE="/tmp/kmgraph-rec-gate-$$.flag"
MIN_PROMPT_LEN=40

# Detection regex (ERE, case-insensitive)
DETECT_REGEX='(what (could|should|can) we do|how (should|do|would) (we|i|you) (approach|handle|fix|solve)|what'"'"'?s the best (way|approach)|should we |any (ideas|recommendations|thoughts) (on|about)|what are (the|my) options|how to best)'

# Hardcoded fallback preamble (used when triggers.md absent or section missing)
FALLBACK_PREAMBLE='Before producing this recommendation:
1. Invoke kmgraph:recall on the topic — show results under "Prior Art"
2. ADR pre-check — search knowledge/decisions/ for covering ADRs
3. Note cascade / blast-radius of proposed options
4. Root-cause gate — determine root cause vs symptom before presenting options; if symptom-only, surface root cause and ask first
Do not recommend before these run.'

# ── Read stdin ────────────────────────────────────────────────────────────────

INPUT=$(cat)

# ── Parse prompt text ─────────────────────────────────────────────────────────

if command -v jq &>/dev/null; then
  PROMPT_TEXT=$(printf '%s' "$INPUT" | jq -r '.prompt // ""' 2>/dev/null || true)
else
  # Graceful fallback: extract value of "prompt" key via grep
  PROMPT_TEXT=$(printf '%s' "$INPUT" \
    | grep -o '"prompt"[[:space:]]*:[[:space:]]*"[^"]*"' \
    | sed 's/^"prompt"[[:space:]]*:[[:space:]]*"//; s/"$//' \
    || true)
fi

# ── Length gate ───────────────────────────────────────────────────────────────

PROMPT_LEN=${#PROMPT_TEXT}
if [ "$PROMPT_LEN" -lt "$MIN_PROMPT_LEN" ]; then
  exit 0
fi

# ── Detection ─────────────────────────────────────────────────────────────────

if ! printf '%s' "$PROMPT_TEXT" | grep -qEi "$DETECT_REGEX"; then
  exit 0
fi

# ── Debounce gate ─────────────────────────────────────────────────────────────

if [ -f "$FLAG_FILE" ]; then
  exit 0
fi

touch "$FLAG_FILE" 2>/dev/null || true

# ── Preamble sourcing (ADR-021 DRY + ENH-016 fallback) ───────────────────────

PREAMBLE=""

if [ -f "$TRIGGERS_FILE" ]; then
  PREAMBLE=$(awk '
    /Before producing an inline recommendation/ { in_section=1 }
    in_section && /^## / && !/Before producing an inline recommendation/ { in_section=0 }
    in_section { print }
  ' "$TRIGGERS_FILE" 2>/dev/null || true)
fi

if [ -z "$PREAMBLE" ]; then
  PREAMBLE="$FALLBACK_PREAMBLE"
fi

# ── Emit systemMessage ────────────────────────────────────────────────────────

if command -v jq &>/dev/null; then
  jq -n --arg msg "$PREAMBLE" '{"systemMessage": $msg}'
else
  printf '{"systemMessage": "%s"}\n' \
    "$(printf '%s' "$PREAMBLE" | sed 's/"/\\"/g; s/$/\\n/' | tr -d '\n' | sed 's/\\n$//')"
fi

exit 0
