---
description: Display help for any knowledge graph command — shows purpose, usage, examples, and tips pulled directly from COMMAND-GUIDE.md
allowed-tools: Read, Glob
---

# Knowledge Graph Help

**Purpose:** Display help information for any `/kmgraph:` command. Pulls content directly from `COMMAND-GUIDE.md` so help text always matches the authoritative reference.

**Version:** 1.0 (Created: 2026-02-20)

---

## Syntax Detection

```
/kmgraph:help
/kmgraph:help <command-name>
/kmgraph:help --list
```

**Examples:**
- `/kmgraph:help` → Show usage instructions for this command
- `/kmgraph:help capture-lesson` → Show help for `/kmgraph:capture-lesson`
- `/kmgraph:help create-adr` → Show help for `/kmgraph:create-adr`
- `/kmgraph:help --list` → List all available commands with one-line descriptions

---

## Step 1: Parse the Argument

**Detect which mode to run:**

| Input | Mode |
|-------|------|
| `/kmgraph:help` (no argument) | Show this command's own help |
| `/kmgraph:help --list` | List all commands |
| `/kmgraph:help <name>` | Look up specific command |

**Normalize the command name:**
- Strip `/kmgraph:` prefix if user included it
- Strip leading `--` if user typed `--capture-lesson`
- Lowercase the name
- Examples: `capture-lesson`, `Capture-Lesson`, `/kmgraph:capture-lesson` → all normalize to `capture-lesson`

---

## Step 2A: --list Mode

**When user typed `/kmgraph:help --list`:**

Read `${CLAUDE_PLUGIN_ROOT}/docs/COMMAND-GUIDE.md` and extract every command heading line (lines matching `### 🟢`, `### 🟡`, or `### 🔴`) along with its `**Purpose**:` line.

Output in this format:

```
📚 Knowledge Graph Commands (21 total)

🟢 Essential
  /kmgraph:init              Initialize a new knowledge graph
  /kmgraph:capture-lesson    Document lessons learned and solved problems
  /kmgraph:status            Display active KG status and stats
  /kmgraph:recall            Search across all project memory systems

🟡 Intermediate
  /kmgraph:update-graph      Extract insights from lessons to knowledge graph
  /kmgraph:add-category      Add a new category to an existing knowledge graph
  /kmgraph:session-summary   Create a summary of the current chat session
  /kmgraph:list              Display all configured knowledge graphs
  /kmgraph:switch            Change the active knowledge graph
  /kmgraph:check-sensitive   Scan for sensitive data before sharing
  /kmgraph:config-sanitization  Set up pre-commit hooks for sensitive data
  /kmgraph:extract-chat      Extract chat history from Claude/Gemini logs

🔴 Advanced
  /kmgraph:meta-issue        Track complex multi-attempt problems
  /kmgraph:start-issue-tracking  Initialize structured issue tracking with Git branch
  /kmgraph:update-issue-plan     Sync progress to plans and GitHub
  /kmgraph:link-issue        Link lessons or ADRs to GitHub Issues
  /kmgraph:archive-memory    Archive stale MEMORY.md entries
  /kmgraph:restore-memory    Restore archived MEMORY.md entries
  /kmgraph:sync-all          Run the full sync pipeline in one command

📄 Documentation
  /kmgraph:create-doc        Scaffold new documentation files
  /kmgraph:create-adr        Create Architecture Decision Records

💡 This command
  /kmgraph:help              Show help for any command

Run `/kmgraph:help <command-name>` for details on any command.
```

Then offer the interactive prompt (Step 3).

---

## Step 2B: Command Lookup Mode

**When user typed `/kmgraph:help <command-name>`:**

### 2B.1: Search COMMAND-GUIDE.md

Read `${CLAUDE_PLUGIN_ROOT}/docs/COMMAND-GUIDE.md`.

Search for the heading line that matches the normalized command name:
- Pattern: `` ### 🟢 `/kmgraph:{name}` `` or 🟡 or 🔴 variant

**If found:** Extract the complete entry — from the heading line through the next `---` separator. Output the full section verbatim.

**Output format:**
```
📖 Help: /kmgraph:{name}

[Full section content from COMMAND-GUIDE.md, exactly as written]

─────────────────────────────────────────
Source: docs/COMMAND-GUIDE.md
```

### 2B.2: Fallback — Command Not Yet in Guide

If the command name is not found in COMMAND-GUIDE.md (e.g., `create-doc`, `create-adr` — recently added commands not yet indexed):

1. Read `${CLAUDE_PLUGIN_ROOT}/commands/{name}.md`
2. Extract:
   - `description` from YAML frontmatter
   - The **Syntax Detection** section (lines after `## Syntax Detection`)
   - The **Purpose** line
