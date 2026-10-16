---
title: "Store GitHub traffic history in a separate private metrics repo"
number: 73
created: 2026-10-16T21:07:42.222Z
status: Accepted
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: v0.7.10-fix-release-doc-sync-and-broken-links
  commit: 789e2029575ad2a135ef6b9d71efebb54232049a
  pr: null
  issue: null
implements: null
related:
  adrs: []
  lessons: []
  kg_entries: []
tags: [Architecture, metrics, github-traffic]
category: Architecture
---
## Context

GitHub keeps clone, view, and referrer traffic data for only 14 days, then discards it. The maintainer had no record of repo clones. The project has no npm package and no GitHub Releases, so traffic is the only usage signal. The knowledge-graph repo is public, so any branch in it (such as a metrics branch) would expose the numbers publicly.

## Decision

Create a private repo `technomensch/kmgraph-metrics` (local clone `~/GitHub/kmgraph-metrics`). A weekly GitHub Actions workflow (plus manual `workflow_dispatch` trigger) runs `scripts/collect.py` (Python standard library only), which reads the traffic API for `technomensch/knowledge-graph` and merges rows into `data/clones.csv`, `views.csv`, `referrers.csv`, `paths.csv`, and `repo-stats.csv`. Rows are keyed by date or snapshot date so reruns create no duplicates, and any API error exits non-zero so failures are visible.

Auth is a fine-grained personal access token (repo `knowledge-graph` only; Administration read-only plus Metadata read-only) stored as secret `TRAFFIC_TOKEN`, expiring 2027-10-16. GitHub rejects custom expiry dates over one year and silently shows "never expire", so verify the confirmation box. The workflow opens a "Renew TRAFFIC_TOKEN" issue 21 days before expiry (GitHub emails repo owners about new issues).

Nothing in knowledge-graph changes. The commit author in the metrics repo must use the GitHub noreply email, because the account blocks pushes that expose the real email.

## Rationale

Alternatives considered:

- **Metrics branch in knowledge-graph:** rejected. The repo is public, so the data would be public, and it adds branch clutter.
- **Orphan branch:** rejected. Same visibility problem.
- **Third-party tools (github-insights, GitHub Traffic Vault, GTH, browser extensions):** rejected. They would hand a token to outside code or only record while a machine is on, and the collector is about 100 lines.
- **Self-hosted database or cloud storage (e.g. DynamoDB):** rejected as overkill for one repo.
- **Workflow artifacts only:** rejected. They expire after at most 90 days, so there is no permanent history.
- **Release download counts or README badge:** not applicable (no releases) or skipped (public clone counts are noisy and would touch knowledge-graph).

## Consequences

- Permanent private traffic history from 2026-10-16 (the initial backfill covers the prior 14 days).
- One token renewal per year, with an automatic issue/email reminder.
- Clone counts include bots and CI, so unique clones are only a rough trend.
- A second repo to maintain, but it is tiny and self-running.
- GitHub disables scheduled workflows after 60 days of repo inactivity; the weekly data commit counts as activity and `workflow_dispatch` is the backstop.

## Implementation References

Commits in the kmgraph-metrics repo (not this one): `0b74831` (collector, workflow, backfill), `f0a9152` (renewal issue step), `34f6d48` (README). Local working plan: `knowledge/plans/knowledge-graph-metrics-repo.md` (gitignored).
