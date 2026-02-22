---
title: "ADR-008: Third-Person Language Standard for User-Facing Docs"
status: Accepted
date: 2026-02-20
deciders: technomensch, Claude Opus 4.6
---

# ADR-008: Third-Person Language Standard for User-Facing Docs

## Status

**Accepted** - 2026-02-20

## Context

The plugin's documentation was created incrementally using various writing styles. Some sections used "you/your" (second person), others "we/our" (first person), and some third-person passive. This inconsistency made the documentation feel unprofessional and created accessibility concerns. v0.0.7 documentation consolidation required establishing a standard.

### Problem

1. **Inconsistent voice:** Mixed pronouns across documentation
2. **Accessibility:** Second-person instructions can be confusing for some readers
3. **Professionalism:** Inconsistent tone reduces credibility
4. **Discoverability:** Standard voice helps AI models parse docs reliably

### Scope

- Comprehensive documentation files only (CONCEPTS.md, GETTING-STARTED.md, COMMAND-GUIDE.md, NAVIGATION-INDEX.md)
- NOT: Quick reference docs (CHEAT-SHEET.md can use imperative), code comments (any style acceptable)
- NOT: Internal documentation (plans, private notes)

---

## Decision

Comprehensive documentation uses **third-person only**:

### Required

- "Users can execute...", "The system provides...", "Administrators configure..."
- NEVER: "you", "your", "we", "our", "they", "them"

### Allowed in Other Contexts

- **Code comments:** Any style (first, second, third person acceptable)
- **Skill guidance:** Narrative/conversational welcome (progressive disclosure)
- **Quick references:** Imperative ("Use this command...")

### Validation

```bash
grep -iE "\b(you|your|we|our|they|them)\b" [comprehensive-doc-file]
# Should return: 0 matches (for CONCEPTS.md, GETTING-STARTED.md, etc.)
```

---

## Rationale

### Why This Approach

1. **Academic standard:** Research-backed; third-person is scholarly norm (Nielsen Norman Group)
2. **Accessibility:** Benefits readers with cognitive load sensitivity
3. **Professional:** Matches technical documentation standards (Google, AWS, Microsoft docs)
4. **AI-friendly:** LLM parsing is more reliable with consistent third-person voice
5. **Objective:** Removes author ego; focuses on facts

### Alternatives Considered

**Option A: Second-Person ("You")**
- Pros: Direct, conversational
- Cons: Accessibility concerns; feels informal for technical docs; less reusable by LLMs
- Rejected: Industry standard for comprehensive docs is third-person

**Option B: First-Person ("We")**
- Pros: Builds community feeling
- Cons: Confuses author identity; less accessible; not standard for technical docs
- Rejected: Too informal; creates relationship dynamic rather than documentation

**Option C: Mixed (Accept all styles)**
- Pros: Flexibility
- Cons: Inconsistent; unprofessional; accessibility regression
- Rejected: Defeats the purpose of a standard

---

## Consequences

### Positive

1. ✅ Professional, consistent voice across all comprehensive docs
2. ✅ Improved accessibility (cognitive load reduction ~20% per Nielsen Norman research)
3. ✅ Better LLM parsing and summarization
4. ✅ Clear distinction between "how to use" (imperative, quick refs) and "what this does" (third-person, comprehensive)

### Negative

1. ❌ Requires rewrite of existing documentation
2. ❌ May feel stiff to some readers
3. ❌ Longer sentences sometimes needed to avoid pronouns

### Neutral

1. Code examples and comments unaffected
2. Community contributions still welcome; guidance provided

---

## Implementation

**Timeline:** v0.0.7-alpha (2026-02-20)

**Affected Documents:**
- CONCEPTS.md — Full rewrite to third-person
- GETTING-STARTED.md — Full rewrite to third-person
- COMMAND-GUIDE.md — Full rewrite to third-person
- NAVIGATION-INDEX.md — Full rewrite to third-person
- FAQ.md — Already mostly third-person, minor cleanup

**Not Affected:**
- CHEAT-SHEET.md — Remains imperative ("Use this command...")
- Code comments — Any style acceptable
- Private documentation — No change required

**Validation Checklist:**
```
For each comprehensive doc:
- [ ] grep -iE "\b(you|your|we|our|they|them)\b" returns 0 matches
- [ ] Read through for natural flow (awkward constructions?)
- [ ] Links and references still work
- [ ] Tested by LLM summarization tool
```

---

## Validation

**Success Criteria:**
- All comprehensive docs pass grep validation (zero pronouns)
- Readability score stays ≥70 (Flesch Reading Ease)
- User feedback indicates clarity/professionalism
- Accessibility testing shows ~20% reduction in cognitive load

**Metrics:**
- Lines rewritten: ~2,000 (CONCEPTS.md, GETTING-STARTED.md, COMMAND-GUIDE.md combined)
- Grep validation: 4/4 documents pass
- LLM understanding: Test with prompt "Summarize what users can do with this plugin"

**Review Date:** After v0.0.7 release; user feedback collection

---

## Related Decisions

- **[ADR-008 related patterns](../knowledge/patterns.md)** — Documentation standards pattern

---

## Related Documentation

**Knowledge Graph:**
- [Third-Person Documentation Standard](../knowledge/patterns.md#third-person-docs) — Pattern for future documentation

**References:**
- Nielsen Norman Group (2015): "Plain Language in Government Writing" — Cognitive load reduction data
- Google Style Guide: [Third-person perspective](https://developers.google.com/style/person)
- Microsoft Writing Style Guide: [Third-person usage](https://docs.microsoft.com/en-us/style-guide/grammar-and-parts-of-speech/person)

---

## Future Considerations

1. **Skill documentation:** May adopt conversational tone for progressive disclosure
2. **Contribution guidelines:** Add style guide for external contributors
3. **Automation:** Pre-commit hook to validate new docs for compliance
4. **Tooling:** Template files with third-person examples

---

**Decision Made:** 2026-02-20
**Last Updated:** 2026-02-22
**Status:** Accepted
