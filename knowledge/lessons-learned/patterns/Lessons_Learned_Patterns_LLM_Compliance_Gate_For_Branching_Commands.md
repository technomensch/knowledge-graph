---
title: LLM Compliance Gate for Branching Commands
created: 2026-06-21T00:00:00.000Z
updated: 2026-06-21T00:00:00.000Z
tags: [pattern, compliance-gate, slash-commands, init, LLM-behavior, ENH-028]
category: patterns
---
# LLM Compliance Gate for Branching Commands

## Problem

When a slash command contains a branching conditional written as prose ("if X is found, present menu Y; otherwise proceed to wizard"), LLMs under forward momentum skip the conditional branch entirely and jump to the primary flow.

Observed in v0.6.5 live testing: `/kmgraph:kmg-init` detected an existing KG, skipped the existing-KG menu, and ran the FTS5 rebuild and wiki pass as if it were a fresh install. The upgrade-inspector was never reached.

The problem is not logic — the conditional is correct. The problem is framing: prose conditionals read as ambient context, not mandatory execution barriers.

## Solution

Replace the prose conditional with a **MANDATORY STOP gate** using all three of:

1. **Visual prominence** — warning callout (blockquote with ⚠️) and ALL-CAPS keyword (STOP)
2. **Explicit prohibition** — name exactly what must NOT happen ("Do NOT run any initialization, scaffolding, FTS5, or wiki steps yet")
3. **Explicit requirement** — name exactly what MUST happen ("You MUST present the menu below before proceeding") and state that forward execution is blocked ("Do not proceed past this point until the user has entered a selection")

Applied in v0.6.6 to `commands/kmg-init.md` and `commands/kmg-init-personal-kg.md` ([[ENH-028]]) to gate the existing-KG detection branch.

## When to Apply

Use this pattern for any command section where:
- A detection check can branch to a non-trivial interactive flow
- Skipping the branch causes meaningful harm (data loss risk, missed upgrade, bypassed safety check)
- The conditional is currently written as prose ("if X... then Y")

## Gate Template

```
> ⚠️ **STOP — [CONDITION DETECTED]**
>
> [Brief description of what was found.]
>
> **You MUST present the menu below before proceeding.**
> **Do NOT run any [specific forbidden steps] yet.**
> **Wait for the user to select an option.**

[Menu block]

**Do not proceed past this point until the user has entered a selection.**
```

## Related

- [[ENH-028]] — the specific compliance gap that prompted this lesson
- v0.6.5 live testing — compliance gap discovered during init of an existing project KG
- [[ADR-053-kmg-prefix-cross-platform-naming]] — parity constraint between kmg-init.md and kmg-init-personal-kg.md