3. Output:

```
📖 Help: /kmgraph:{name}

Purpose: [description from frontmatter]

[Syntax Detection section content]

─────────────────────────────────────────
Note: This command is not yet indexed in COMMAND-GUIDE.md.
Full documentation: commands/{name}.md
```

### 2B.3: Command Not Found

If neither COMMAND-GUIDE.md nor `commands/{name}.md` contains the command:

```
❓ Command not found: /kmgraph:{name}

Run `/kmgraph:help --list` to see all available commands.

Did you mean one of these?
[List 2-3 closest matches by name similarity]
```

---

## Step 2C: No Argument Mode

**When user typed `/kmgraph:help` with no argument:**

Output:

```
📚 /kmgraph:help — Command Help System

Display help for any knowledge graph command.

Usage:
  /kmgraph:help --list              List all 21 commands
  /kmgraph:help <command-name>      Show full help for a command

Examples:
  /kmgraph:help capture-lesson
  /kmgraph:help create-adr
  /kmgraph:help init

The help system pulls content directly from COMMAND-GUIDE.md,
so help text always matches the authoritative reference.
```

Then offer the interactive prompt (Step 3).

---

## Step 3: Interactive Prompt

After outputting any help content, always offer:

```
─────────────────────────────────────────
What would you like to do?

1. See more detailed information — Open the full COMMAND-GUIDE.md entry
2. Run this command now — Launch /kmgraph:{name} workflow
3. Help with a different command — Type another command name
```

**Handling user selection:**

**Option 1 — More detail:**
- Read the full section from COMMAND-GUIDE.md and output it completely
- If the command is not in COMMAND-GUIDE.md, read the full `commands/{name}.md` file
- Remind user: "Full reference: docs/COMMAND-GUIDE.md"

**Option 2 — Run now:**
- Immediately begin the command's normal workflow
- Treat this as if the user typed `/kmgraph:{name}` directly

**Option 3 — Different command:**
- Prompt: "Which command would you like help with?"
- Accept the name and restart from Step 1 with the new name

---

## Example Invocations

### Example 1: Look up a specific command

**User types:** `/kmgraph:help capture-lesson`

**Assistant responds:**

```
📖 Help: /kmgraph:capture-lesson

### 🟢 `/kmgraph:capture-lesson`

**Purpose**: Document lessons learned, problems solved, and patterns with git metadata tracking

**When to use**:
- Just solved a problem
- Discovered a reusable pattern
- Fixed a tricky bug worth remembering
- Learned something that future you will need

**What it does**:
1. Checks for duplicate/similar existing lessons (pre-flight search)
2. Asks verification questions (topic, audience, scope)
...

─────────────────────────────────────────
Source: docs/COMMAND-GUIDE.md

What would you like to do?
1. See more detailed information
2. Run this command now
3. Help with a different command
```

### Example 2: List all commands

**User types:** `/kmgraph:help --list`

**Assistant responds:**

```
📚 Knowledge Graph Commands (21 total)

🟢 Essential
  /kmgraph:init              Initialize a new knowledge graph
  ...
```

### Example 3: Fallback for new command

**User types:** `/kmgraph:help create-adr`

**Assistant responds:**

```
📖 Help: /kmgraph:create-adr

Purpose: Create Architecture Decision Records with auto-filled git metadata,
         sequential numbering, and index auto-update

Usage:
  /kmgraph:create-adr
  /kmgraph:create-adr <title>

Examples:
  /kmgraph:create-adr
  /kmgraph:create-adr Use PostgreSQL for primary database

─────────────────────────────────────────
Note: This command is not yet indexed in COMMAND-GUIDE.md.
Full documentation: commands/create-adr.md

What would you like to do?
1. See more detailed information
2. Run this command now
3. Help with a different command
```

---

## Checklist Before Responding

- [ ] Argument normalized (prefix stripped, lowercase)
- [ ] Correct mode detected (--list / lookup / no-arg)
- [ ] COMMAND-GUIDE.md read from `${CLAUDE_PLUGIN_ROOT}/docs/COMMAND-GUIDE.md`
- [ ] Section extracted verbatim — no paraphrasing or summarizing
- [ ] Fallback to `commands/{name}.md` if not in guide
- [ ] "Command not found" message if neither source has it
- [ ] Interactive prompt offered after every help output
- [ ] User selection handled correctly (detail / run / different command)

---

## Related Commands

- `/kmgraph:status` — Quick overview of the active knowledge graph
- `/kmgraph:recall` — Search across all documented knowledge

---

**Created:** 2026-02-20
**Version:** 1.0
**Usage:** Type `/kmgraph:help <command-name>` for help on any command
