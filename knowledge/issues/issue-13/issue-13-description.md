---
id: issue-13
type: Hardening
status: deferred
github-issue: "#170"
branch: none
created: 2026-07-14
---

# Issue-13: No automated broken-link detection anywhere in the docs pipeline

## Problem

Confirmed 2026-07-14, while auditing the docs site ahead of a v0.6.19 presentation-polish release: a real `npm run build` found 45 broken links in the live Docusaurus build. Investigation found this is not an isolated miss — **no mechanism in this project's pipeline is capable of catching a dead link, at any stage, manual or automated.** The root cause (ADR-027's Diátaxis restructure, which deleted/split `GETTING-STARTED.md`) dates to 2026-04-08 — these links have likely been broken and silently deployed to production for roughly 3 months.

## Root Cause — three independent mechanisms checked, all confirmed insufficient or missing

1. **`docusaurus.config.js` has `onBrokenLinks: 'warn'` and `onBrokenMarkdownLinks: 'warn'`** (confirmed via direct grep). This means no build — manual or CI — can ever hard-fail on a broken link; both settings only emit a warning and let the build succeed.

2. **`skills/kmg-docs-impact-scan/SKILL.md` does prose-identifier matching, not a build or link check.** Its workflow extracts changed identifiers from `git diff main...HEAD` (command names, feature names, flag names) and greps doc prose for references to those identifiers. It never runs `npm run build`, never invokes Docusaurus, and has no concept of a "broken link" as a category of finding — structurally incapable of catching a dangling relative path or dead file reference, which is exactly what all 45 broken links are.

3. **`scripts/pre-push-gate.sh` has no docs-build gate at all.** Of its 4 gates: Gate 2 is version-sync, Gate 3 only checks that a flag file exists proving the prose-matching skill *ran* (not that anything it found was clean), Gate 4 is the github-issue-sync invariant (issue-11), unrelated to docs content. None of the 4 gates shells out to `npm run build` or inspects Docusaurus build output in any way.

4. **`.github/workflows/docs.yml`** runs `npm install && npm run build` on every push to `main` and deploys to GitHub Pages regardless of build warnings. With `onBrokenLinks: 'warn'`, this workflow has been structurally unable to ever fail on broken links — it has been silently deploying a broken-link site to production on every push since this config was set this way.

5. **Important nuance — this is not a "zero rule" blind spot.** `knowledge/rules.md` (§ "Pre-PR Doc Verification") already documents the expectation: *"...then run `npm run build` and confirm no new warnings"* before creating a doc PR. A documented human-facing rule exists and would have caught this — but it is prose-only, unenforced by any hook or gate (unlike Gate 3's flag-file mechanism for the docs-impact-scan skill), and scoped to doc files touched *in the current diff* rather than a full-site link audit. That gap between "documented expectation" and "automated enforcement" is the actual mechanism that let 45 links accumulate silently: any individual PR could plausibly skip the manual `npm run build` step (or run it and not act on warn-level output) with zero automated consequence, and CI's build+deploy wouldn't block it either way.

**Precise attribution:** a combination, not a single root cause. `onBrokenLinks: 'warn'` means no build anywhere can hard-fail; `kmg-docs-impact-scan` does prose-matching, structurally unable to detect dead links regardless of the warn/throw setting; `pre-push-gate.sh` has zero gates that invoke a build or link check. The one documented rule that comes closest is unautomated and diff-scoped, not site-wide.

## Related

- ADR-027 (root cause of the current 45 broken links themselves — separate from this issue, which is about detection, not the current link content)
- `knowledge/enhancements/ENH-042/ENH-042-specification.md` (adjacent finding: release-doc-sync mechanisms are similarly fragmented — same class of "documented rule, no enforcement" gap)
- v0.6.19 polish release (`docs/specs/2026-07-14-v0.6.19-polish-release-design.md`) — fixes the *current* 45 links (a subset, clusters 1+4), explicitly does not build the detection mechanism this issue tracks
- ROADMAP.md § Outstanding Action Items — this finding is also tracked there as a pointer to this issue

## Explicitly Deferred (Mode 3 — Track only)

No implementation plan, no branch. This issue documents the finding for later scheduling. Sequencing note: any fix here (e.g. flipping `onBrokenLinks` to `'throw'`) should land *after* broken-link clusters 2 and 3 (the examples/ relative-path mismatch and meta-issue scaffold nav, deferred separately — see session summary `docs-site-broken-links-audit` snapshot) are also fixed, since flipping to `'throw'` immediately would hard-fail CI on those still-broken clusters.
