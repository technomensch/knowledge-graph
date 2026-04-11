---
title: "Post-Migration Content Migration Offer — Scaffold is Not Enough"
date: 2026-04-10
version: v1.0
last-updated: 2026-04-10
tags: [migration, me-md, rules-md, content-migration, backfill, scaffold, init]
git-branch: v0.3.0-beta
git-author: technomensch
---

# Post-Migration Content Migration Offer — Scaffold is Not Enough

## Problem

After KMGraph migrates a docs/-based KG to knowledge/, it scaffolds me.md and rules.md as empty files. The post-migration flow only offered FTS5 rebuild, update-graph extraction, and personal KG setup - but never offered to populate me.md and rules.md from the user's existing CLAUDE.md. Users had to fill them in manually with no guidance, defeating the purpose of the content migration offer that exists in the new-install flow (Step 1.6.5).

The same gap existed at the personal KG level: after /kmgraph:init-personal-kg, personal me.md and rules.md scaffold empty with no offer to migrate from ~/.claude/CLAUDE.md.

## Root Cause

The post-migration block (step g/h) was designed incrementally - FTS5 rebuild and update-graph were added first, then personal KG prompt was added, but the Step 1.6.5 content migration offer (which exists in the new-install wizard) was never wired into the migration path. The new-install and migration code paths diverged silently: new-install had the content migration offer, migration did not.

## Solution

Added step h to the post-migration block: detects CLAUDE.md + scaffolded me.md/rules.md, and offers to run Step 1.6.5 content migration flow (show section mapping, confirm per section, backup original, rewrite CLAUDE.md to pointer). Personal KG prompt (step i) now notes: after personal KG is created, run the same offer with ~/.claude/CLAUDE.md as source and personal me.md/rules.md as targets (including MEMORY.md to personal me.md offer).

## When to Apply

Any time a scaffold flow creates identity/rules files (me.md, rules.md, or equivalent), immediately offer to populate them from the user's existing platform config. Signals that this applies:

- A migration or upgrade path creates files that also exist in the new-install wizard
- The new-install wizard has a "populate from existing config" step that the migration path lacks
- Users report that newly scaffolded files are empty after migration

## Pattern

Any scaffold flow that creates identity/rules files should immediately offer to populate them from existing platform config. Empty scaffold = wasted step.

More broadly: when two code paths (new-install vs migration) both create the same files, audit both paths for feature parity. The migration path tends to accumulate technical debt as new-install features are added incrementally without backporting to the migration case.

## Changelog

- v1.0 (2026-04-10) — Initial capture
