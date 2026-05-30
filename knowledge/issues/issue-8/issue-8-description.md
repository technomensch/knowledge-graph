---
id: issue-8
type: Enhancement
status: in-progress
branch: v0.5.9.3-docs-enforcement-protocol-gap
created: 2026-05-30
related-adrs: [ADR-013, ADR-021, ADR-036]
related-enhs: [ENH-015]
target-release: v0.5.9.3
---

# Issue-8: Docs Update Enforcement 3-Gate Fix

## Problem

Three enforcement gaps allow docs/version drift to reach `origin` unchecked:

1. **Gate 1 — Plan cross-reference:** Nothing verifies that affected user-facing doc pages are identified during plan creation. ADR-013 mandates a `## Docs Impact` section in plan files, but no mechanism enforces it.

2. **Gate 2 — Version-sync:** No automated check that `package.json` and `.claude-plugin/plugin.json` are bumped consistently before push. README/CHANGELOG version references also go unchecked.

3. **Gate 3 — docs-impact-scan pre-push:** ADR-036 ships the `kmgraph:docs-impact-scan` skill but it is phrase-triggered only. A push can happen without the scan ever running. ADR-036 explicitly notes this gap as requiring a fix.

## Gates

| Gate | Mechanism | Hook Type | Script |
|---|---|---|---|
| Gate 1 — Plan cross-ref | Check `## Docs Impact` heading in plan files | PostToolUse Write\|Edit | plan-docs-xref-check.sh |
| Gate 2 — Version-sync | Compare version in package.json vs plugin.json | PreToolUse Bash (git push) | pre-push-gate.sh |
| Gate 3 — Scan pre-push | Check per-commit flag written by docs-impact-scan skill | PreToolUse Bash (git push) | pre-push-gate.sh |

## Acceptance Criteria

- [ ] plan-docs-xref-check.sh fires advisory reminder when `## Docs Impact` absent from plan file
- [ ] plan-docs-xref-check.sh is silent when section present or on non-plan writes
- [ ] per-file-hash idempotency: no re-injection on unchanged content
- [ ] pre-push-gate.sh detects version drift between package.json and plugin.json
- [ ] pre-push-gate.sh checks docs-impact-scan per-commit flag and injects reminder when absent
- [ ] pre-push-gate.sh output via `hookSpecificOutput.additionalContext` (not systemMessage)
- [ ] pre-push-gate.sh fires only on git push token; git commit does not trigger it
- [ ] docs-impact-scan SKILL.md Step 8 writes per-commit flag on completion
- [ ] All scripts graceful no-op when optional files absent (ENH-016 fallback pattern)
- [ ] validate-plugin.sh passes

## Related

- ADR-013: Documentation Update Protocol (pinned `## Docs Impact` heading constant)
- ADR-021: DRY Documentation (version-sync advisory + gate cross-refs)
- ADR-036: docs-impact-scan Skill (Proposed → Accepted in this release; Gate 3 implements)
- ENH-015: Decision Governance Protocol (Rule 4 — docs changes grouped)
