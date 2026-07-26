# Lessons Learned - Master Index

**Navigation**: [Home](../../../README.md) > [Getting Started](../../../docs/GETTING-STARTED.md) > [Manual Workflows](../../docs/WORKFLOWS.md) > Templates

Comprehensive catalog of all lessons-learned documents.

**Total Lessons:** 65 (10 architecture, 25 process, 20 patterns, 10 debugging)
**Last Updated:** 2026-07-26

> **Known issues in this index** (see [issue tracker](../issues/README.md) for permanent tracking):
> - Two files live at the top of `lessons-learned/` instead of inside their declared category folder: `Lessons_Learned_gh_issue_create_omission.md` (process) and `Lessons_Learned_InBand_Version_Warning_Burst_Cadence_Pattern.md` (patterns). Listed below under their correct category; not physically moved.
> - `debugging/namespace-visibility-shadow-command-failure.md` and `debugging/Lessons_Learned_Plugin_Namespace_Visibility_Shadow_Command_Failure.md` share the same title and tags but are NOT byte-identical (verified via checksum) — likely a legacy-naming duplicate pair with diverged content, not a simple copy. Both listed below; reconcile manually if one supersedes the other.

---

## By Category

### Architecture Lessons (10 total)

- [Meta-Issue: init ↔ kg_upgrade upgrade-check drift](architecture/Lessons_Learned_Architecture_Meta_Issue:_Init_↔_Kg_Upgrade_Upgrade_Check_Drift.md) — 2026-06-20
- [FTS5 SearchDirs Missing Chat History](architecture/Lessons_Learned_Architecture_Fts5_Searchdirs_Missing_Chat_History.md) — 2026-05-27
- [Gate inter-agent state at parent dispatch — subagent /tmp isolation is uncharted](architecture/Lessons_Learned_Subagent_Tmp_Isolation_Gate_At_Parent.md) — 2026-05-25
- [Plugin Skills Auto-Discovery — No Hooks.json Registration Required](architecture/Lessons_Learned_Plugin_Skills_Auto_Discovery_No_Hooks_Registration.md) — 2026-05-25
- [Platform-Agnostic Rule Timing via triggers.md](architecture/Lessons_Learned_Architecture_Platform_Agnostic_Rule_Timing_Via_Triggers.md) — 2026-04-12
- [Recall Two-Query Pattern in Planning Contexts](architecture/Lessons_Learned_Recall_Two_Query_Pattern_Planning_Contexts.md) — undated
- [Native FTS5 Search and Context-Mode Integration (v0.1.1 + v0.1.2)](architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md) — 2026-03-16
- [Update Notifications for Non-Plugin Users — Version Sync and MCP Discovery Gap](architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users.md) — 2026-02-21
- [Plugin Example File Management — Why You Can't Gate the Download](architecture/Lessons_Learned_Plugin_Example_File_Management.md) — 2026-02-21
- [Commands vs Skills Architecture Research](architecture/Lessons_Learned_Commands_vs_Skills_Architecture.md) — 2026-02-16

**Tags:** #architecture

---

### Process Lessons (25 total)

- [Resource-Path Migrations Must Grep the Prompt Layer, Not Just the Server Layer](process/Lessons_Learned_Process_Migration_Must_Grep_Prompt_Layer_Not_Just_Server_Layer.md) — 2026-07-14
- [Two-Cycle Cross-Model Review (Fable-Review → Opus-Fix → Fable-Re-Review) for High-Risk Changes](process/Lessons_Learned_Process_Two_Cycle_Cross_Model_Review_For_High_Risk_Changes.md) — 2026-07-12
- [Bulk Frontmatter Strip Over-Reached Into knowledge dir — Restore via git checkout pre-strip](process/Lessons_Learned_Process_Bulk_Frontmatter_Strip_Over_Reached_Into_Knowledge_Dir_—_Restore_Via_Git_Checkout_Pre_Strip.md) — 2026-06-25
- [Codex Plugin Manifest Must Be Added to Version Sync Checklist on Introduction](process/Lessons_Learned_Codex_Plugin_Manifest_Version_Sync.md) — 2026-06-21
- [ENH-FUTURE: Cross-platform automatic capture-type identification](process/Lessons_Learned_Process_Enh_Future:_Cross_Platform_Automatic_Capture_Type_Identification.md) — 2026-06-19
- [Codex upgrade trigger: version sentinel + AGENTS-template.md as canonical source](process/Lessons_Learned_Process_Codex_Upgrade_Trigger:_Version_Sentinel_+_Agents_Template.md_As_Canonical_Source.md) — 2026-06-19
- [git log origin/* Shows Stale Data Without git fetch](process/2026-06-11-git-fetch-before-diagnosing-remote-state.md) — 2026-06-11
- [Codex Plugin Marketplace Registration Persists After Uninstall](process/2026-06-11-codex-marketplace-reinstall-two-step.md) — 2026-06-11
- [Handoff Spec Must Cover All Artifact Shapes](process/Lessons_Learned_Process_Handoff_Spec_Must_Cover_All_Artifact_Shapes.md) — 2026-06-07
- [gh issue create omission in start-issue-tracking Step 5](Lessons_Learned_gh_issue_create_omission.md) — 2026-05-30 — *misfiled at top level*
- [Use Sonnet (Not Haiku) for Batch Job Evaluation Workers — And Capture Token Usage via --output-format json](process/Lessons_Learned_Batch_Worker_Model_Selection_And_Token_Tracking.md) — 2026-04-17
- [Upgrade Path Missing FTS5 Stale File Cleanup](process/Lessons_Learned_Upgrade_Path_Missing_FTS5_Stale_File_Cleanup.md) — 2026-04-12
- [Parallel Opus Review Before Release](process/Lessons_Learned_Process_Parallel_Opus_Review_Before_Release.md) — 2026-04-12
- [Spec Drift In Command Language](process/Lessons_Learned_Process_Spec_Drift_In_Command_Language.md) — 2026-04-07
- [Plan Files Are Gitignored — Local-Only Working Copies](process/Lessons_Learned_Plan_Files_Gitignored_Local_Only.md) — 2026-03-28
- [Issue Tracking Branch Guard — Don't Switch Branches During Active Implementation](process/Lessons_Learned_Issue_Tracking_Branch_Guard.md) — 2026-03-28
- [Two CHANGELOG Files Exist — Both Must Be Updated on Every Release](process/Lessons_Learned_Dual_Changelog_Both_Must_Be_Updated.md) — 2026-03-28
- [Documentation Deprecation Lifecycle — Deprecate → Cleanup → Removal](process/Lessons_Learned_Documentation_Deprecation_Lifecycle.md) — 2026-03-28
- [Plan Subagent Is Read-Only — Write Files Manually After Opus Analysis](process/Lessons_Learned_Plan_Subagent_Is_Read_Only.md) — 2026-03-27
- [MCP Server Binary Exists But Each IDE Needs Explicit Registration](process/Lessons_Learned_MCP_Server_Binary_Exists_But_Each_IDE_Needs_Explicit_Registration.md) — 2026-03-27
- [Plugin Cache Does Not Refresh After Update (Claude Code & Codex CLI)](process/claude-code-plugin-cache-stale-after-update.md) — 2026-03-03
- [Plan File Dual-Location Protocol](process/Lessons_Learned_Plan_File_Dual_Location_Protocol.md) — 2026-03-01
- [Documentation Update Triggers in Multi-Branch Feature Development](process/documentation-update-triggers-multibranchfeatures.md) — 2026-02-27
- [Local Marketplace Testing - Two-Location Sync Required](process/local-marketplace-testing-workflow.md) — 2026-02-16
- [CHANGELOG Version Sync Gate Missing in Governance Skills](process/Lessons_Learned_CHANGELOG_Version_Sync_Gate_In_Governance_Skills.md) — undated

**Tags:** #process

---

### Patterns Lessons (20 total)

- [Fix Ownership Follows the Root-Cause KG, Not the Code's Location](patterns/Lessons_Learned_Patterns_Fix_Ownership_Follows_Root_Cause_KG_Not_Code_Location.md) — 2026-07-10
- [LLM Compliance Gate for Branching Commands](patterns/Lessons_Learned_Patterns_LLM_Compliance_Gate_For_Branching_Commands.md) — 2026-06-21
- [Routing-Layer-Only Profile Injection Pattern](patterns/Lessons_Learned_Routing_Layer_Injection_Pattern.md) — 2026-04-28
- [In-Band Version Warning with Burst Cadence Pattern](Lessons_Learned_InBand_Version_Warning_Burst_Cadence_Pattern.md) — 2026-04-18 — *misfiled at top level*
- [Contamination Grep False-Positive — Require Preference Verb Context](patterns/Lessons_Learned_Patterns_Contamination_Grep_False_Positive_—_Require_Preference_Verb_Context.md) — 2026-04-11
- [CLI Version Strings Must Read from package.json at Runtime](patterns/Lessons_Learned_Patterns_Cli_Version_Strings_Must_Read_From_Package.json_At_Runtime.md) — 2026-04-11
- [Shell Boolean Guard — Exit Code Trap with $var && cmd](patterns/Lessons_Learned_Patterns_Shell_Boolean_Guard_Exit_Code.md) — 2026-04-10
- [Post-Migration Content Migration Offer — Scaffold is Not Enough](patterns/Lessons_Learned_Patterns_Post_Migration_Content_Migration_Offer.md) — 2026-04-10
- [Migration Must Rewrite Cross-References — Not Just Move Files](patterns/Lessons_Learned_Patterns_Migration_Must_Rewrite_Cross_References.md) — 2026-04-10
- [Default KG Path Collision With Docs Convention](patterns/Lessons_Learned_Default_KG_Path_Collision_With_Docs_Convention.md) — 2026-04-10
- [Two-Level Identity and Rules Hierarchy for AI Agents](patterns/Lessons_Learned_Two_Level_Identity_Rules_Hierarchy.md) — 2026-04-09
- [Template Source Files Should Encode Role, Not Deployed Output Name](patterns/Lessons_Learned_Template_Source_Naming_Role_Not_Output.md) — 2026-04-09
- [Check Gitignore Before Migration Cleanup](patterns/Lessons_Learned_Patterns_Check_Gitignore_Before_Migration_Cleanup.md) — 2026-04-09
- [KMGraph Fingerprint Detection Before Migration](patterns/Lessons_Learned_KMGraph_Fingerprint_Detection_Before_Migration.md) — 2026-04-09
- [Git Presence Gate in Commands](patterns/Lessons_Learned_Patterns_Git_Presence_Gate_In_Commands.md) — 2026-04-07
- [Plugin Settings Scope Consistency](patterns/Lessons_Learned_Plugin_Settings_Scope_Consistency.md) — 2026-04-06
- [Skill Auto-Triggers Miss Process Vocabulary — Only Fire on Outcome Vocabulary](patterns/Lessons_Learned_Patterns_Skill_Auto_Triggers_Miss_Process_Vocabulary_—_Only_Fire_On_Outcome_Vocabulary.md) — 2026-03-30
- [Capture Router — Auto-Detect Type and Location from Content Signals](patterns/2026-03-30-capture-router-auto-detect-type-and-location.md) — 2026-03-30
- [Single Source of Truth (DRY) for Documentation — Avoid Concept Duplication](patterns/Lessons_Learned_Single_Source_Of_Truth_DRY_Documentation.md) — 2026-03-28
- [AGENTS-template.md Enables Full KMGraph Workflow on Non-Claude Platforms Without MCP](patterns/Lessons_Learned_AGENTS_Template_Platform_Portability.md) — 2026-03-27

**Tags:** #patterns

---

### Debugging Lessons (10 total)

- [MCP Server Rebuild Not Reflected In Live Plugin Tool Calls](debugging/Lessons_Learned_Debugging_MCP_Server_Rebuild_Not_Reflected_In_Live_Plugin_Tool_Calls.md) — 2026-07-18
- [os.homedir() Stale Cache On macOS](debugging/Lessons_Learned_os_homedir_Stale_Cache_On_macOS.md) — 2026-07-12
- [Plugin Cache Not Synced From Local Repo](debugging/Lessons_Learned_Debugging_Plugin_Cache_Not_Synced_From_Local_Repo.md) — 2026-04-09
- [Docusaurus trailingSlash + non-root baseUrl breaks static asset loading in dev](debugging/Lessons_Learned_Debugging_Docusaurus_Trailingslash_+_Non_Root_Baseurl_Breaks_Static_Asset_Loading_In_Dev.md) — 2026-04-08
- [Truncated Plugin Marketplace Slug Bug (28-char limit)](debugging/Lessons_Learned_Truncated_Marketplace_Slug.md) — 2026-02-17
- [Plugin Namespace Visibility - Shadow Command Failure](debugging/Lessons_Learned_Plugin_Namespace_Visibility_Shadow_Command_Failure.md) — 2026-02-16
- [Plugin Namespace Visibility - Shadow Command Failure (legacy naming, diverged content)](debugging/namespace-visibility-shadow-command-failure.md) — 2026-02-16 — *see reconciliation note above*
- [Line vs Token Metrics Must Be Applied Consistently](debugging/Lessons_Learned_Line_vs_Token_Metrics_Confusion.md) — 2026-02-16
- [Interactive Prompts and Slash Commands Don't Work in Hooks](debugging/Lessons_Learned_Interactive_Prompts_Dont_Work_In_Hooks.md) — 2026-02-16
- [Duplicate Hooks Declaration Causes Plugin Load Failure](debugging/Lessons_Learned_Duplicate_Hooks_Declaration.md) — 2026-02-16

**Tags:** #debugging

---

## Chronological Index

**2026**
- [2026-07-18] [MCP Server Rebuild Not Reflected In Live Plugin Tool Calls](debugging/Lessons_Learned_Debugging_MCP_Server_Rebuild_Not_Reflected_In_Live_Plugin_Tool_Calls.md)
- [2026-07-14] [Resource-Path Migrations Must Grep the Prompt Layer, Not Just the Server Layer](process/Lessons_Learned_Process_Migration_Must_Grep_Prompt_Layer_Not_Just_Server_Layer.md)
- [2026-07-12] [Two-Cycle Cross-Model Review for High-Risk Changes](process/Lessons_Learned_Process_Two_Cycle_Cross_Model_Review_For_High_Risk_Changes.md)
- [2026-07-12] [os.homedir() Stale Cache On macOS](debugging/Lessons_Learned_os_homedir_Stale_Cache_On_macOS.md)
- [2026-07-10] [Fix Ownership Follows the Root-Cause KG, Not the Code's Location](patterns/Lessons_Learned_Patterns_Fix_Ownership_Follows_Root_Cause_KG_Not_Code_Location.md)
- [2026-06-25] [Bulk Frontmatter Strip Over-Reached Into knowledge dir](process/Lessons_Learned_Process_Bulk_Frontmatter_Strip_Over_Reached_Into_Knowledge_Dir_—_Restore_Via_Git_Checkout_Pre_Strip.md)
- [2026-06-21] [Codex Plugin Manifest Must Be Added to Version Sync Checklist](process/Lessons_Learned_Codex_Plugin_Manifest_Version_Sync.md)
- [2026-06-21] [LLM Compliance Gate for Branching Commands](patterns/Lessons_Learned_Patterns_LLM_Compliance_Gate_For_Branching_Commands.md)
- [2026-06-20] [Meta-Issue: init ↔ kg_upgrade upgrade-check drift](architecture/Lessons_Learned_Architecture_Meta_Issue:_Init_↔_Kg_Upgrade_Upgrade_Check_Drift.md)
- [2026-06-19] [ENH-FUTURE: Cross-platform automatic capture-type identification](process/Lessons_Learned_Process_Enh_Future:_Cross_Platform_Automatic_Capture_Type_Identification.md)
- [2026-06-19] [Codex upgrade trigger: version sentinel + AGENTS-template.md](process/Lessons_Learned_Process_Codex_Upgrade_Trigger:_Version_Sentinel_+_Agents_Template.md_As_Canonical_Source.md)
- [2026-06-11] [git log origin/* Shows Stale Data Without git fetch](process/2026-06-11-git-fetch-before-diagnosing-remote-state.md)
- [2026-06-11] [Codex Plugin Marketplace Registration Persists After Uninstall](process/2026-06-11-codex-marketplace-reinstall-two-step.md)
- [2026-06-07] [Handoff Spec Must Cover All Artifact Shapes](process/Lessons_Learned_Process_Handoff_Spec_Must_Cover_All_Artifact_Shapes.md)
- [2026-05-30] [gh issue create omission in start-issue-tracking Step 5](Lessons_Learned_gh_issue_create_omission.md)
- [2026-05-27] [FTS5 SearchDirs Missing Chat History](architecture/Lessons_Learned_Architecture_Fts5_Searchdirs_Missing_Chat_History.md)
- [2026-05-25] [Gate inter-agent state at parent dispatch — subagent /tmp isolation is uncharted](architecture/Lessons_Learned_Subagent_Tmp_Isolation_Gate_At_Parent.md)
- [2026-05-25] [Plugin Skills Auto-Discovery — No Hooks.json Registration Required](architecture/Lessons_Learned_Plugin_Skills_Auto_Discovery_No_Hooks_Registration.md)
- [2026-04-28] [Routing-Layer-Only Profile Injection Pattern](patterns/Lessons_Learned_Routing_Layer_Injection_Pattern.md)
- [2026-04-18] [In-Band Version Warning with Burst Cadence Pattern](Lessons_Learned_InBand_Version_Warning_Burst_Cadence_Pattern.md)
- [2026-04-17] [Use Sonnet (Not Haiku) for Batch Job Evaluation Workers](process/Lessons_Learned_Batch_Worker_Model_Selection_And_Token_Tracking.md)
- [2026-04-12] [Platform-Agnostic Rule Timing via triggers.md](architecture/Lessons_Learned_Architecture_Platform_Agnostic_Rule_Timing_Via_Triggers.md)
- [2026-04-12] [Upgrade Path Missing FTS5 Stale File Cleanup](process/Lessons_Learned_Upgrade_Path_Missing_FTS5_Stale_File_Cleanup.md)
- [2026-04-12] [Parallel Opus Review Before Release](process/Lessons_Learned_Process_Parallel_Opus_Review_Before_Release.md)
- [2026-04-11] [Contamination Grep False-Positive](patterns/Lessons_Learned_Patterns_Contamination_Grep_False_Positive_—_Require_Preference_Verb_Context.md)
- [2026-04-11] [CLI Version Strings Must Read from package.json at Runtime](patterns/Lessons_Learned_Patterns_Cli_Version_Strings_Must_Read_From_Package.json_At_Runtime.md)
- [2026-04-10] [Shell Boolean Guard](patterns/Lessons_Learned_Patterns_Shell_Boolean_Guard_Exit_Code.md)
- [2026-04-10] [Post-Migration Content Migration Offer](patterns/Lessons_Learned_Patterns_Post_Migration_Content_Migration_Offer.md)
- [2026-04-10] [Migration Must Rewrite Cross-References](patterns/Lessons_Learned_Patterns_Migration_Must_Rewrite_Cross_References.md)
- [2026-04-10] [Default KG Path Collision With Docs Convention](patterns/Lessons_Learned_Default_KG_Path_Collision_With_Docs_Convention.md)
- [2026-04-09] [Plugin Cache Not Synced From Local Repo](debugging/Lessons_Learned_Debugging_Plugin_Cache_Not_Synced_From_Local_Repo.md)
- [2026-04-09] [Two-Level Identity and Rules Hierarchy for AI Agents](patterns/Lessons_Learned_Two_Level_Identity_Rules_Hierarchy.md)
- [2026-04-09] [Template Source Files Should Encode Role, Not Deployed Output Name](patterns/Lessons_Learned_Template_Source_Naming_Role_Not_Output.md)
- [2026-04-09] [Check Gitignore Before Migration Cleanup](patterns/Lessons_Learned_Patterns_Check_Gitignore_Before_Migration_Cleanup.md)
- [2026-04-09] [KMGraph Fingerprint Detection Before Migration](patterns/Lessons_Learned_KMGraph_Fingerprint_Detection_Before_Migration.md)
- [2026-04-08] [Docusaurus trailingSlash + non-root baseUrl breaks static asset loading in dev](debugging/Lessons_Learned_Debugging_Docusaurus_Trailingslash_+_Non_Root_Baseurl_Breaks_Static_Asset_Loading_In_Dev.md)
- [2026-04-07] [Spec Drift In Command Language](process/Lessons_Learned_Process_Spec_Drift_In_Command_Language.md)
- [2026-04-07] [Git Presence Gate in Commands](patterns/Lessons_Learned_Patterns_Git_Presence_Gate_In_Commands.md)
- [2026-04-06] [Plugin Settings Scope Consistency](patterns/Lessons_Learned_Plugin_Settings_Scope_Consistency.md)
- [2026-03-30] [Skill Auto-Triggers Miss Process Vocabulary](patterns/Lessons_Learned_Patterns_Skill_Auto_Triggers_Miss_Process_Vocabulary_—_Only_Fire_On_Outcome_Vocabulary.md)
- [2026-03-30] [Capture Router — Auto-Detect Type and Location from Content Signals](patterns/2026-03-30-capture-router-auto-detect-type-and-location.md)
- [2026-03-28] [Plan Files Are Gitignored — Local-Only Working Copies](process/Lessons_Learned_Plan_Files_Gitignored_Local_Only.md)
- [2026-03-28] [Issue Tracking Branch Guard](process/Lessons_Learned_Issue_Tracking_Branch_Guard.md)
- [2026-03-28] [Two CHANGELOG Files Exist](process/Lessons_Learned_Dual_Changelog_Both_Must_Be_Updated.md)
- [2026-03-28] [Documentation Deprecation Lifecycle](process/Lessons_Learned_Documentation_Deprecation_Lifecycle.md)
- [2026-03-28] [Single Source of Truth (DRY) for Documentation](patterns/Lessons_Learned_Single_Source_Of_Truth_DRY_Documentation.md)
- [2026-03-27] [Plan Subagent Is Read-Only](process/Lessons_Learned_Plan_Subagent_Is_Read_Only.md)
- [2026-03-27] [MCP Server Binary Exists But Each IDE Needs Explicit Registration](process/Lessons_Learned_MCP_Server_Binary_Exists_But_Each_IDE_Needs_Explicit_Registration.md)
- [2026-03-27] [AGENTS-template.md Enables Full KMGraph Workflow on Non-Claude Platforms Without MCP](patterns/Lessons_Learned_AGENTS_Template_Platform_Portability.md)
- [2026-03-16] [Native FTS5 Search and Context-Mode Integration (v0.1.1 + v0.1.2)](architecture/Lessons_Learned_FTS5_Search_And_Context_Mode_v0.1.1_v0.1.2.md)
- [2026-03-03] [Plugin Cache Does Not Refresh After Update (Claude Code & Codex CLI)](process/claude-code-plugin-cache-stale-after-update.md)
- [2026-03-01] [Plan File Dual-Location Protocol](process/Lessons_Learned_Plan_File_Dual_Location_Protocol.md)
- [2026-02-27] [Documentation Update Triggers in Multi-Branch Feature Development](process/documentation-update-triggers-multibranchfeatures.md)
- [2026-02-21] [Update Notifications for Non-Plugin Users](architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users.md)
- [2026-02-21] [Plugin Example File Management](architecture/Lessons_Learned_Plugin_Example_File_Management.md)
- [2026-02-17] [Truncated Plugin Marketplace Slug Bug (28-char limit)](debugging/Lessons_Learned_Truncated_Marketplace_Slug.md)
- [2026-02-16] [Local Marketplace Testing - Two-Location Sync Required](process/local-marketplace-testing-workflow.md)
- [2026-02-16] [Commands vs Skills Architecture Research](architecture/Lessons_Learned_Commands_vs_Skills_Architecture.md)
- [2026-02-16] [Plugin Namespace Visibility - Shadow Command Failure](debugging/Lessons_Learned_Plugin_Namespace_Visibility_Shadow_Command_Failure.md)
- [2026-02-16] [Plugin Namespace Visibility - Shadow Command Failure (legacy naming, diverged)](debugging/namespace-visibility-shadow-command-failure.md)
- [2026-02-16] [Line vs Token Metrics Must Be Applied Consistently](debugging/Lessons_Learned_Line_vs_Token_Metrics_Confusion.md)
- [2026-02-16] [Interactive Prompts and Slash Commands Don't Work in Hooks](debugging/Lessons_Learned_Interactive_Prompts_Dont_Work_In_Hooks.md)
- [2026-02-16] [Duplicate Hooks Declaration Causes Plugin Load Failure](debugging/Lessons_Learned_Duplicate_Hooks_Declaration.md)

**Undated** (no `date`/`created` frontmatter field — see file body for source context)
- [Recall Two-Query Pattern in Planning Contexts](architecture/Lessons_Learned_Recall_Two_Query_Pattern_Planning_Contexts.md)
- [CHANGELOG Version Sync Gate Missing in Governance Skills](process/Lessons_Learned_CHANGELOG_Version_Sync_Gate_In_Governance_Skills.md)

---

## Tag Index

**#architecture** (10 lessons) — see [By Category](#architecture-lessons-10-total) above
**#process** (25 lessons) — see [By Category](#process-lessons-25-total) above
**#patterns** (20 lessons) — see [By Category](#patterns-lessons-20-total) above
**#debugging** (10 lessons) — see [By Category](#debugging-lessons-10-total) above

Fine-grained per-lesson tags are in each file's own `tags:` frontmatter — use `/kmgraph:recall "<keyword>"` (FTS5 search) to search across them rather than maintaining a hand-built reverse index here; at this scale a manually maintained fine-grained tag cloud drifts out of sync faster than it can be kept useful.

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
- [lesson-template.md](../templates/lesson-template.md) - See inline field comments

**See examples**:
- [Real Examples](../../examples/lessons-learned/) - Filled-out lessons
- [Pattern Guide](../../docs/PATTERNS-GUIDE.md) - Writing quality tips

**How to capture**:
- [Manual Workflow](../../docs/WORKFLOWS.md#workflow-1-create-lesson-learned) - Step-by-step
- [Command Guide](../../../docs/COMMAND-GUIDE.md#essential-commands) - Automated (Claude Code)
