# Documentation Navigation Index

**Complete sitemap** for Knowledge Management Graph documentation. Find what you need in 3 clicks or less.

---

## Quick Navigation by Task

### I Want To...

**Get Started**:
- Install for the first time → [Getting Started](GETTING-STARTED.md)
- Understand what this is → [Concepts Guide](CONCEPTS.md)
- See all commands at once → [Cheat Sheet](CHEAT-SHEET.md)

**Learn Commands**:
- See all commands with examples → [Command Guide](COMMAND-GUIDE.md)
- Find essential commands only → [Essential Commands](COMMAND-GUIDE.md#essential-commands)
- Learn command workflow → [Command Guide Learning Path](COMMAND-GUIDE.md#learning-path)

**Write Better Entries**:
- Understand quality standards → [Pattern Writing Guide](../core/docs/PATTERNS-GUIDE.md)
- See template structure → [Templates](../core/templates/)
- Review real examples → [Examples](../core/examples/)

**Configure & Customize**:
- Set up sanitization hooks → [Configuration](CONFIGURATION.md)
- Adapt to my AI assistant → [Platform Adaptation](../core/docs/PLATFORM-ADAPTATION.md)
- Add custom categories → [Add Category Command](COMMAND-GUIDE.md#kmgraphadd-category)

**Understand the System**:
- How does it work? → [Architecture Guide](../core/docs/ARCHITECTURE.md)
- What are the components? → [Concepts](CONCEPTS.md#core-components)
- What's the design philosophy? → [Architecture: Design Principles](../core/docs/ARCHITECTURE.md#design-principles)

**Manual Workflows** (Non-Claude users):
- Step-by-step processes → [Workflows](../core/docs/WORKFLOWS.md)
- Shell aliases for speed → [Workflows: Aliases](../core/docs/WORKFLOWS.md#shell-aliases)
- Editor integration → [Workflows: Editor Templates](../core/docs/WORKFLOWS.md#editor-templates)

**Track Complex Problems**:
- Multi-attempt bugs → [Meta-Issue Guide](../core/docs/META-ISSUE-GUIDE.md)
- Link to GitHub issues → [Link Issue Command](COMMAND-GUIDE.md#kmgraphlink-issue)
- Issue tracking workflows → [Start Issue Tracking Command](COMMAND-GUIDE.md#kmgraphstart-issue-tracking)

**Share Safely**:
- Remove sensitive data → [Sanitization Checklist](../core/docs/SANITIZATION-CHECKLIST.md)
- Set up pre-commit hooks → [Config Sanitization Command](COMMAND-GUIDE.md#kmgraphconfig-sanitization)
- Check before sharing → [Check Sensitive Command](COMMAND-GUIDE.md#kmgraphcheck-sensitive)

---

## Documentation by Audience

### New Users (First 30 Days)

**Start here**:
1. [Getting Started](GETTING-STARTED.md) - Installation (5-15 min)
2. [Concepts Guide](CONCEPTS.md) - What is a knowledge graph? (10 min read)
3. [Cheat Sheet](CHEAT-SHEET.md) - Quick reference (keep open)

**Then**:
4. [Essential Commands](COMMAND-GUIDE.md#essential-commands) - Learn 4 core commands
5. [Templates](../core/templates/) - See structure
6. [Examples](../core/examples/) - Real-world usage

**Avoid for now**:
- Advanced commands
- Meta-issue tracking
- Architecture details

---

### Active Users (Regular Usage)

**Daily references**:
- [Cheat Sheet](CHEAT-SHEET.md) - Task → command mapping
- [Command Guide](COMMAND-GUIDE.md) - All commands with examples
- [Concepts](CONCEPTS.md) - Term definitions

**Weekly/monthly**:
- [Pattern Writing](../core/docs/PATTERNS-GUIDE.md) - Quality tips
- [Configuration](CONFIGURATION.md) - Team setup, sanitization
- [Examples](../core/examples/) - Inspiration

**When needed**:
- [Platform Adaptation](../core/docs/PLATFORM-ADAPTATION.md) - Switching AI assistants
- [Meta-Issue Guide](../core/docs/META-ISSUE-GUIDE.md) - Complex bug tracking
- [Sanitization](../core/docs/SANITIZATION-CHECKLIST.md) - Before sharing

---

### Non-Claude Users (Manual Workflows)

**Essential reading**:
1. [Getting Started: Manual Setup](GETTING-STARTED.md#manual-setup)
2. [Workflows](../core/docs/WORKFLOWS.md) - Complete manual processes
3. [Templates](../core/templates/) - What to copy
4. [Examples](../core/examples/) - Filled examples

**Platform-specific**:
- Cursor → [Cursor Guide](../core/docs/PLATFORM-ADAPTATION.md#cursor)
- Continue → [Continue Guide](../core/docs/PLATFORM-ADAPTATION.md#continue)
- Aider → [Aider Guide](../core/docs/PLATFORM-ADAPTATION.md#aider)

**Skip**:
- Command Guide (Claude Code specific)
- Most of Configuration (automation setup)

---

### Team Leads (Setting Up Teams)

**Setup checklist**:
1. [Getting Started](GETTING-STARTED.md) - Choose team path
2. [Configuration: Team Workflows](CONFIGURATION.md#team-workflows)
3. [Sanitization Checklist](../core/docs/SANITIZATION-CHECKLIST.md) - Before sharing
4. [Pattern Writing Guide](../core/docs/PATTERNS-GUIDE.md) - Team standards

**Share with team**:
- [Cheat Sheet](CHEAT-SHEET.md) - Quick reference
- [Concepts](CONCEPTS.md) - Onboarding guide
- [Examples](../core/examples/) - What good looks like

---

### Developers (Extending the System)

**Understanding the system**:
1. [Architecture](../core/docs/ARCHITECTURE.md) - How it works
2. [README](../README.md) - Overview
3. [Core README](../core/README.md) - Core system details

**Customization**:
- [Platform Adaptation](../core/docs/PLATFORM-ADAPTATION.md) - Add new platforms
- [Templates](../core/templates/) - Modify scaffolds
- [Workflows](../core/docs/WORKFLOWS.md) - Understand manual processes

---

## Complete File Structure

```
knowledge-graph/
├── README.md ..................... Project overview
├── CHANGELOG.md .................. Version history
├── ROADMAP.md .................... Development plans
│
├── docs/ ......................... User-facing guides
│   ├── GETTING-STARTED.md ........ Installation & first steps ⭐
│   ├── CONFIGURATION.md .......... Post-install setup
│   ├── CHEAT-SHEET.md ............ One-page quick reference ⭐
│   ├── CONCEPTS.md ............... Term definitions ⭐
│   ├── COMMAND-GUIDE.md .......... All 19 commands ⭐
│   └── NAVIGATION-INDEX.md ....... This file
│
├── core/ ......................... Platform-agnostic system
│   ├── README.md ................. Core system overview
│   │
│   ├── docs/ ..................... Comprehensive guides
│   │   ├── ARCHITECTURE.md ....... System design
│   │   ├── PATTERNS-GUIDE.md ..... Writing quality ⭐
│   │   ├── WORKFLOWS.md .......... Manual processes ⭐
│   │   ├── META-ISSUE-GUIDE.md ... Complex problem tracking
│   │   ├── PLATFORM-ADAPTATION.md. AI assistant guides
│   │   └── SANITIZATION-CHECKLIST.md Safety before sharing
│   │
│   ├── templates/ ................ Starting scaffolds ⭐
│   │   ├── lessons-learned/ ...... Lesson templates
│   │   ├── decisions/ ............ ADR templates
│   │   ├── knowledge/ ............ Knowledge entry templates
│   │   ├── sessions/ ............. Session summary templates
│   │   └── meta-issue/ ........... Meta-issue templates
│   │
│   └── examples/ ................. Real-world samples ⭐
│       ├── lessons-learned/ ...... Example lessons
│       ├── decisions/ ............ Example ADRs
│       ├── knowledge/ ............ Example entries
│       └── sessions/ ............. Example summaries
│
├── commands/ ..................... Claude Code commands (19 files)
│   ├── init.md ................... Initialize KG
│   ├── capture-lesson.md ......... Document learnings
│   ├── status.md ................. View KG status
│   └── ... (16 more)
│
└── skills/ ....................... Claude Code skills
    └── knowledge-graph-usage/ .... Autonomous capture skill

⭐ = Most frequently accessed files
```

---

## Decision Trees

### "I Need to Install"

```
Are you using Claude Code?
├─ Yes → [Getting Started: Claude Code](GETTING-STARTED.md#claude-code-quick-start)
│         Time: 5 minutes
│
└─ No → Do you use a different AI assistant?
         ├─ Yes (Cursor, Continue, Aider)
         │   → [Getting Started: AI Assistant](GETTING-STARTED.md#ai-assistant-setup)
         │     Time: 10 minutes
         │
         └─ No (manual workflows)
             → [Getting Started: Manual](GETTING-STARTED.md#manual-setup)
               Time: 15 minutes
```

### "I Need to Find a Command"

```
What do you want to do?
├─ Document a lesson → /kmgraph:capture-lesson
├─ Search knowledge → /kmgraph:recall "query"
├─ See status → /kmgraph:status
├─ Initialize new KG → /kmgraph:init
├─ Sync to MEMORY.md → /kmgraph:update-graph
├─ Track complex bug → /kmgraph:meta-issue
└─ Not sure → [Cheat Sheet: I Want To...](CHEAT-SHEET.md#i-want-to)
```

### "I Need to Understand a Term"

```
What term?
├─ "Knowledge Graph" → [Concepts: What is a KG?](CONCEPTS.md#what-is-a-knowledge-graph)
├─ "YAML Frontmatter" → [Concepts: YAML](CONCEPTS.md#yaml-frontmatter)
├─ "Git Metadata" → [Concepts: Git Metadata](CONCEPTS.md#git-metadata)
├─ "MEMORY.md" → [Concepts: MEMORY.md](CONCEPTS.md#memorymd)
├─ "Sanitization" → [Concepts: Sanitization](CONCEPTS.md#sanitization)
├─ "Meta-Issue" → [Concepts: Meta-Issue](CONCEPTS.md#meta-issue)
└─ Other → [Concepts: All Terms](CONCEPTS.md#key-terms)
```

---

## Documentation Layers Explained

### Layer A: Plugin Users (Root `/docs/`)

**Purpose**: User-facing guides for installing and using the plugin

**Audience**: Claude Code users, new users, regular users

**Files**: GETTING-STARTED, CONFIGURATION, CHEAT-SHEET, CONCEPTS, COMMAND-GUIDE

**When to read**: First-time setup, learning commands, daily reference

---

### Layer B: Core System (`/core/docs/`)

**Purpose**: Platform-agnostic knowledge graph system documentation

**Audience**: Non-Claude users, developers, advanced users

**Files**: ARCHITECTURE, PATTERNS-GUIDE, WORKFLOWS, META-ISSUE-GUIDE, PLATFORM-ADAPTATION, SANITIZATION-CHECKLIST

**When to read**: Manual workflows, understanding the system, adapting to other platforms

---

### Layer C: Developer (`/docs/` developer KG)

**Purpose**: Development context, lessons learned, decisions (the team's own knowledge graph!)

**Audience**: Project contributors, maintainers

**Files**: ADRs, lessons learned, implementation plans

**When to read**: Contributing to project, understanding architectural decisions

**Note**: Excluded from npm package distribution

---

## Common Navigation Paths

### Path 1: Total Beginner
1. README.md (2 min) - "What is this?"
2. CONCEPTS.md (10 min) - "How does it work?"
3. GETTING-STARTED.md (5 min) - Install
4. CHEAT-SHEET.md (keep open) - Quick reference
5. Capture first lesson (5 min)

**Total**: ~22 minutes to first lesson

---

### Path 2: Experienced Developer
1. README.md (1 min) - Overview
2. GETTING-STARTED.md (2 min) - Install
3. COMMAND-GUIDE.md (5 min) - Skim commands
4. ARCHITECTURE.md (optional) - Deep dive
5. Capture first lesson (3 min)

**Total**: ~11 minutes to first lesson

---

### Path 3: Non-Claude User
1. README.md (2 min) - Overview
2. GETTING-STARTED: Manual (5 min) - Setup
3. WORKFLOWS.md (10 min) - Learn manual process
4. Templates (2 min) - Copy template
5. Examples (3 min) - See filled example
6. Create first lesson (10 min)

**Total**: ~32 minutes to first lesson

---

## Quick Links by Category

### Getting Started
- [Installation](GETTING-STARTED.md)
- [First Steps](GETTING-STARTED.md#first-steps)
- [Concepts](CONCEPTS.md)

### Daily Use
- [Cheat Sheet](CHEAT-SHEET.md)
- [Command Guide](COMMAND-GUIDE.md)
- [Essential Commands](COMMAND-GUIDE.md#essential-commands)

### Writing Quality
- [Pattern Writing](../core/docs/PATTERNS-GUIDE.md)
- [Templates](../core/templates/)
- [Examples](../core/examples/)

### Configuration
- [Post-Install Setup](CONFIGURATION.md)
- [Sanitization](../core/docs/SANITIZATION-CHECKLIST.md)
- [Platform Guides](../core/docs/PLATFORM-ADAPTATION.md)

### Advanced
- [Architecture](../core/docs/ARCHITECTURE.md)
- [Meta-Issues](../core/docs/META-ISSUE-GUIDE.md)
- [Manual Workflows](../core/docs/WORKFLOWS.md)

---

## Troubleshooting Navigation

**"I can't find information about..."**
1. Check [Cheat Sheet](CHEAT-SHEET.md#i-want-to) "I Want To..." section
2. Search [Concepts Guide](CONCEPTS.md) for term definitions
3. Review this Navigation Index decision trees

**"I'm lost in the documentation"**
- Start at [README](../README.md)
- Find your user type in [Getting Started](GETTING-STARTED.md#choose-your-path)
- Follow the recommended path for your audience type

**"Too many files, which do I need?"**
- New user? Just read files marked ⭐ in [File Structure](#complete-file-structure)
- Regular user? [Cheat Sheet](CHEAT-SHEET.md) + [Command Guide](COMMAND-GUIDE.md)
- Manual workflows? [Workflows](../core/docs/WORKFLOWS.md) + [Templates](../core/templates/)

---

**Updated**: 2026-02-19
