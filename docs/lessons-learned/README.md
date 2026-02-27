# Lessons Learned - Master Index

Comprehensive catalog of all lessons-learned documents.

**Total Lessons:** 5
**Last Updated:** 2026-02-27

---

## By Category

### Architecture Lessons (2 total)

- [2026-02-21 - Plugin Example File Management — Why You Can't Gate the Download](architecture/Lessons_Learned_Plugin_Example_File_Management.md) - Plugin installs are atomic; git pull restores deleted tracked files; three options evaluated for opt-out; decision deferred
- [2026-02-21 - Update Notifications for Non-Plugin Users — Version Sync and MCP Discovery Gap](architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users.md) - MCP server version hardcoded and out of sync; four-part solution designed; deferred to v0.0.9

**Tags:** #architecture #plugin-distribution #git #versioning #mcp #update-notifications

---

### Process Lessons (2 total)

- [2026-02-27 - Documentation Update Triggers in Multi-Branch Feature Development](process/documentation-update-triggers-multibranchfeatures.md) - Multi-branch releases require two-layer documentation: per-feature updates (Layer 1) and comprehensive release sync (Layer 2). Without explicit triggers, documentation updates defer indefinitely. Solution: separate final branch with explicit plan file.
- [2026-02-16 - Local Marketplace Testing - Two-Location Sync Required](process/local-marketplace-testing-workflow.md) - When testing locally through Claude Code marketplace, changes must be synced from development directory to marketplace cache location

**Tags:** #process #documentation #release-management #testing #marketplace #plugin-development #workflow #multi-branch-workflow

---

### Patterns Lessons (0 total)

[Auto-populated when lessons are added]

**Tags:** #patterns

---

### Debugging Lessons (1 total)

- [2026-02-16 - Plugin Namespace Visibility - Shadow Command Failure](debugging/namespace-visibility-shadow-command-failure.md) - Shadow command strategy failed with Gemini; file prefix workaround is cross-LLM compatible solution

**Tags:** #debugging #claude-code #mcp #namespace #cross-llm-compatibility

---

## Chronological Index

**2026**
- 2026-02-27: [Documentation Update Triggers in Multi-Branch Feature Development](process/documentation-update-triggers-multibranchfeatures.md)
- 2026-02-21: [Plugin Example File Management — Why You Can't Gate the Download](architecture/Lessons_Learned_Plugin_Example_File_Management.md)
- 2026-02-21: [Update Notifications for Non-Plugin Users — Version Sync and MCP Discovery Gap](architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users.md)
- 2026-02-16: [Local Marketplace Testing - Two-Location Sync Required](process/local-marketplace-testing-workflow.md)
- 2026-02-16: [Plugin Namespace Visibility - Shadow Command Failure](debugging/namespace-visibility-shadow-command-failure.md)

---

## Tag Index

**#architecture** (2 lessons)
- [Plugin Example File Management](architecture/Lessons_Learned_Plugin_Example_File_Management.md)
- [Update Notifications for Non-Plugin Users](architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users.md)

**#plugin-distribution** (2 lessons)
- [Plugin Example File Management](architecture/Lessons_Learned_Plugin_Example_File_Management.md)
- [Update Notifications for Non-Plugin Users](architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users.md)

**#git** (1 lesson)
- [Plugin Example File Management](architecture/Lessons_Learned_Plugin_Example_File_Management.md)

**#versioning** (1 lesson)
- [Update Notifications for Non-Plugin Users](architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users.md)

**#update-notifications** (1 lesson)
- [Update Notifications for Non-Plugin Users](architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users.md)

**#process** (2 lessons)
- [Documentation Update Triggers in Multi-Branch Feature Development](process/documentation-update-triggers-multibranchfeatures.md)
- [Local Marketplace Testing - Two-Location Sync Required](process/local-marketplace-testing-workflow.md)

**#patterns** (0 lessons)

**#debugging** (1 lesson)
- [Plugin Namespace Visibility - Shadow Command Failure](debugging/namespace-visibility-shadow-command-failure.md)

**#claude-code** (1 lesson)
- [Plugin Namespace Visibility - Shadow Command Failure](debugging/namespace-visibility-shadow-command-failure.md)

**#mcp** (2 lessons)
- [Update Notifications for Non-Plugin Users](architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users.md)
- [Plugin Namespace Visibility - Shadow Command Failure](debugging/namespace-visibility-shadow-command-failure.md)

**#namespace** (1 lesson)
- [Plugin Namespace Visibility - Shadow Command Failure](debugging/namespace-visibility-shadow-command-failure.md)

**#cross-llm-compatibility** (1 lesson)
- [Plugin Namespace Visibility - Shadow Command Failure](debugging/namespace-visibility-shadow-command-failure.md)

**#testing** (1 lesson)
- [Local Marketplace Testing - Two-Location Sync Required](process/local-marketplace-testing-workflow.md)

**#marketplace** (1 lesson)
- [Local Marketplace Testing - Two-Location Sync Required](process/local-marketplace-testing-workflow.md)

**#plugin-development** (1 lesson)
- [Local Marketplace Testing - Two-Location Sync Required](process/local-marketplace-testing-workflow.md)

**#workflow** (1 lesson)
- [Local Marketplace Testing - Two-Location Sync Required](process/local-marketplace-testing-workflow.md)

**#documentation** (1 lesson)
- [Documentation Update Triggers in Multi-Branch Feature Development](process/documentation-update-triggers-multibranchfeatures.md)

**#release-management** (1 lesson)
- [Documentation Update Triggers in Multi-Branch Feature Development](process/documentation-update-triggers-multibranchfeatures.md)

**#multi-branch-workflow** (1 lesson)
- [Documentation Update Triggers in Multi-Branch Feature Development](process/documentation-update-triggers-multibranchfeatures.md)

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

## Integration

- **Knowledge Graph:** Lessons feed patterns, gotchas, concepts to KG
- **ADRs:** Architecture lessons often lead to architecture decision records
- **MEMORY.md:** Critical patterns from lessons sync to persistent memory
- **Meta-Issues:** Complex problems reference multiple lessons

