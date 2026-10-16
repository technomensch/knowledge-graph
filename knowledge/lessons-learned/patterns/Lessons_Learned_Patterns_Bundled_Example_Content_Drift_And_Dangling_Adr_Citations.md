---
title: "Bundled example content drifts like real data; ported patterns need their ADR citation verified"
date: 2026-09-17
version: 1.0
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: v0.7.10-fix-release-doc-sync-and-broken-links
  commit: b4b8cdd8
  pr: null
  issue: 60
tags:
  - meta-issue-tracking
  - example-content
  - documentation-drift
  - adr-citation
  - broken-links
  - self-audit
---

# Lesson: Bundled Example Content Drifts Like Real Data; Ported Patterns Need Their ADR Citation Verified

## Problem

While auditing broken links in this repo's own teaching content
(`docs/examples/meta-issue/example-performance-saga/`, the bundled worked example of the
tool's own "meta-issue tracking" pattern), the example itself turned out to be internally
inconsistent. `README.md`, `description.md`, `implementation-log.md`, and `test-cases.md`
all narrated a "3rd attempt" (connection pooling) as the successful resolution — with
specific, mutually consistent dates and metrics — but `attempts/003-connection-pooling/`
had never actually been committed. Only `001-baseline/` and `002-caching/` existed on
disk. Every prose file agreed with every other prose file; none of them agreed with the
filesystem.

Tracing the root cause further surfaced a second, unrelated-looking problem: the pattern's
origin document, cited everywhere in this repo and across chat history in multiple repos
as "ADR-008 Meta-Issue Tracking Pattern," did not exist in this repo. It was a dangling
citation. The real ADR was eventually located in a completely different, unrelated repo
(`optimize-my-resume`, `docs/decisions/ADR-008-meta-issue-tracking-pattern.md`, dated
2026-02-02) — the meta-issue pattern had been ported into this tool's
`commands/kmg-meta-issue.md` without ever porting the decision record that justified it.

## Root Cause

**Drift mechanism:** `commands/kmg-meta-issue.md`'s "SOP 1: Creating New Attempt Folder"
(`--add-attempt`) and `--log-attempt` only ever auto-updated `implementation-log.md`. They
never touched `README.md`'s summary table or `description.md`'s attempt-count field. Any
attempt added through the intended command path already had a hole in its own sync logic;
a hand-narrated example that also skipped the command path had nothing enforcing agreement
between the four files at all.

**Why it went undetected:** documentation consistency checks (link checkers, doc-impact
scans) verify that a link resolves, not that the destination's *content* agrees with the
content that references it. Four files independently telling the same convincing story
read as "consistent" to any check that isn't specifically diffing narrative claims against
committed folders. Nothing in this repo's pre-push or pre-ship gates was checking that.

**Dangling ADR citation:** citations of the form "Based on: ADR-X" are treated as already
resolved once written — nothing re-verifies that the named document exists in the
repository it's now living in. When a pattern (command file, skill, or template) is copied
from one project into a reusable tool, the copy carries the citation text but not
necessarily the cited file. Per this session's own knowledge-graph search, this specific
dangling reference had gone unverified since 2026-02-12, across many sessions and a second
repo, before this audit caught it.

## Solution

This session (branch `v0.7.10-fix-release-doc-sync-and-broken-links`):

1. Ported the real ADR into this repo as
   `knowledge/decisions/ADR-072-meta-issue-tracking-pattern.md`.
2. Fixed the 3 dangling `ADR-008` citations to point at `ADR-072`.
3. Patched `commands/kmg-meta-issue.md`'s SOP 1 (`--add-attempt`) and `--log-attempt` to
   sync `README.md` and `description.md` alongside `implementation-log.md`, closing the
   common-path version of the drift.
4. Authored the missing `attempts/003-connection-pooling/` files so the bundled example
   matches what its own prose has claimed all along.
5. Filed `issue-60` (Mode 3, deferred) — the patch only covers the two command-flag paths;
   a hand-created attempt folder, or a direct edit to any of the three files, still drifts
   silently. Real automatic detection (independent of how the attempt folder came to
   exist) remains unbuilt.

## Replication Pattern

**For bundled example/teaching content:**
- Treat a tool's own shipped examples as a data source that can go stale, not as static
  documentation. Anything that narrates state (a status field, a summary table, a
  "resolved via attempt N" claim) needs the same drift risk as real user data, because
  nothing about being example content makes it self-verifying.
- When multiple files narrate the same underlying fact (a folder, a count, a status),
  internal agreement between those files is not evidence of correctness — check each
  narrated claim against the actual filesystem/state it describes, not just against the
  other narrating files.

**For porting a pattern into a reusable tool:**
- When a command, skill, or template is copied from a source project into a general-purpose
  tool, treat "Based on: ADR-X" (or any similar origin citation) as a pointer that must be
  dereferenced and verified at port time, not carried as inert text. If the ADR doesn't
  travel with the pattern, either port it too or drop the citation until it can point
  somewhere real.
- A citation that has silently gone unverified across many sessions is a sign that nothing
  in the normal workflow ever needs to *open* the cited document — which is itself worth
  noticing, since it suggests the citation existed for provenance/audit purposes only and
  had no functional check depending on it.

## Related

- [[issue-60]] — tracks the deferred, not-yet-closed gap: sync only fires on
  `--add-attempt`/`--log-attempt`, not on hand-created attempt folders or direct edits.
- [[ADR-072-meta-issue-tracking-pattern]] — the ported decision record; its "Future
  Considerations" section records this exact limitation as an open automation opportunity.
- `commands/kmg-meta-issue.md` — SOP 1 / `--log-attempt`, patched this session to sync all
  three narrative files instead of only `implementation-log.md`.
- `docs/examples/meta-issue/example-performance-saga/` — the teaching-content example where
  this drift was first discovered and then repaired.
