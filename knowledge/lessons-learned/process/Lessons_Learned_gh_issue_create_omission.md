---
title: "gh issue create omission in start-issue-tracking Step 5"
date: 2026-05-30
version: 1.0
tags:
  - github-cli
  - issue-tracking
  - start-issue-tracking
  - workflow-gap
  - frontmatter
---

# Lesson: gh issue create omission in start-issue-tracking Step 5

## Problem

`/kmgraph:start-issue-tracking` Step 5 called `gh pr create --draft` but never called `gh issue create`. The original implementation (commit `4641faab`, `v0.0.5-alpha`) conflated issue creation with PR creation. As a result, every ENH and issue created since that version had `github-issue: null` or `"TBD"` in its spec frontmatter — never backed by a real GitHub issue tracker entry. The omission was silent: no error fired, the field simply stayed null.

## Root Cause

`gh pr create --draft` requires a branch to already exist and creates a pull request, not a tracker issue. The original author wrote that call at Step 5 without adding a preceding `gh issue create` call. Because `github-issue: null` is valid YAML and the workflow never validated the field against GitHub, the gap went undetected across all subsequent ENH and issue specs.

## Solution

In v0.5.9.2 (commit `3fcb4428`), a new **Step 5.0** was inserted before branch creation:

1. Call `gh issue create --body-file {spec}.md --label {label}` and capture the returned URL.
2. Extract the issue number with `basename` applied to the URL.
3. Write the issue number and URL back into the spec frontmatter using `sed -i.bak`.

For ENH specs the path convention is `enhancements/ENH-NNN/ENH-NNN-specification.md`; a note in Step 5.0 covers this variant explicitly.

The PR creation call (`gh pr create --draft`) is retained in the original Step 5 position — it now runs after the issue exists, so the PR can reference the issue number in its body.

## Replication Pattern

Any workflow that writes `github-issue: null` as a placeholder and then calls only `gh pr create` will reproduce this gap. The pattern to follow instead:

1. Create the issue first (`gh issue create`) — this produces the canonical tracker URL and number.
2. Capture and immediately persist the returned number into the spec file.
3. Create the branch and draft PR referencing that number.

Never rely on a deferred fill-in for `github-issue`; the field should be populated in the same step that creates the spec file.

## Related

- [[issue-5]] — tracks the detection and backfill work for specs with null issue numbers
- [GitHub #124](https://github.com/technomensch/knowledge-graph/issues/124) — upstream tracker entry for this fix
- [[ADR-024]] — decision record governing spec frontmatter schema requirements
- [[ENH-017]] — enhancement that exposed the null field during its own creation workflow
