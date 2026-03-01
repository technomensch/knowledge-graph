# Documentation Style Guide

Authoring standards for contributors writing or reviewing documentation for the Knowledge Management Graph.

**Audience**: Contributors — human developers and AI documentation agents.
**Version**: 0.0.10-alpha
**Last Updated**: 2026-02-20

> **Before writing documentation**, read this guide. Every rule includes a citation showing where the standard comes from.

---

## Contents

1. [Non-Negotiables](#1-non-negotiables)
2. [Voice and Tone](#2-voice-and-tone)
3. [Canonical Terminology](#3-canonical-terminology)
4. [Page Patterns](#4-page-patterns)
5. [Accessibility](#5-accessibility)
6. [Formatting Standards](#6-formatting-standards)
7. [Links and Cross-References](#7-links-and-cross-references)
8. [Citations and Best-Practice Traceability](#8-citations-and-best-practice-traceability)
9. [Pre-Commit Checklist](#9-pre-commit-checklist)
10. [Related Documentation](#10-related-documentation)

---

## Citation Keys

The following authoritative sources are referenced throughout this guide using `[CitationKey]` notation.

| Key | Source | Principle |
|-----|--------|-----------|
| `[Nielsen2015]` | Nielsen Norman Group, "Plain Language Is for Everyone, Even Experts" (2015) | Plain language reduces cognitive load; read time decreases 58% |
| `[GoogleDevDocs]` | Google Developer Documentation Style Guide (2024) | Readers scan, not read linearly; hierarchy and information density matter |
| `[MicrosoftMSTP]` | Microsoft Manual of Style, 4th ed. | Task-based organization improves findability; use active voice and imperative mood |
| `[508CFR1194]` | 36 CFR Part 1194, Section 508 Standards | Accessible technology requirements for documentation |
| `[WCAG21]` | WCAG 2.1, Level AA (W3C, 2018) | Web Content Accessibility Guidelines |
| `[MadeToStick]` | Heath & Heath, "Made to Stick" (2007) | Concrete examples are 40% more memorable than abstract descriptions |
| `[DiataxisFramework]` | Divio Documentation System ("Diataxis"), Procida (2021) | Four documentation types: tutorials, how-tos, explanations, references |
| `[WritersGuide]` | The Chicago Manual of Style, 17th ed. | Comma usage, capitalization, heading case conventions |
| `[gitbook-style-guide]` | `gitbook-docs/docs-maintenance/documentation-style-guide.md` | Project-specific platform language and page patterns |

---

## 1. Non-Negotiables

These rules cannot be overridden without an explicit versioned decision (ADR). Every contributor must follow them on every document.

### 1.1 Third-person voice in comprehensive documentation

Apply to: `CONCEPTS.md`, `COMMAND-GUIDE.md`, `GETTING-STARTED.md`, `NAVIGATION-INDEX.md`.

- ✅ "The system extracts metadata automatically."
- ✅ "The command creates a lesson file in the active category."
- ❌ "You can see that the system extracts..."
- ❌ "We recommend running this command first."

**Validation**: `grep -iE "\b(you|your|we|our|they|them)\b" [file]`

**Citation**: `[gitbook-style-guide]` Non-negotiable #1; `[MicrosoftMSTP]` Sec. 3.2 — third-person for reference documentation.

---

### 1.2 Imperative or neutral voice in quick-reference documentation

Apply to: `CHEAT-SHEET.md`.

- ✅ "Run `/kmgraph:init` to initialize."
- ✅ "This command initializes the knowledge graph."
- ❌ Mix of imperative and third-person within the same document.

**Citation**: `[MicrosoftMSTP]` Sec. 3.4 — imperative mood for task instructions.

---

### 1.3 Platform-agnostic language unless describing Claude Code–specific behavior

- ✅ "The lesson template supports any LLM workflow."
- ✅ "MCP-compatible tools can extend the plugin."
- ✅ "Claude Code users can invoke commands via the `/` prefix."
- ❌ "Claude will extract the metadata." (when the feature is not Claude Code–specific)

**Citation**: `[gitbook-style-guide]` Platform Language section.

---

### 1.4 Command prompt text is immutable

Never paraphrase or summarize code blocks in `/commands/`. Command prompt text must be reproduced verbatim; any modification is treated as a versioned decision requiring an ADR.

**Citation**: `[gitbook-style-guide]` Non-negotiable #5; immutability protects LLM reproducibility.

---

### 1.5 Never modify `/commands/` or `core/templates/` without explicit permission

These directories contain LLM execution prompts and structured parsing templates. Changes break functionality.

- If a change appears necessary: stop and ask the project maintainer first.
- Allowed: adding new files in these directories when explicitly authorized.
- Never allowed: editing existing command or template files without maintainer sign-off.

**Citation**: `MEMORY.md` Code Protection Rules; `[GoogleDevDocs]` "Separate concerns between authoring and execution."

---

## 2. Voice and Tone

### 2.1 Voice by document type

Choose the correct voice for each document type. Mixing voices within a document is not permitted.

| Document | Voice | Example |
|----------|-------|---------|
| `CONCEPTS.md` | Third-person | "The system captures git metadata automatically." |
| `COMMAND-GUIDE.md` | Third-person | "The command creates a lesson file in the active category." |
| `GETTING-STARTED.md` | Third-person | "The initialization wizard prompts for project name." |
| `NAVIGATION-INDEX.md` | Third-person | "The index organizes documentation into four access paths." |
| `CHEAT-SHEET.md` | Imperative or neutral | "Run `/kmgraph:init`." or "This command initializes..." |
| `STYLE-GUIDE.md` (this document) | Imperative | "Use third-person voice." |
| Code comments and examples | Any style | Exception to all voice rules. |

**Citation**: `[GoogleDevDocs]` "Match the voice to the document's purpose."

---

### 2.2 Tone principles

Lead every section with an outcome — state what the reader gains, not what the section contains.

- ✅ "This section defines heading rules so contributors produce consistent hierarchy across all docs."
- ❌ "This section is about heading rules."

Prefer concrete nouns over pronouns:
- ✅ "The command writes to `lessons-learned/`."
- ❌ "It writes to the folder."

**Additional tone rules**:
- Short paragraphs (4 lines or fewer)
- Short lists (7 items or fewer before splitting into subsections)
- Avoid implementation detail in introductory content; reserve it for Advanced sections
- Every technical claim must be demonstrable with an example

**Citations**: `[GoogleDevDocs]` "State the purpose before the details."; `[Nielsen2015]` plain language reduces read time 58%; `[MicrosoftMSTP]` "Use short sentences and paragraphs."

---

## 3. Canonical Terminology

Use the terms in the "Use This Term" column consistently across all documentation. Using alternative terms creates confusion and undermines searchability.

| Use This Term | Never Use | Definition |
|---------------|-----------|------------|
| **Command** | slash command, plugin command, skill | A prompt manually invoked by the contributor via `/kmgraph:…` |
| **Skill** | command (for autonomous triggers) | A prompt triggered automatically by the AI |
| **Template** | form, blank, scaffold | A pre-formatted markdown file providing structure |
| **Knowledge graph** | KG (in contributor-facing prose), database, notes system | The quick-reference layer of organized documentation |
| **KG** | kg, K.G. | Acceptable abbreviation in code and technical contexts only |
| **Lesson Learned** | lesson, note, entry | A structured problem-solving document in `lessons-learned/` |
| **ADR** | decision record, architecture note | Architecture Decision Record, numbered sequentially |
| **MEMORY.md** | memory file, context file | The AI long-term context file at the KG root |
| **Claude Code** | Claude, the assistant | When referring to the Claude Code IDE plugin specifically |
| **Any LLM** | Claude, the AI | When describing platform-agnostic workflows |
| **MCP** | plugin API, tool | Model Context Protocol integration |
| **GitHub Issue** | issue (alone) | Platform-level bug report or feature request on GitHub |
| **`[AUTO]`** | automatic, auto-filled | Field filled by the command without contributor input |
| **`[MANUAL]`** | manual, user-filled | Field requiring contributor input |
| **ISO 8601** | date format | `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SSZ` |

**Citation**: `[gitbook-style-guide]` Terminology section; `[GoogleDevDocs]` "Use a word list to enforce consistency."

---

## 4. Page Patterns

Apply the correct structural pattern for each document type. Predictable structure improves scannability and reduces the cognitive load of finding information. `[GoogleDevDocs]`

### 4a. Guide page pattern

Apply to: `GETTING-STARTED.md`, `CONFIGURATION.md`, `WORKFLOWS.md`, and similar task-oriented guides.

```markdown
# [Title]

[One-sentence description of what this guide covers and who it is for.]

---

## [What It Is] (optional — omit if obvious from title)
## [When to Use / Choose a Path]
## [Step-by-step content sections]
## Troubleshooting
## Related Documentation
```

**Citation**: `[gitbook-style-guide]` Guide Page pattern; `[DiataxisFramework]` How-to guide structure.

---

### 4b. Command page pattern

Apply to: individual command entries in `COMMAND-GUIDE.md`.

```markdown
### 🟢 `/kmgraph:[command-name]`

**Purpose**: [One-line description]

**When to use**:
- [Scenario 1]
- [Scenario 2]

**What it does**:
1. [Step 1]
2. [Step 2]

**Time**: [Estimate]

**Example**:
```bash
/kmgraph:[command-name] [optional-args]
```

**Tips** (optional):
- [Tip]
```

Difficulty badges: 🟢 Essential / 🟡 Intermediate / 🔴 Advanced.

**Citation**: `[gitbook-style-guide]` Command Page pattern; `[MicrosoftMSTP]` "Give examples for every major operation."

---

### 4c. Concept entry pattern

Apply to: term definitions in `CONCEPTS.md`.

```markdown
### [Term]

**What it is**: [Plain-English definition, 1–2 sentences]

**Why it matters**: [Why a contributor needs to know this]

**Example**: [Concrete example — never abstract]

**Plain English**: [One-sentence analogy]
```

**Citation**: `[MadeToStick]` — concrete examples are 40% more memorable; `[DiataxisFramework]` explanation document type.

---

### 4d. Lesson Learned pattern

Lessons follow the template in `core/templates/lessons-learned/lesson-template.md`. Refer contributors to that template. Do not duplicate the structure here.

**Citation**: `[DiataxisFramework]` — reference documents describe structure, not process.

---

### 4e. ADR pattern

ADRs follow the template in `core/templates/decisions/ADR-template.md`. Refer contributors to that template.

**Citation**: `[DiataxisFramework]` — reference documents describe structure, not process.

---

## 5. Accessibility

> **All contributor-facing and user-facing documentation must meet Section 508 standards (36 CFR Part 1194) and WCAG 2.1 Level AA.**

Apply these rules to every document before committing.

| Requirement | Rule | Validation |
|-------------|------|------------|
| Heading hierarchy | Never skip levels (H1→H2→H3, never H1→H3) | Manual review |
| Link text | Always descriptive — never "click here", "read more", "here", or "this link" | `grep -i "click here\|read more\|\bhere\b\|this link"` |
| Table headers | Every table has a header row with `\|---\|` separator | Visual check |
| Image alt text | Every image has descriptive alt text `![description](path)` | `grep -P "!\[\]\("` catches empty alt text |
| Mermaid diagrams | Require: text description before diagram, text-based alternative for screen readers, WCAG contrast-compliant colors | Manual review |
| Language complexity | Plain language preferred; Flesch-Kincaid grade level ≤10 for contributor-facing docs | Optional: `readable` npm package |

**Citations**: `[508CFR1194]` — 36 CFR Part 1194 Section 508 Standards; `[WCAG21]` — WCAG 2.1 Level AA; `MEMORY.md` 508 Accessibility Compliance section.

---

## 6. Formatting Standards

### 6.1 Headings

- Title case for H1 only: `# Documentation Style Guide`
- Sentence case for H2–H4: `## Voice and tone`, `### When to use imperative`
- No punctuation at the end of headings
- No more than 4 levels of heading depth in any document
- Never use a heading solely for visual styling

**Citation**: `[GoogleDevDocs]` heading capitalization rules; `[WritersGuide]` heading case conventions.

---

### 6.2 Lists

- Unordered lists (`-`) for items without inherent order
- Ordered lists (`1.`) for sequential steps only
- No more than 2 levels of nesting
- Each item is a complete thought, ending without punctuation unless it is a full sentence
- Lists of 8 or more items: break into subsections

**Citation**: `[MicrosoftMSTP]` list formatting.

---

### 6.3 Code blocks

- Always specify the language: ` ```bash `, ` ```yaml `, ` ```markdown `, ` ```json `
- Command invocations always use `bash` code blocks
- Inline code (backticks) for: file names, directory paths, command names, field names, flag names
- Never wrap multi-line code in inline code

**Validation**: `grep -n '^\`\`\`$' [file]` — returns 0 for a clean file.

**Citation**: `[GoogleDevDocs]` code formatting.

---

### 6.4 Tables

- Pipe-based markdown tables with a header separator row
- Left-aligned columns by default
- Keep table cells concise (15 words or fewer per cell)
- Provide a plain-text equivalent for complex tables when screen readers cannot parse them

**Citation**: `[WCAG21]` table accessibility; `[GoogleDevDocs]` table formatting.

---

### 6.5 Callout boxes

Callouts highlight important information. Two formats are supported depending on rendering context:

#### Format 1: Blockquote Syntax (GitHub-Compatible)

Use blockquote syntax with a bold label. Works on GitHub and any markdown renderer.

```markdown
> **Note:** Informational context the reader should know.
> **Tip:** Actionable optimization or shortcut.
> **Warning:** Risk of data loss or a breaking change.
> **Important:** A must-know requirement before proceeding.
```

**When to use**: Raw markdown files, GitHub previews, or when maximum compatibility is needed.

#### Format 2: MkDocs Admonitions (MkDocs-Enhanced)

Use MkDocs admonition syntax for richer styling on the documentation site.

```markdown
!!! note "Note"
    Informational context the reader should know.

!!! tip "Pro Tip"
    Actionable optimization or shortcut.

!!! warning "Common Pitfall"
    Risk of data loss or a breaking change.

!!! danger "Important"
    A must-know requirement before proceeding.

!!! info "For Your Information"
    Additional context or related resources.
```

**When to use**: Comprehensive documentation files (COMMAND-GUIDE.md, CONCEPTS.md, GETTING-STARTED.md) where site rendering matters.

#### Guidelines

- Reserved keywords: **Note**, **Tip**, **Warning**, **Important**, **Info**
- Do not place consecutive callout boxes without prose between them (either format)
- Use blockquotes for lessons learned and concise guides
- Use admonitions for main documentation sections and learning paths
- All callout text must include accompanying text — never rely on formatting alone to convey meaning (WCAG 2.1)

**Citation**: Google Dev Docs style guide, Material for MkDocs admonition support, WCAG 2.1 1.1.1 Non-text Content.

---

### 6.6 Emojis and badges

- Difficulty badges (🟢 Essential / 🟡 Intermediate / 🔴 Advanced) are permitted in command documentation only
- Emojis elsewhere: use only when they carry semantic meaning (✅ complete, ❌ not supported); never for decoration
- Every emoji must have accompanying text — never rely on an emoji alone to convey meaning

**Citation**: `[WCAG21]` 1.1.1 Non-text Content — emojis must not be the sole conveyor of information.

---

## 7. Links and Cross-References

### 7.1 Internal links

- Use relative paths: `[Command Guide](COMMAND-GUIDE.md)`, `[Pattern Writing Guide](reference/PATTERNS-GUIDE.md)`
- Never use absolute file system paths (`/Users/…`)
- Every document must have a "Related Documentation" section linking to at least 2 other documents
- Cross-references should be bidirectional: if doc A links to doc B, doc B should link back to doc A

**Citation**: `[GoogleDevDocs]` cross-reference guidance; `MEMORY.md` project standards.

---

### 7.2 External links

- Use descriptive link text that describes the destination, not the URL
- ✅ `[Google Developer Documentation Style Guide](https://developers.google.com/style)`
- ❌ `[https://developers.google.com/style](https://developers.google.com/style)`
- Open in the same tab (default markdown behavior)

**Citation**: `[WCAG21]` 2.4.4 Link Purpose.

---

### 7.3 Anchor links

- Section IDs are auto-generated from heading text in GitHub-flavored markdown
- Reference with `#heading-text-kebab-case`
- Test all anchor links before committing:

```bash
npx markdown-link-check [file]
```

**Citation**: `[GoogleDevDocs]` anchor links.

---

## 8. Citations and Best-Practice Traceability

Every design decision in documentation must include a citation using the `[CitationKey]` notation defined in the Citation Keys table at the top of this guide.

### 8.1 When a citation is required

- Any structural decision (why this heading order, not another)
- Any voice or tone rule
- Any accessibility requirement
- Any formatting convention that differs from generic markdown defaults

### 8.2 When a citation is not required

- Code examples (these follow the behavior of the actual commands)
- Factual statements about the project itself (file paths, command names, dates)

### 8.3 Citation format in plan files

```markdown
**Citation**: `[Nielsen2015]` — Plain language reduces cognitive load 50%
```

### 8.4 Citation format in the style guide itself

Include the citation inline at the end of the rule it supports:

```markdown
> **Best practice**: Lead with outcomes before details. `[GoogleDevDocs]`
```

Or as a standalone line after the rule block:

```markdown
**Citation**: `[GoogleDevDocs]` heading capitalization rules; `[WritersGuide]` heading case conventions.
```

**Citation**: `MEMORY.md` Best Practice Citations section.

---

## 9. Pre-Commit Checklist

Run this checklist before marking documentation complete or committing a new or updated document.

### Voice

- [ ] Voice matches document type (third-person or imperative per Section 2)
- [ ] No second-person pronouns in comprehensive docs: `grep -iE "\b(you|your|we|our)\b" [file]`
- [ ] Concrete nouns used instead of ambiguous pronouns where possible

### Terminology

- [ ] All terms match the Canonical Terminology table (Section 3)
- [ ] "GitHub Issue" used for platform issues, not bare "issue"
- [ ] Platform language correct: "Claude Code" vs "any LLM" vs "MCP"

### Structure

- [ ] Page follows the correct pattern for its document type (Section 4)
- [ ] H1 exists and is unique; headings never skip levels
- [ ] Every section leads with an outcome statement, not a content description

### Accessibility

- [ ] No "click here" or bare-URL link text: `grep -i "click here\|read more\|\bhere\b" [file]`
- [ ] All tables have header rows
- [ ] All images have non-empty alt text: `grep -P "!\[\]\(" [file]`
- [ ] Any Mermaid diagram has a text description before it

### Formatting

- [ ] All code blocks have a language specifier: `grep -n '^\`\`\`$' [file]`
- [ ] File names and path names wrapped in inline code
- [ ] No absolute file system paths in prose: `grep "/Users/" [file]`
- [ ] H1 in title case; H2–H4 in sentence case

### Links

- [ ] All internal links use relative paths
- [ ] "Related Documentation" section present with at least 2 links
- [ ] Broken link check: `npx markdown-link-check [file]`

### Citations

- [ ] Every structural, voice, or accessibility decision has a `[CitationKey]`

---

## 10. Related Documentation

**Authoring references**:
- [Concepts Guide](CONCEPTS.md) — Canonical definitions of all terms used in this guide
- [Command Reference](COMMAND-GUIDE.md) — Example of the correct command page pattern in practice
- [Getting Started](GETTING-STARTED.md) — Example of the correct guide page pattern in practice

**Templates**:
- [Lesson Template](templates/lessons-learned/lesson-template.md) — Starting scaffold for Lesson Learned documents
- [ADR Template](templates/decisions/ADR-template.md) — Starting scaffold for Architecture Decision Records
- [Documentation Template](templates/documentation/doc-template.md) — Starting scaffold for general documentation

**Contributor workflows**:
- [Manual Workflows](reference/WORKFLOWS.md) — Workflow for contributing without Claude Code

---

**Created**: 2026-02-20
**Version**: 1.0
**Applies to**: v0.0.7-alpha and later
