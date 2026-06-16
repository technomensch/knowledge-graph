---
type: Hardening
---

# Solution Approach: issue-3

## Summary

Add a post-CHANGELOG gate to `commands/update-issue-plan.md` that detects new version entries and requires version sync before committing.

## Changes Required

### `commands/update-issue-plan.md` — Step 5 (Final Governance Audit)

After writing/updating CHANGELOG.md, add the following sub-step before staging the commit:

**New sub-step: Version Sync Gate**

```
After updating CHANGELOG.md:
1. Check whether a new version header was added (grep for "## \[" lines added in the diff)
2. If a new version header is present:
   a. Display: "⚠️ New version [X.Y.Z] added to CHANGELOG. Version sync required before commit."
   b. List all files that must be bumped:
      - package.json
      - mcp-server/package.json
      - .claude-plugin/plugin.json
      - .claude-plugin/marketplace.json — plugins[0].version only (top-level "version" is marketplace schema — do NOT bump)
      - docs/CHEAT-SHEET.md footer
      - docs/COMMAND-GUIDE.md footer
      - docs/GETTING-STARTED.md footer
      - docs/CONCEPTS.md — version reference if present
   c. Ask: "Run version sync now? (yes / skip)"
   d. MANDATORY GATE: Do not commit until user responds.
   e. If yes: run version sync across all files, then include them in the commit.
   f. If skip: warn "Version sync skipped — CHANGELOG will be out of sync with version files."
3. If no new version header: proceed to commit normally.
```

## Detection Logic

```bash
# Detect if a new version header was added to CHANGELOG
git diff --cached CHANGELOG.md | grep "^+## \[" | grep -v "^\+\+\+"
```

If this returns any lines, a new version was added and sync is required.

## Acceptance Criteria

- [x] `update-issue-plan` detects new version headers in CHANGELOG diff
- [x] Gate fires before any commit when a new version is detected
- [x] All 8 version files/footers are listed in the prompt (including CONCEPTS.md)
- [x] User must explicitly respond before commit proceeds
- [x] Skip path warns user of sync gap
- [x] No change in behavior when CHANGELOG is updated without a new version header

## Additional Findings (Opus analysis, 2026-04-07)

Opus identified that the root cause of both issue-2 and issue-3 is the same: **`start-issue-tracking` treats tracking as a terminal state** rather than a transition state. The fix to `update-issue-plan` (this issue) addresses the symptom; the structural fix is in ENH-004 (start-issue-tracking redesign), which adds:
- Mode selection gate: "Implement then Track" / "Track then Implement" / "Track only"
- Pre-flight working-tree check
- Exit handoff banner with explicit next-action commands
- `status:` field on issue description template
