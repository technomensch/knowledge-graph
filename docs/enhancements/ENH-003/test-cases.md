---
title: "ENH-003 Test Cases"
---

# ENH-003 Test Cases

## TC-001: Update named doc
- Input: "update GETTING-STARTED.md"
- Expected: Skill fires, resolves path to `docs/GETTING-STARTED.md`, routes to `/kmgraph:update-doc --user-facing docs/GETTING-STARTED.md`

## TC-002: Update session summary (explicit)
- Input: "update today's session summary"
- Expected: Skill fires, routes to `/kmgraph:session-summary`

## TC-003: Update current session
- Input: "update the current session"
- Expected: Skill fires, routes to `/kmgraph:session-summary`

## TC-004: Update changelog
- Input: "update the changelog"
- Expected: Skill fires, routes to `/kmgraph:update-doc --user-facing CHANGELOG.md`

## TC-005: Ambiguous request
- Input: "update the docs"
- Expected: Skill fires, asks "Which doc would you like to update?", then routes to `/kmgraph:update-doc --user-facing`

## TC-006: No false trigger on code update
- Input: "update the function to handle nulls"
- Expected: Skill does NOT fire

## TC-007: No false trigger on generic update
- Input: "let's update"
- Expected: Skill does NOT fire

## TC-008: session-wrap not duplicated
- Input: "I'm wrapping up for today"
- Expected: `session-wrap` fires (not `doc-update-router`)

## TC-009: New routing row
- Add: "update the ADR" → `/kmgraph:create-adr`
- Expected: Skill fires on "update the ADR", routes correctly — no other test cases break
