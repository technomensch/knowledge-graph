---
title: "Skill Auto-Triggers Miss Process Vocabulary — Only Fire on Outcome Vocabulary"
created: 2026-03-30T13:58:57.789Z
updated: 2026-03-30T13:58:57.789Z
author: technomensch
git:
  branch: v0.2.2-beta
  commit: 9a2f626063b6b3d5f3b3b3b3b3b3b3b3b3b3b3b3
tags: [kmgraph, skill-triggers, lesson-capture, adr-guide, UX, process-vocabulary, auto-trigger]
category: patterns
---
## Problem

The `lesson-capture` and `adr-guide` skills use keyword matching tuned to outcome/resolution
language ("figured it out", "the fix was", "should we use", "decision between"). During a
session where the user identified UX failures in `start-issue-tracking` through observation
and correction — "noticed that", "correction — this should be decoupled", "this is a gap" —
neither skill triggered. The patterns and decisions were clearly present but the vocabulary
didn't match.

## Solution

Expand skill trigger lists to cover process vocabulary: gap identification ("this is a gap",
"noticed that", "this doesn't work because"), design correction ("correction", "this should
be", "here's what it should look like instead"), and pattern identification during active
use — not just post-resolution or explicit-choice framing.

## Pattern

Any auto-trigger system needs two vocabulary registers — *outcome vocabulary* (resolution,
choice-framing) AND *process vocabulary* (observation, correction, gap-naming). Tuning only
for outcomes silently misses the conversations where insights are most actively being formed.

## When to apply

- When adding or refining trigger patterns in any skill
- When a session ends and you notice lessons were formed but no skill fired
- When writing new auto-trigger skills for observation-heavy workflows

## Context

- Branch: v0.2.2-beta
- Commit: 9a2f6260
- Category: patterns