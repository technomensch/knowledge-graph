---
id: issue-8
file: solution-approach
status: designed
---

# Issue-8 Solution Approach

## Design Decisions

**Hook mechanism:** Claude Code has no native PrePush event. All gates use `PreToolUse` matcher `Bash` (for Gate 2 + Gate 3) or `PostToolUse` matcher `Write|Edit` (for Gate 1). Git-side `.git/hooks/pre-push` is rejected — not shippable via plugin, bypassed by `--no-verify`, invisible to Claude's context.

**Advisory-only contract:** All gates inject into Claude's context (never return non-zero exit code). This matches the established pattern in `stop-plan-gate.sh` and keeps marketplace safety. Hard-deny enforcement deferred to ENH (issue-6 lineage).

**Output contracts:**
- PostToolUse → `systemMessage`
- PreToolUse → `hookSpecificOutput.additionalContext`

**Bash command parsing:** All scripts parse via `jq -r '.tool_input.command'`. Graceful fallback when `jq` absent.

**ENH-016 fallback pattern:** Any script reading optional/split knowledge files checks `[ -f path ]` before reading; falls back to master file or silent no-op when absent. Never hardcodes paths that only exist for some users.

## Gate 1 — plan-docs-xref-check.sh

Fires on PostToolUse Write|Edit when path matches `*plans/*.md`. Greps for exact `## Docs Impact` heading (the constant pinned in ADR-013). Per-file-hash idempotency: hashes file content, caches in `/tmp/kmgraph-plan-xref-<filehash>.hash`. Re-injects only when content changes. Output: `systemMessage`.

## Gate 2 + Gate 3 — pre-push-gate.sh

Fires on PreToolUse Bash when command contains `git push` token. Non-interference with `pre-commit-knowledge-gate.sh` (which matches `git commit`). Handles chained commands (`git commit && git push`).

Gate 2: reads `version` from `package.json` and `.claude-plugin/plugin.json` via jq. Emits drift message on mismatch. Advisory CHANGELOG presence check. README/INSTALL advisory with ENH-016 skip when absent.

Gate 3: checks for `/tmp/kmgraph-docs-scan-<branch>-<sha>.flag`. If absent: injects "run docs-impact-scan first". Branch sanitized (slashes → `-`). Detached-HEAD fallback: SHA-only flag name.
