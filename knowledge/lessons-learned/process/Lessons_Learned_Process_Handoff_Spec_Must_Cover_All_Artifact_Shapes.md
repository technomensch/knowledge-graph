---
title: "Handoff Spec Must Cover All Artifact Shapes"
created: 2026-06-07T16:48:16.676Z
updated: 2026-06-07T16:48:16.676Z
author: technomensch
git:
  branch: v0.5.10-ux-session-handoff
  commit: a8dd1739fedf1f18e73e4f97eae24d71a0261c52
tags: [spec-writing, handoff, artifact-shapes, ENH-021, templates]
category: process
---
## Problem

[[ENH-021]] assumed a single handoff artifact — one `.md` file in `knowledge/sessions/YYYY-MM/` with YAML frontmatter. In reality the repo has two handoff shapes:

1. **Session-style** — a single `.md` file with YAML frontmatter
2. **Package handoff** — multi-file output under `./handoff-packages/YYYY-MM-DD/` with a `START-HERE.md` using markdown header fields (no YAML)

The spec only described shape 1. When implementing `continues_from`, it had to land in both shapes.

**Root cause:** The spec was written from the author's conceptual model of "the handoff" without auditing actual command output artifacts. One command can produce multiple artifact shapes — without checking the command output, a spec covers only the shape the author had in mind.

## Solution

Added `continues_from` to both shapes:
- YAML frontmatter field for session-style handoffs
- Header field in `START-HERE.md` for package handoffs

Documented both shapes in the [[ENH-021]] implementation notes.

## When to Apply

Before writing any spec that modifies a template or adds a field to an artifact type:

1. **Run the command** and inspect the output directory
2. **List every file and shape** the command produces
3. **If there are N shapes, the spec must address all N**

Signal: you are writing an ENH spec that touches a template, adds a frontmatter field, or modifies an existing artifact structure.

## Context

- Branch: `v0.5.10-ux-session-handoff`
- Commit: `a8dd1739`
- Related: [[ENH-021]], [[ADR-051-session-summary-handoff-asymmetric-coupling]], `commands/handoff.md`
- Category: process