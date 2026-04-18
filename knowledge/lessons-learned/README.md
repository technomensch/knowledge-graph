# Lessons Learned - Master Index

**Navigation**: [Home](../../../README.md) > [Getting Started](../../../docs/GETTING-STARTED.md) > [Manual Workflows](../../docs/WORKFLOWS.md) > Templates

Comprehensive catalog of all lessons-learned documents.

**Total Lessons:** 6
**Last Updated:** 2026-04-17

---

## By Category

### Architecture Lessons (0 total)

[Auto-populated when lessons are added]

**Tags:** #architecture

---

### Process Lessons (2 total)

- [Upgrade Path Missing FTS5 Stale File Cleanup](process/Lessons_Learned_Upgrade_Path_Missing_FTS5_Stale_File_Cleanup.md) — Migration moved the FTS5 DB out of the project but left no cleanup step; stale 41MB artifacts caused a V8 crash in Obsidian; add teardown + gitignore to every artifact migration
- [Batch Worker Model Selection And Token Tracking](process/Lessons_Learned_Batch_Worker_Model_Selection_And_Token_Tracking.md) — Use Sonnet (not Haiku) for job evaluation batch workers; always pass `--output-format json` to `claude -p` to capture token usage in log files

**Tags:** #process

---

### Patterns Lessons (3 total)

- [KMGraph Fingerprint Detection Before Migration](patterns/Lessons_Learned_KMGraph_Fingerprint_Detection_Before_Migration.md) — Use KMGraph-specific subdirectories as identity sentinels before triggering migration prompts; path name alone is insufficient
- [Template Source Files Should Encode Role, Not Deployed Output Name](patterns/Lessons_Learned_Template_Source_Naming_Role_Not_Output.md) — Name templates by role (kg-index.md, kg-category-index.md); deploy-time copy commands map role names to output filenames; prevents silent overwrites
- [Two-Level Identity and Rules Hierarchy for AI Agents](patterns/Lessons_Learned_Two_Level_Identity_Rules_Hierarchy.md) — Separate identity (me.md, gitignored) from rules (rules.md, committed); make platform files thin shims to eliminate rule drift

**Tags:** #patterns

---

### Debugging Lessons (1 total)

- [Plugin Cache Not Synced From Local Repo](debugging/Lessons_Learned_Debugging_Plugin_Cache_Not_Synced_From_Local_Repo.md) — `/reload-plugins` loads from the marketplace cache, not the local repo; copy files manually into the cache before reloading to test local changes

**Tags:** #debugging

---

## Chronological Index

**2026**
- [2026-04-17] - [Batch Worker Model Selection And Token Tracking](process/Lessons_Learned_Batch_Worker_Model_Selection_And_Token_Tracking.md) - Use Sonnet not Haiku for batch job evaluation; add --output-format json to claude -p for token usage capture
- [2026-04-12] - [Upgrade Path Missing FTS5 Stale File Cleanup](process/Lessons_Learned_Upgrade_Path_Missing_FTS5_Stale_File_Cleanup.md) - Migration left stale in-project .fts5.db files (41MB); no cleanup step in upgrader caused V8 crash in Obsidian
- [2026-04-09] - [KMGraph Fingerprint Detection Before Migration](patterns/Lessons_Learned_KMGraph_Fingerprint_Detection_Before_Migration.md) - Fingerprint detection pattern for migration triggers using KMGraph-specific subdirectories
- [2026-04-09] - [Template Source Files Should Encode Role, Not Deployed Output Name](patterns/Lessons_Learned_Template_Source_Naming_Role_Not_Output.md) - Role-based source naming for core/templates/ prevents silent overwrite collisions
- [2026-04-09] - [Two-Level Identity and Rules Hierarchy for AI Agents](patterns/Lessons_Learned_Two_Level_Identity_Rules_Hierarchy.md) - Separate identity from rules in agent context files; platform files become thin shims
- [2026-04-09] - [Plugin Cache Not Synced From Local Repo](debugging/Lessons_Learned_Debugging_Plugin_Cache_Not_Synced_From_Local_Repo.md) - /reload-plugins reads from the marketplace cache, not the local repo; copy files manually to test local changes

---

## Tag Index

**#architecture** (0 lessons)

**#process** (2 lessons)
- [Upgrade Path Missing FTS5 Stale File Cleanup](process/Lessons_Learned_Upgrade_Path_Missing_FTS5_Stale_File_Cleanup.md) — #fts5 #upgrade #migration #cleanup #stale-files #installer #obsidian #v8-crash #gitignore
- [Batch Worker Model Selection And Token Tracking](process/Lessons_Learned_Batch_Worker_Model_Selection_And_Token_Tracking.md) — #batch #claude-cli #model-selection #token-tracking #career-ops

**#patterns** (3 lessons)
- [KMGraph Fingerprint Detection Before Migration](patterns/Lessons_Learned_KMGraph_Fingerprint_Detection_Before_Migration.md) — #fingerprint #migration #detection #init #false-positive
- [Template Source Files Should Encode Role, Not Deployed Output Name](patterns/Lessons_Learned_Template_Source_Naming_Role_Not_Output.md) — #templates #naming #core-templates #init #collision #overwrite #file-naming
- [Two-Level Identity and Rules Hierarchy for AI Agents](patterns/Lessons_Learned_Two_Level_Identity_Rules_Hierarchy.md) — #identity #rules #hierarchy #context-files #agent-design #platform-portability #shim

**#debugging** (1 lesson)
- [Plugin Cache Not Synced From Local Repo](debugging/Lessons_Learned_Debugging_Plugin_Cache_Not_Synced_From_Local_Repo.md) — #plugin-cache #reload-plugins #local-development #commands

---

## Usage

**To add a new lesson:**
Use `/kmgraph:capture-lesson` which automatically:
1. Creates the lesson file with template structure
2. Auto-detects category based on topic
3. Captures git metadata (branch, commit, PR, issue)
4. Updates this index
5. Links to knowledge graph

**To search lessons:**
Use `/kmgraph:recall "query"` to search across all lessons.

---

## Field Guide

The lesson template uses YAML frontmatter with [AUTO] and [MANUAL] field markers:

**[AUTO] fields** — Automatically filled by `/kmgraph:capture-lesson` command:
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
- [Spec Drift In Command Language](process/Lessons_Learned_Process_Spec_Drift_In_Command_Language.md)
- [Git Presence Gate in Commands](patterns/Lessons_Learned_Patterns_Git_Presence_Gate_In_Commands.md)
- [Check Gitignore Before Migration Cleanup](patterns/Lessons_Learned_Patterns_Check_Gitignore_Before_Migration_Cleanup.md)
- [Contamination Grep False-Positive — Require Preference Verb Context](patterns/Lessons_Learned_Patterns_Contamination_Grep_False_Positive_—_Require_Preference_Verb_Context.md)
- [CLI Version Strings Must Read from package.json at Runtime](patterns/Lessons_Learned_Patterns_Cli_Version_Strings_Must_Read_From_Package.json_At_Runtime.md)
- [Platform-Agnostic Rule Timing via triggers.md](architecture/Lessons_Learned_Architecture_Platform_Agnostic_Rule_Timing_Via_Triggers.md)
