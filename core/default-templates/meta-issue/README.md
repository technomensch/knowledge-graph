# Meta-Issue: [Problem Title]

**Navigation**: [Home](../../../README.md) > [Getting Started](../../../docs/GETTING-STARTED.md) > [Manual Workflows](../../docs/WORKFLOWS.md) > Templates

**Domain:** [architecture | performance | data | debugging]
**Scope:** [version-range or "ongoing"]
**Created:** YYYY-MM-DD
**Status:** [Investigating | Resolved | Abandoned]
**Current Understanding:** [One-sentence current belief about root cause]

---

## Navigation

- [Problem Description](description.md) — Living document (updated as understanding evolves)
- [Implementation Log](implementation-log.md) — All attempts chronologically
- [Test Cases](test-cases.md) — Validation scenarios
- [Attempts](attempts/) — Numbered folders with detailed results
- [Analysis](analysis/) — Root cause evolution, timeline, lessons

---

## Quick Summary

**Problem:**
[One paragraph describing the core issue]

**Current Status:**
- **Attempts:** [N] ([X] failed, [Y] successful, [Z] in progress)
- **Latest Understanding:** [Current root cause hypothesis]
- **Next Steps:** [What's being tried next]

---

## Attempts

<!-- One line per attempt. Full detail belongs in attempts/NNN-*/attempt-results.md;
     chronological narrative belongs in implementation-log.md. Do not expand entries here. -->

[Auto-populated from implementation-log.md]

1. **[001-baseline](attempts/001-baseline/)** — [Status] — [Brief outcome]
2. **[002-approach](attempts/002-approach/)** — [Status] — [Brief outcome]

---

## Key Insights

[Cross-references to KG entries and lessons]

- [Pattern discovered](../../knowledge/patterns.md#pattern-name)
- [Gotcha identified](../../knowledge/gotchas.md#gotcha-name)
- [Lesson learned](../../lessons-learned/category/lesson.md)

---

## Related Issues

- [GitHub #XXX](related-issues/github-links.md) — [Context]
- [Local issue-YYY](../issue-YYY.md) — [Context]

---

## How to Use This Meta-Issue

1. **Add attempt:** Create new `attempts/NNN-name/` folder **and** append its `## Attempt NNN`
   entry to `implementation-log.md` together, as one step — `/kmgraph:kmg-meta-issue
   --add-attempt` does both atomically for this reason. Doing only one half is the single most
   common way this convention drifts out of sync (issue-45).
2. **Update understanding:** Edit `analysis/root-cause-evolution.md` when beliefs shift
3. **Extract lessons:** Create lessons-learned when patterns emerge
4. **Sync to KG:** Run `/kmgraph:kmg-update-graph` to extract insights

---

## Learn More

**Concepts & Guides**:
- [Concepts Guide](../../../docs/CONCEPTS.md#meta-issue) - Term explanations
- [META-ISSUE-GUIDE.md](../../docs/META-ISSUE-GUIDE.md) - Full meta-issue guide

**Resources**:
- [Real Examples](../../examples/meta-issues/) - Real-world samples
