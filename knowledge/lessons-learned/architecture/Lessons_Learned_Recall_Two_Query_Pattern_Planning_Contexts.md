## Problem

During planning for a feature amendment (v0.5.9, recall enforcement in planning contexts), recall was invoked with a single topic query — "recall in planning" — and failed to surface two directly relevant documents:

- **[[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]]** — platform-agnostic rules as source of truth (vocabulary: "platform-agnostic", "source of truth", "deployment", "two-level hierarchy")
- **[[ENH-016]]** — rules file split specification (vocabulary: "rules file split", "auto-split")

This caused two cascading errors in the resulting plan:
1. Task B targeted the wrong file (`~/.kmgraph/rules.md` instead of `~/.kmgraph/plan-rules.md`) — the split had already been applied per [[ENH-016]]
2. Task B2 was missing entirely — the rule was not written to `knowledge/rules.md` (in-repo, deployed with the plugin to all LLMs and users), which [[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]] requires

## Solution

Planning-context recall must run **two queries**, not one:

1. **Specific topic query** — the feature or bug being planned (e.g., "recall in planning contexts")
2. **Architectural domain query** — the broader structural domain the change touches (e.g., "deployment platform rules structure cross-LLM two-level hierarchy")

The second query catches architectural decisions (ADRs) and enhancements (ENHs) whose vocabulary does not overlap with the specific topic. Semantic gap between topic phrasing and decision-record vocabulary is the failure mode.

## When to apply

Apply this pattern whenever starting a plan that involves:

- Any file that could be governed by an architecture decision (ADR)
- Rules files, configuration files, or deployment artifacts
- Anything described as "platform-agnostic", "cross-LLM", "source of truth", or "hierarchy"
- Any enhancement that may have already been partially or fully implemented

Signal: if a single topic recall returns fewer than 2 results, always run a second query using the architectural domain vocabulary of the change.

## Context

- Branch: main
- Commit: 39798b98
- Category: architecture
- Tags: recall, planning, query-strategy, two-query-pattern, [[ADR-028-me-and-rules-as-platform-agnostic-source-of-truth]], [[ENH-016]]
