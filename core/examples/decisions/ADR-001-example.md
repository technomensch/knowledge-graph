<!-- THIS IS AN EXAMPLE — Replace with your project's ADRs -->

# ADR-001: Dual-Format Documentation Strategy

**Status:** Accepted  
**Date:** 2024-05-15  
**Authors:** Development Team

---

## Context

Project documentation serves two distinct audiences with conflicting optimization needs:

### Audience 1: Large Language Models (LLMs)
- **Needs:** Structured, parseable content with clear hierarchies
- **Optimal format:** XML or strict structured format
- **Use case:** System prompts, context engineering, agent instructions
- **File extension:** `.txt` (to prevent markdown interpretation)

### Audience 2: Human Developers
- **Needs:** Readable, scannable content with rich formatting
- **Optimal format:** Markdown with headings, lists, code blocks
- **Use case:** Documentation, guides, README files
- **File extension:** `.md` (standard for documentation)

### The Tension

Optimizing for one audience degrades experience for the other:

- **XML for LLMs** → Hard for humans to read (verbose, tag-heavy)
- **Markdown for humans** → LLMs can parse but not optimal (less structured)

### Attempted Solutions That Failed

**Option 1: Single format optimized for LLMs**
- Result: Humans stopped reading documentation
- XML too verbose for quick reference
- Lost adoption

**Option 2: Single format optimized for humans**
- Result: LLM parsing less reliable
- Markdown allows structural ambiguity
- Increased LLM errors

**Option 3: Auto-generation from single source**
- Tried converting XML → Markdown automatically
- Lost semantic information in conversion
- Markdown couldn't round-trip back to XML

---

## Decision

**Maintain dual-format documentation where needed:**

### When to Use Each Format

<params>
<format type="txt-xml">
  <use-for>
    <item>System prompts and agent instructions</item>
    <item>Configuration with complex nested structure</item>
    <item>Content requiring strict validation</item>
    <item>LLM context engineering documents</item>
  </use-for>
  <audience>Primary: LLMs | Secondary: Advanced users</audience>
</format>

<format type="md-markdown">
  <use-for>
    <item>Lessons learned and ADRs</item>
    <item>README files and guides</item>
    <item>Session summaries and documentation</item>
    <item>Knowledge graph entries</item>
  </use-for>
  <audience>Primary: Humans | Secondary: LLMs</audience>
</format>
</params>

### Format-Specific Guidelines

**For `.txt` (XML) files:**
- Use semantic tags (`<context>`, `<constraint>`, `<rule>`)
- Include documentation comments for human readers
- Validate against schema where possible
- Accept verbosity as necessary trade-off

**For `.md` (Markdown) files:**
- Use consistent heading hierarchy
- Include frontmatter for structure (YAML)
- Use code blocks with language tags
- Accept some parsing ambiguity

### No Synchronization Required

- Dual formats serve DIFFERENT purposes (not duplicates)
- `config.txt` (system instructions) ≠ `README.md` (human guide)
- Only create both when genuinely serving different audiences
- Don't auto-sync (they're not parallel representations)

---

## Consequences

### Positive

✅ **LLMs get optimal format:** Structured XML for parsing and validation  
✅ **Humans get readable docs:** Markdown for quick scanning and understanding  
✅ **No compromise:** Each format optimized for its audience  
✅ **Clear separation:** File extension signals intended audience immediately

### Negative

❌ **Maintenance cost:** Some concepts need both versions (rare)  
❌ **Potential drift:** If same concept in both, could diverge (mitigated by keeping them separate-purpose)  
❌ **Decision overhead:** "Which format?" question for each new document

### Mitigation Strategies

**For maintenance cost:**
- Only create dual formats when truly needed
- Most documents are single-format (either `.txt` OR `.md`)
- Critical docs that need both: worth the cost

**For potential drift:**
- Dual formats serve DIFFERENT purposes (not duplicates)
- Cross-reference each other (XML can link to MD guide)
- Review during major versions

**For decision overhead:**
- Clear guidelines in this ADR
- Default: Markdown (unless strong LLM parsing needs)
- When in doubt: Ask "Primary audience?"

---

## Implementation

### File Naming Convention

```
# LLM-optimized (XML structure)
config-system.txt
guardrails.txt
agent-instructions.txt

# Human-optimized (Markdown)
README.md
docs/guides/setup.md
docs/lessons-learned/*.md
docs/knowledge/patterns.md
```

### Template Examples

**XML Template** (`templates/system-config-template.txt`):
```xml
<config>
  <metadata>
    <name>System Configuration</name>
    <version>1.0.0</version>
  </metadata>
  
  <instructions>
    <rule id="1">
      <description>Rule description</description>
      <validation>How to validate</validation>
    </rule>
  </instructions>
</config>
```

**Markdown Template** (`templates/lesson-template.md`):
```markdown
# Lesson Learned: Title

**Date:** YYYY-MM-DD
**Category:** Architecture/Process/Debugging/Patterns

## Problem
[What went wrong?]

## Solution
[How was it fixed?]

## Lessons Learned
[Key insights]
```

### Documentation Updates

- Added "Documentation Format Guide" to README
- Created templates for both formats
- Updated contributor guidelines
- Added examples to knowledge graph

---

## Review

This decision should be reviewed if:

- LLMs significantly improve markdown parsing (GPT-5+?)
- Team size grows requiring more maintenance overhead
- Automated sync becomes reliably lossless (unlikely)
- Single universal format emerges (markdown with strict schema?)

---

## Related

- **Concept:** [[concepts.md#dual-format-documentation]]
- **Lesson:** Lessons learned about this decision (if created later)
- **Templates:** `templates/system-config-template.txt`, `templates/lesson-template.md`
