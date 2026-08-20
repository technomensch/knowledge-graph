---
title: "Dispatch, Don't Duplicate: Corpus-Verify Before Backfilling"
created: 2026-08-19T16:50:09.274Z
updated: 2026-08-19T16:50:09.274Z
author: technomensch
git:
  branch: v0.7.2-c3-issue-48-adr-dual-implementation
  commit: 4028c24a34333ee92cf0e2d9dda83cf290199067
tags: [kmgraph, adr, dual-implementation, dispatch, backfix, corpus-verification, issue-48]
category: patterns
---
## Problem

commands/kmg-create-adr.md and agents/create-adr-agent.md independently implemented ADR creation end-to-end (filename generation, frontmatter assembly, file write, index update, commit) instead of one dispatching to the other. They drifted: author/email nesting, commit_short presence, and the implements field (settable via wizard in the agent path, hardcoded null in the command path) all diverged between the two paths. Separately, the original fix plan proposed a kg_upgrade backfix migration to reshape author/email under a nested git: block on the theory that the command path produced that shape historically.

## Solution

Collapsed to a single implementation: commands/kmg-create-adr.md now dispatches to create-adr-agent with only the resolved level-routing flag and model (no context_provided payload), and the agent runs its own full 9-question wizard and owns the entire write path. The proposed backfix step was deleted before implementation — corpus-verifying all 70 existing ADRs showed 0 had the nested author/email shape the backfix targeted; both code paths and the canonical template had always used the top-level shape. Implementing the backfix as originally written would have reshaped 39 correctly-formed ADRs into a nesting no code path ever produced.

## When to apply

Two things worth generalizing: (1) When a command and an agent/subagent both know how to do the same multi-step task, prefer one dispatching to the other over parallel implementations — even when they start out in sync, they will drift, and the drift is often invisible until someone diffs the actual output. (2) Before implementing a "consistency backfix" or migration that's justified by a claimed historical divergence, corpus-verify the claim against real data first — a plausible-sounding schema mismatch documented in a spec/comparison table can be entirely fabricated, and a backfix built on a false premise doesn't converge existing data onto the correct shape, it invents a third, wrong one. Also watch for stale "TODO: this will be refactored" prose in a file's own header describing a dispatch mechanism that was never actually built — verify by reading the actual executable steps end-to-end, not by trusting the preamble.

## Context

- Branch: v0.7.2-c3-issue-48-adr-dual-implementation
- Commit: 4028c24a
- Category: patterns
