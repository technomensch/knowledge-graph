# Lessons Learned - Master Index

**Navigation**: [Home](../../../README.md) > [Getting Started](../../../docs/GETTING-STARTED.md) > [Manual Workflows](../../docs/WORKFLOWS.md) > Templates

Comprehensive catalog of all lessons-learned documents.

**Total Lessons:** 0
**Last Updated:** [Date]

---

## By Category

### Architecture Lessons (0 total)

[Auto-populated when lessons are added]

**Tags:** #architecture

---

### Process Lessons (0 total)

[Auto-populated when lessons are added]

**Tags:** #process

---

### Patterns Lessons (0 total)

[Auto-populated when lessons are added]

**Tags:** #patterns

---

### Debugging Lessons (0 total)

[Auto-populated when lessons are added]

**Tags:** #debugging

---

## Chronological Index

**[Current Year]**
- [YYYY-MM-DD] - [Lesson Title](category/Lessons_Learned_Title.md) - Brief description

---

## Tag Index

**#architecture** (0 lessons)

**#process** (0 lessons)

**#patterns** (0 lessons)

**#debugging** (0 lessons)

---

## Usage

**To add a new lesson:**
Use `/kg-sis:capture-lesson` which automatically:
1. Creates the lesson file with template structure
2. Auto-detects category based on topic
3. Captures git metadata (branch, commit, PR, issue)
4. Updates this index
5. Links to knowledge graph

**To search lessons:**
Use `/kg-sis:recall "query"` to search across all lessons.

---

## Field Guide

The lesson template uses YAML frontmatter with [AUTO] and [MANUAL] field markers:

**[AUTO] fields** — Automatically filled by `/kg-sis:capture-lesson` command:
- `created` - Timestamp when lesson was created (ISO 8601 format)
- `author` - From git config user.name
- `email` - From git config user.email
- `git.branch` - Current git branch
- `git.commit` - Latest commit hash
- `git.pr` - PR number (detected from branch name, or null)
- `git.issue` - Issue number (detected from branch name, or null)

**[MANUAL] fields** — You must fill these in:
- `title` - Short descriptive title for the lesson
- `tags` - Custom tags for searching (e.g., [database, performance])
- `sources` - External articles/docs consulted (optional)

**[AUTO-SUGGEST] fields** — Command suggests, you can override:
- `category` - Command suggests based on content (architecture/process/patterns/debugging)

**Troubleshooting:**
- If you see `[AUTO]` next to a field — the command fills it automatically
- If you see `[MANUAL]` next to a field — you need to fill it in
- If you see `[AUTO-SUGGEST]` — command provides a suggestion, but you can change it

**Examples:**
See [core/examples/lessons-learned/](../../examples/lessons-learned/) for filled-out lesson examples.

---

## Integration

- **Knowledge Graph:** Lessons feed patterns, gotchas, concepts to KG
- **ADRs:** Architecture lessons often lead to architecture decision records
- **MEMORY.md:** Critical patterns from lessons sync to persistent memory
- **Meta-Issues:** Complex problems reference multiple lessons

---

## Learn More

**Understanding fields**:
- [Concepts Guide](../../../docs/CONCEPTS.md#yaml-frontmatter) - YAML field explanations
- [lesson-template.md](lesson-template.md) - See inline field comments

**See examples**:
- [Real Examples](../../examples/lessons-learned/) - Filled-out lessons
- [Pattern Guide](../../docs/PATTERNS-GUIDE.md) - Writing quality tips

**How to capture**:
- [Manual Workflow](../../docs/WORKFLOWS.md#workflow-1-create-lesson-learned) - Step-by-step
- [Command Guide](../../../docs/COMMAND-GUIDE.md#essential-commands) - Automated (Claude Code)
