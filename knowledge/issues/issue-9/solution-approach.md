---
id: issue-9
file: solution-approach
status: designed
---

# Issue-9 Solution Approach

## Design Decisions

**Hook type:** `UserPromptSubmit` — the only event that sees the prompt before Claude answers. Skill-matcher hooks cannot cover this gap since inline recommendations bypass all Skill invocations.

**Detection heuristic (case-insensitive regex):**
```
what (could|should|can) we do
how (should|do|would) (we|i|you) (approach|handle|fix|solve)
what'?s the best (way|approach)
should we .*\?
any (ideas|recommendations|thoughts) (on|about)
what are (the|my) options
how to best
```

**Minimum length:** ~40 chars — filters out short clarifying answers.

**Debounce:** Per-session PID flag `/tmp/kmgraph-rec-gate-<pid>.flag`. Injects once per Claude Code process. Resets on next launch (new PID). Avoids both "noisy on every prompt" and "suppresses all subsequent questions" inversion bug.

**DRY (ADR-021):** Preamble text sourced from `~/.kmgraph/triggers.md` section "Before producing an inline recommendation". Hardcoded fallback when triggers.md absent (ENH-016 pattern).

**Output:** `systemMessage` (correct channel for UserPromptSubmit event).

## Preamble Content

Before producing this recommendation:
1. Invoke `kmgraph:recall` on the topic — show results under "Prior Art"
2. ADR pre-check — search `knowledge/decisions/` for covering ADRs
3. Note cascade/blast-radius
4. Root-cause gate — determine root cause vs symptom before presenting options; if symptom-only, surface root cause and ask first

Do not recommend before these run.
