---
title: "ADR-050: Pre-Push Composite Gate + Inline Recommendation Gate"
number: 050
created: 2026-05-30T00:00:00Z
status: Accepted
author: mkaplan
email: mkitact@gmail.com
git:
  branch: v0.5.9.3-docs-enforcement-protocol-gap
  commit: TBD
  pr: null
  issue: null
implements: v0.5.9.3
related:
  adrs: [012, 013, 021, 036, 043, 049]
  lessons: []
  kg_entries: []
tags: [hooks, governance, pre-push, recommendation, UserPromptSubmit, advisory]
category: governance
---

# ADR-050: Pre-Push Composite Gate + Inline Recommendation Gate

**Date:** 2026-05-30
**Status:** Accepted
**Implements:** v0.5.9.3 — issue-8 (Gates 2 + 3) and issue-9

---

## Context

### issue-8 (Pre-Push Composite Gate)

Two enforcement gaps allowed version drift and undocumented docs impact to reach `origin`:

1. **Gate 2 — Version sync:** No automated check that `package.json` and `.claude-plugin/plugin.json` versions matched before push. Discovered during Opus review: version drift went unnoticed until the PR review cycle.

2. **Gate 3 — docs-impact-scan pre-push:** ADR-036 ships the `kmgraph:docs-impact-scan` skill as a phrase-triggered discovery layer. The skill is not wired as a pre-push gate; a push can happen without the scan ever running. ADR-036 explicitly marks Gate 3 as required (issue-8 Gate 3 fix).

### issue-9 (Inline Recommendation Protocol Gap)

The ADR-049 Review Audit Protocol and the recall/ADR-pre-check HARD BLOCKs in `pre-skill-rules-inject.sh` fire only when a gated Skill is invoked via the `PreToolUse` matcher `Skill`. When a user asks an inline recommendation question directly in chat — without invoking a Skill — Claude answers without any recall, cascade, or ADR pre-check gate running. Root cause: no hook sees inline prompts before the model generates a response, except `UserPromptSubmit`.

---

## Decisions

### Part A — Pre-Push Composite Gate (issue-8)

**No native PrePush hook.** Claude Code does not fire a `PrePush` event. The established pattern (ADR-012, `pre-commit-knowledge-gate.sh`) uses `PreToolUse` matcher `Bash`, parsing the command string via `jq -r '.tool_input.command'` to act only when the command matches a specific git operation.

**Gate 2 — Version sync check (`pre-push-gate.sh`):**
- Fires on `PreToolUse Bash` when command contains the `git push` token
- Non-interference: `pre-commit-knowledge-gate.sh` matches `git commit`; `pre-push-gate.sh` matches `git push` — distinct, non-overlapping
- Reads `version` from `package.json` and `.claude-plugin/plugin.json` via jq
- On mismatch: emits drift message. `mcp-server/package.json` is independent — explicitly noted as out of scope unless mcp-server changed
- Advisory CHANGELOG version-presence check; README/INSTALL advisory with ENH-016 silent skip when absent

**Gate 3 — docs-impact-scan completion flag (`pre-push-gate.sh` + `skills/docs-impact-scan/SKILL.md`):**
- The skill writes a per-commit flag in Step 8; `pre-push-gate.sh` checks for the flag at push time
- Flag formula: `/tmp/kmgraph-docs-scan-<branch>-<sha>.flag`
  - `<branch>` = sanitized `git branch --show-current` (slashes → `-`)
  - `<sha>` = `git rev-parse --short HEAD`
  - Detached-HEAD fallback: SHA-only flag name
  - Auto-invalidates per commit and per branch — no cross-commit or cross-branch false positives
- If absent: inject "run docs-impact-scan before pushing" advisory

**Output contract (PreToolUse):** `hookSpecificOutput.additionalContext` — not `systemMessage`. The distinction is required: `systemMessage` is for PostToolUse/UserPromptSubmit; `additionalContext` is for PreToolUse to inject into the tool call's context.

**Advisory-injection model:** All gates inject a blocking instruction into Claude's context rather than returning a non-zero exit code. `exit 0` always. This preserves marketplace safety (ADR-012 contract). Hard-deny enforcement remains deferred (issue-6 lineage).

