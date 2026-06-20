---
title: "ENH-FUTURE: Cross-platform automatic capture-type identification"
created: 2026-06-19T21:56:13.548Z
updated: 2026-06-19T21:56:13.548Z
tags: [enhancement, capture, cross-platform, adr-guide, lesson-capture, AGENTS.md, GEMINI.md, codex, gemini, auto-trigger, brainstorm-required]
category: process
---
## Enhancement Idea

Automatically suggest the right capture type (lesson, ADR, or ENH) after relevant conversation patterns — across all supported platforms.

## Problem

On Claude Code, `lesson-capture` and `adr-guide` skills auto-trigger suggestions. On Codex, Gemini, Copilot, and Cursor those skills don't exist — capture suggestions never surface. Users must manually recognize when a capture is warranted and know which type to use.

The plugin advertises automatic knowledge capture as a feature, but it's only automatic on Claude Code today.

## Scope Questions (need brainstorm before spec)

- **ENH type doesn't exist** in `kg_capture` — ENH specs are hand-written markdown files. Does a `type=enhancement` need to be added to the tool, or is a different approach right?
- **What "automatic" means per platform:** Skills (Claude Code) vs. AGENTS.md/GEMINI.md trigger instructions vs. hook-based detection
- **ENH detection is hardest** — "this conversation identified a new enhancement" is a judgment call, not a detectable pattern. How to signal reliably?
- **Pattern library:** What conversation signals map to each type? (architectural decision → ADR, new feature scope → ENH, bug fix/breakthrough → lesson)

## Proposed Approach (sketch, not decided)

Pattern-based trigger instructions added to each platform template file (`AGENTS-template.md`, `GEMINI.md` equivalent, etc.):
- After architectural decision → suggest ADR
- After new feature scope discussion → suggest ENH (or lesson tagged `enhancement` until ENH type exists)
- After bug fix or breakthrough → suggest lesson

## Status

Tabled — brainstorm required before any spec or implementation. Prerequisite: decide whether `kg_capture` needs a native `type=enhancement`.
