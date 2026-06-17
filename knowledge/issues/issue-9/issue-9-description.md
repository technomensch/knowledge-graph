---
type: Bug
---

# Issue-9: Inline Recommendation Protocol Gap

## Problem

The ADR-049 Review Audit Protocol (and the recall/cascade/ADR-pre-check HARD BLOCKs in `pre-skill-rules-inject.sh`) fire **only** when a gated Skill is invoked — classified into `brainstorming` / `debugging` / `review-request` / `finishing` via the `PreToolUse` matcher `Skill`.

When a user asks an inline recommendation question — "what could we do about X?", "how should we approach Y?", "what's the best way to…" — Claude produces architectural recommendations directly without invoking any Skill. Every gate is bypassed: no recall check, no cascade check, no ADR pre-check.

Root cause documented in MEMORY: `recall_v059_protocol_noncompliance.md`.

## Mechanism

A `UserPromptSubmit` hook fires before Claude answers. It detects recommendation-phrasing via regex and injects a lightweight recall/ADR-precheck/cascade preamble into context as a `systemMessage`. This routes inline conversations through the same gates without requiring a formal Skill invocation.

## Acceptance Criteria

- [x] recommendation-gate.sh detects recommendation-phrasing prompts (case-insensitive regex)
- [x] Minimum ~40-char threshold: short clarifying prompts do not trigger
- [x] Per-session PID debounce: injects on first match, silent for remainder of session
- [x] Output is systemMessage (UserPromptSubmit event)
- [x] Preamble sourced from triggers.md when present; hardcoded fallback when absent
- [x] Non-matching prompt → silent; no crash
- [x] Absent triggers.md → fallback text, no error
- [x] Always exit 0

## Related

- ADR-049: Review Audit Protocol (issue-9 coverage extends the protocol to inline recommendations)
- ADR-043: PreToolUse Hook Injection (sibling-trigger pattern)
- ENH-021: Session Summary Asymmetric Coupling (contains "Cascading Finding: issue-9")
- recall_v059_protocol_noncompliance.md (root cause documented in MEMORY)