### Part B — Inline Recommendation Gate (issue-9)

**Hook mechanism:** `UserPromptSubmit` — the only Claude Code event that receives the raw user prompt before the model generates a response.

**Detection:** Case-insensitive ERE regex on the prompt text. Pattern matches common recommendation-seeking phrasings: "what could/should/can we do", "how should/do/would we approach/handle/fix/solve", "what's the best way/approach", "should we …?", "any ideas/recommendations/thoughts on/about", "what are the/my options", "how to best". Minimum prompt length: 40 chars — filters short clarifying answers.

**Per-session debounce:** Flag file `/tmp/kmgraph-rec-gate-<pid>.flag` keyed to `$$` (shell PID of the hook process, which is stable per Claude Code session). Inject once per session, silent thereafter. Resets naturally on next Claude Code launch. Avoids both per-prompt noise and suppressing all subsequent recommendation questions after session restart.

**Preamble sourcing (ADR-021 DRY):** `recommendation-gate.sh` extracts the "Before producing an inline recommendation" section from `~/.kmgraph/triggers.md` via awk. Hardcoded fallback when `triggers.md` is absent or the section is not found (ENH-016 pattern). The trigger language is also added to the shipped `core/templates/knowledge/triggers.md`.

**Output contract (UserPromptSubmit):** `systemMessage` — correct channel for this event type.

**Relationship to ADR-049:** ADR-049 establishes the Review Audit Protocol for skill-gated workflows. This ADR extends the same gates to inline recommendation conversations that bypass Skill invocation. ADR-049 remains authoritative for skill-gated flows; ADR-050 covers the complementary gap.

---

## Consequences

### Positive

1. Version drift caught before push, not after PR review
2. docs-impact-scan completion verified at push time — scan cannot be silently skipped
3. Inline recommendation questions now surface recall, ADR pre-check, and cascade analysis before Claude answers
4. Both gates advisory-only — no marketplace safety risk; no blocked tool calls

### Negative

1. `pre-push-gate.sh` Gate 3 requires the user to invoke `kmgraph:docs-impact-scan` and run the Bash commands in Step 8 before pushing; flag-write failure (e.g., /tmp not writable) would incorrectly block the advisory and suppress the reminder
2. Recommendation gate debounce is per-session only — within one session, only the first recommendation question triggers the preamble; later questions in the same session do not re-surface the gates
3. False-positive risk from recommendation regex: technical prompts that happen to phrase a factual question as "what are my options for X" will trigger the preamble

---

## Implementation

**Scripts:**
- `scripts/pre-push-gate.sh` (new) — Gates 2 + 3
- `scripts/recommendation-gate.sh` (new) — issue-9 UserPromptSubmit hook

**Hook wiring (`hooks/hooks.json`):**
- `PreToolUse Bash` → `pre-push-gate.sh` (timeout 10)
- `UserPromptSubmit` → `recommendation-gate.sh` (timeout 5)

**Skill edit:**
- `skills/docs-impact-scan/SKILL.md` Step 8 — completion flag write added

**Trigger language:**
- `~/.kmgraph/triggers.md` — "Before producing an inline recommendation" section added
- `core/templates/knowledge/triggers.md` — same section added (shipped template)

---

## Related

- [ADR-012](ADR-012-hook-security-model.md) — Hook security contract; `exit 0` advisory model
- [ADR-013](ADR-013-documentation-update-protocol.md) — Gate 1 (plan cross-reference, plan-docs-xref-check.sh)
- [ADR-021](ADR-021-single-source-of-truth-dry-documentation.md) — DRY contract; recommendation-gate.sh sources triggers.md
- [ADR-036](ADR-036-docs-impact-scan.md) — docs-impact-scan skill; Gate 3 implements this ADR
- [ADR-043](ADR-043-pretooluse-hook-injection-superpowers-rule-enforcement.md) — PreToolUse hook injection pattern; pre-push-gate.sh follows this pattern
- [ADR-049](ADR-049-review-audit-protocol-post-plan-pre-push-review-governance.md) — Review Audit Protocol; ADR-050 extends its gates to inline recommendation conversations

---

**Decision Made:** 2026-05-30
**Last Updated:** 2026-05-30
**Status:** Accepted
