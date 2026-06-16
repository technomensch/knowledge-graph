---
title: Capture Router — Auto-Detect Type and Location from Content Signals
category:
  uri: uri-that-does-not-map-to-patterns
---

## Problem

"Capture that" / "remember that" have no defined routing. The model infers type and location from context with no consistency guarantee and no user visibility into where content lands.

## Solution

A capture-router skill that auto-detects type, subtype, and location from content signals in the preceding conversation, presents a single confirmation line, and routes on confirm or re-routes on natural language correction.

### Detection Logic

**Type signals:**
- Correction, preference, "don't do X", "always/never" → Feedback (memory)
- Ongoing work, deadline, stakeholder, in-progress state → Project (memory)
- External system pointer, URL, tool name + location → Reference (memory)
- Bug solved, pattern learned, "next time", "I learned" → Lesson
- Trade-off, "we decided", "because of", architecture choice → ADR

**Location signals (memory type only):**
- References this repo, specific files, KMGraph behavior → Project-level
- General Claude behavior, applies to any project → User-level

**Ambiguity:** if no clear type signal, surface the inferred referent and ask one clarifying question before routing.

### Confirmation Format

> "Capturing as: [Type] ([subtype], [location]) / [one-sentence summary] / Does that sound right, or should this go somewhere else?"

- Happy path: one round trip.
- Override path: natural language correction, no menu needed.

## When to Apply

Use this pattern whenever building a "quick capture" or "save this" command where:
- Content type is ambiguous at invocation time
- Multiple destinations exist (lessons, ADRs, memory files, references)
- User friction must be minimized
- The correct destination has meaningful downstream consequences for searchability

## Why It Matters

Low-resistance capture is only valuable if content lands in the right place. Menus add friction. Auto-detect + single confirmation minimizes friction while keeping the user in control.

## Context

- Branch: v0.2.3-beta
- Commit: 4071bfe8
- Category: patterns
- Related: ENH-008, doc-update-router (same pattern: auto-route with disambiguation fallback)
