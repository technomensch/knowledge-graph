---
id: issue-13
title: Solution Approach — No automated broken-link detection
status: partially-implemented
created: 2026-07-14
---

# Solution Approach: Issue-13

## Proposed Fix (not yet scoped for implementation)

A real build/link-check gate needs to exist somewhere in the pipeline that can actually fail on a broken link, replacing the current combination of a warn-only build config and a prose-matching skill that can't see links at all. Two non-exclusive candidate mechanisms:

1. **Flip `docusaurus.config.js`'s `onBrokenLinks`/`onBrokenMarkdownLinks` from `'warn'` to `'throw'`.** Simplest lever — makes the existing `npm run build` (both manual and the one CI already runs in `.github/workflows/docs.yml`) hard-fail on any broken link. Zero new tooling required.

2. **Add a real build gate to `scripts/pre-push-gate.sh`** (a new Gate 5, following the existing pattern of Gates 1-4) that runs `npm run build` and blocks/warns based on exit code, rather than only checking that the prose-matching `kmg-docs-impact-scan` skill ran.

Option 1 alone would satisfy most of the actual need, since CI already runs the build on every push — the only change needed is making that existing build authoritative instead of advisory. Option 2 adds a faster local feedback loop before push, but is not strictly required if option 1 is done.

## Why Not Implemented Now

**Sequencing constraint:** flipping `onBrokenLinks` to `'throw'` immediately would hard-fail the build today, because broken-link clusters 2 (`examples/lessons-learned/*` relative-path mismatch, ~10 files) and 3 (`example-performance-saga` meta-issue scaffold nav, ~6 files) are being deliberately deferred past v0.6.19 (see session summary `docs-site-broken-links-audit` snapshot, 2026-07-13/14). Turning on hard-fail before those are also fixed would either block all future docs-affecting pushes or force fixing all 45 links under time pressure — the opposite of the triage decision already made for the presentation deadline.

**Correct sequence:**
1. Ship v0.6.19 (fixes clusters 1+4 only).
2. Separately fix clusters 2+3 (own `docs-update-{description}` branch, no version bump needed — docs-only).
3. Only then implement this issue's fix (flip to `'throw'` and/or add the pre-push build gate), once the full-site build is genuinely clean and won't immediately break CI.

## Out of Scope

- Fixing the current 45 broken links themselves — tracked separately (v0.6.19 for clusters 1+4, session summary for deferred clusters 2+3).
- ENH-042's broader release-doc-sync reconciliation (version bump, README/ROADMAP/CHANGELOG sync) — adjacent finding, same root-cause *class* (documented rule, no enforcement) but a different subsystem, tracked in its own ENH.
- Building a general-purpose "docs quality" framework beyond link validity — scope stays narrow to broken-link detection specifically.

## Test Plan (once implementation is scoped)

- Confirm `npm run build` hard-fails (non-zero exit) when a broken link is deliberately introduced into a fixture doc page. **Still open** — this test applies to Option 1 (throw-mode), not yet done.
- Confirm the full site builds clean (0 broken links) before flipping `onBrokenLinks` to `'throw'` — this is the actual gating condition for doing this work at all. **Still open.**
- If a pre-push gate is added: verify it fires on a push containing a newly-broken link and does not fire on a clean push, mirroring the verification pattern already used for Gate 4 (github-issue-sync invariant, issue-11) — live test against a real throwaway fixture, not just code review.
  **Done, partially (2026-09-05):** verified Gate 8 fires against this branch's actual (pre-existing) broken links — confirms the "fires on broken" half. Did not additionally test against a clean-site push, since the live site currently has real broken links to detect; the "does not fire on a clean push" half is implied by the advisory logic (only appends a finding when `grep` matches "broken link" in the build output) but wasn't separately exercised against a synthetic clean fixture.

## Built (2026-09-05, branch v0.7.8-preflight-gate-hardening, Commit 5)

Implemented Option 2 (pre-push gate), not Option 1 (throw-mode) — see issue-13-description.md's "Partially Implemented" section for what shipped and why Option 1 stays deferred.
