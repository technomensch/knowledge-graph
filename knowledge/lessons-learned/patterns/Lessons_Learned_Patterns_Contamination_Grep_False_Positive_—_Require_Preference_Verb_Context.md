---
title: Contamination Grep False-Positive — Require Preference Verb Context
category:
  uri: uri-that-does-not-map-to-patterns
---
# Lesson: Contamination Grep False-Positive — Require Preference Verb Context

## Problem

The upgrade-inspector's platform-split detection (section d) used a broad grep pattern to find Claude-specific tool names in `rules.md`:

```bash
grep -nE '\bGlob\b|\bGrep\b|context-mode|\bsubagent\b|\.jsonl' rules.md
```

This matched ANY line containing these words — including legitimate user-authored project conventions like:
- "never use Glob patterns in shell script filenames" (a project file-naming rule)
- "Grep output requires human review before acting" (a process rule)

A false positive causes the wizard to offer to relocate the matched line from `rules.md` to `CLAUDE.md`. If the user accepts option (a) — auto-relocate — their project convention is silently removed from `rules.md` and written to CLAUDE.md. This is a data-loss bug with no warning.

## Solution

Tighten the fingerprint to require a tool-preference verb in the same line as the tool name:

```bash
CONTAMINATION=$(grep -nE \
  '(use|prefer|avoid|never use|always use|do not use|switch to|stop using).{0,80}(\bGlob\b|\bGrep\b|context-mode|\bsubagent\b|\.jsonl)|(\bGlob\b|\bGrep\b|context-mode|\bsubagent\b|\.jsonl).{0,80}(use|prefer|avoid|instead|only|never)' \
  "{KG_PATH}/rules.md" 2>/dev/null)
```

Add a detection note comment immediately before the grep documenting the intentional false-negative tolerance.

## Root Cause

Detection pattern scoped too broadly — matched the tool name as a standalone signal. Tool names like "Glob", "Grep", and "subagent" appear in natural language at higher frequency than anticipated.

## Prevention

1. **Require context, not just presence.** A keyword alone is rarely a reliable signal for migration-gating decisions.
2. **Bias toward false negatives for destructive operations.** If the action on a match removes user content, under-detection is always safer than over-detection.
3. **Add a detection note comment** to every migration-gating grep explaining what it does and does not match.
4. **Write a false-positive smoke test** alongside the true-positive test for any pattern that gates a destructive migration.

## Applied In

`commands/init-shared/upgrade-inspector.md` — inspection pass and section d detection. Fixed in v0.3.5-beta.
