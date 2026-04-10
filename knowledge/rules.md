# Rules — knowledge-graph

## Project Conventions

- Branch naming: `v{ver}-{description}` for features | `v{ver}-fix-{description}` for bugs | `docs-update-{description}` for docs-only
- Commit format: Conventional Commits — `type(scope): subject` with `Closes #N` in body
- Commit types: `feat` | `fix` | `docs` | `refactor` | `chore` | `perf` | `style` | `test` | `build` | `ci` | `revert`
- Version files to keep in sync: `package.json`, `.claude-plugin/plugin.json`, `mcp-server/package.json`
  - Why: version files silently drifted out of sync during releases, causing inconsistent behavior between the plugin and MCP server
- PR policy: push branches, await user review — never auto-merge, never delete branches
- Chained branches must branch from their parent, not main — verify parent is fully committed first
  - Why: branch-creating commands previously switched context silently mid-implementation, landing commits on the wrong branch
  - Source: [Issue Tracking Branch Guard](lessons-learned/process/Lessons_Learned_Issue_Tracking_Branch_Guard.md)

## Always / Never Rules

Always:
- Stop and ask before pushing, creating PRs, merging, or any other action visible to others
- Sync all three version files (package.json ×2, plugin.json) before pushing a release
- Update both CHANGELOG.md (code releases) and docs-updates/ feed (docs-only) as appropriate — one branch = one feed post at `docs-updates/YYYY-MM-DD-{slug}.mdx`
  - Why: during v0.2.1-beta, root CHANGELOG.md was updated but docs/CHANGELOG.md was forgotten, leaving the public docs site showing a changelog that stopped at v0.1.2-beta
  - Source: [Dual Changelog Both Must Be Updated](lessons-learned/process/Lessons_Learned_Dual_Changelog_Both_Must_Be_Updated.md)
- Update affected user-facing docs (README, COMMAND-GUIDE, CHEAT-SHEET, GETTING-STARTED, CONCEPTS, INSTALL.md) when behavior changes
  - Why: doc updates were missed after command and agent changes, leaving guides and CHEAT-SHEET inconsistent with actual behavior
  - Source: [ADR-013 Documentation Update Protocol](decisions/ADR-013-documentation-update-protocol.md)
- Narrate reasoning in visible text — thinking blocks are not shown to the user
- Validate plan acceptance criteria are ticked before marking a task complete
- Before creating a PR with doc changes: run `git diff HEAD~N -- docs/` for each changed file, check for formatting regressions (stray spaces, broken tables, removed blank lines, wrong agent names), then run `mkdocs build` and confirm no new warnings
  - Why: agent-written doc content caused silent regressions (broken tables, stray whitespace) that only showed after push; catching them pre-PR avoids review iteration
- After any `git push`: scan output for Dependabot vulnerability notices — stop and surface to user before merging or deploying
  - Why: a vulnerability notice appeared in push output and was nearly missed; would have shipped vulnerable dependencies
- After installing everything-claude-code (ECC): verify KMGraph's `SessionStart` hook is still present in `hooks/hooks.json` — ECC installer may clobber shared hooks config
  - Why: ECC installer silently overwrote hooks.json, dropping KMGraph's SessionStart hook; the session ran without lesson capture for two sessions before the gap was noticed
- When version-syncing doc footers: grep for major.minor prefix (e.g., `0\.2\.`) not the exact prior version string — footers may use a shorter format and silently miss an exact-version grep
  - Why: footer version strings use shortened format that an exact-version grep silently skips, leaving a footer at the old version after release
  - Source: [CHANGELOG Version Sync Gate In Governance Skills](lessons-learned/process/Lessons_Learned_CHANGELOG_Version_Sync_Gate_In_Governance_Skills.md)

Never:
- Modify `commands/` or `core/templates/` without explicit user permission
- Start a new branch or implementation without explicit "Proceed" or "Start" command
  - Why: implementing without a plan led to hard-to-reverse scaffolding decisions and out-of-sequence commits that required branch surgery to clean up
  - Source: [ADR-022 Branch Creation Commands Active Work Guard](decisions/ADR-022-branch-creation-commands-active-work-guard.md)
- Auto-merge, force-push, or delete branches
- Commit plan files (`docs/plans/` is gitignored — local-only)
  - Why: attempting to commit plan files wastes time; git silently ignores them with no error, causing confusion about why nothing is staged
  - Source: [Plan Files Gitignored Local Only](lessons-learned/process/Lessons_Learned_Plan_Files_Gitignored_Local_Only.md)
- Skip `--no-verify` or bypass signing unless explicitly asked
- Use "Update" in a plan for a file that doesn't exist yet — use "Create"
  - Why: ambiguous language forces a file-existence check during execution that consumes context and delays work; clear language enables immediate action
- Run namespace grep scans over `docs/plans/` or `.jsonl` chat history files — too many tokens, not executable code
  - Why: scanning these paths pulls thousands of tokens of non-executable plan text, hitting context limits before reaching actual command files

## File Paths and Directory Map

| Path | Purpose | Committed? |
|------|---------|------------|
| `commands/` | Claude Code slash commands | yes (PROTECTED) |
| `skills/` | Auto-invoked context providers | yes |
| `agents/` | Subagent definitions | yes |
| `core/templates/` | Platform-agnostic templates | yes (PROTECTED) |
| `mcp-server/` | TypeScript MCP server | yes |
| `docs/` | MkDocs Material documentation site | yes |
| `hooks/hooks.json` | SessionStart automation | yes |
| `knowledge/` | KG root — lessons, decisions, sessions | selective (see gitignore) |
| `knowledge/lessons-learned/debugging/` | Personal debug notes | no (gitignored) |
| `knowledge/sessions/` | Session summaries | no (gitignored) |
| `knowledge/chat-history/` | Exported chat logs | no (gitignored) |
| `knowledge/tmp/` | Scratch files | no (gitignored) |
| `knowledge/me.md` | Personal identity file | no (gitignored) |
| `docs/plans/` | Local plan files (working reference) | no (gitignored) |

Protected paths (do not modify without explicit permission):
- `commands/`
- `core/templates/`

## Tool Preferences

- File search: Glob and Grep — not Bash find/grep
- Content search: Grep tool — not rg or grep in Bash
- Parallel calls: always run independent searches/reads in parallel
- Avoid: Bash commands producing >20 lines of output — use context-mode MCP tools instead
- Subagents: use for heavy file exploration to keep main context clean

## Plan Protocol

- Plan location: write to `~/.claude/plans/` first, copy to `docs/plans/` for working reference
  - Source: [Plan File Dual Location Protocol](lessons-learned/process/Lessons_Learned_Plan_File_Dual_Location_Protocol.md) · [ADR-029 Plan File Location](decisions/ADR-029-plan-file-location-in-knowledge-graph.md)
- Plan language: use "Create" for new files, "Update" for existing files — never "Update" for files that don't exist yet
  - Why: "Update" for nonexistent files wastes tokens during execution as the agent tries to determine if the file exists, consuming context before acting
- Mandatory plan steps (include in every implementation plan): (1) Create branch from correct parent, (2) Create `docs/plans/{filename}.md` copy from `~/.claude/plans/`, (3) implementation steps, (4) Commit, push, PR, merge
- Capture checkpoints: add `/kmgraph:capture-lesson` or `/kmgraph:create-adr` step after each phase that produces a decision or learning
- Acceptance criteria: tick plan checkboxes after each phase completes, not at the end
- Parallel analysis: after writing a plan, identify parallelizable tasks and assign Opus/Sonnet/Haiku per task
  - Why: plans were initially written without parallelism analysis, leading to sequential execution of tasks that could have run concurrently
- Multi-phase plans: create separate phase files for checkpoint management and rate-limit recovery
  - Why: rate-limit hits during long multi-phase implementations reset context mid-plan, making it hard to resume without re-reading the full plan
- Open plan file in editor immediately after writing; add capture/ADR checkpoints to each phase

## Communication

- Output style: concise, no emojis unless requested, markdown headers for structure
- Approval gates: stop after every "Next Steps" summary and wait for explicit confirmation
- Escalation: if blocked or uncertain after investigation, ask — don't retry blindly or silently switch tactics
- Do not: interrupt findings with mid-analysis approval prompts — present fully, then ask
  - Why: mid-analysis approval prompts interrupt the user before they have enough information to evaluate; they cannot give informed consent to continue until they see the full picture

## Knowledge Capture

**Standing rules:**

1. Always update the plan before executing, not after. If work is done without a plan entry, add it retroactively and note it was added after the fact.

2. Before capturing a new lesson via `/kmgraph:capture-lesson`, search the graph for similar existing lessons. Update an existing lesson rather than creating a duplicate.
  - Source: [Single Source Of Truth DRY Documentation](lessons-learned/patterns/Lessons_Learned_Single_Source_Of_Truth_DRY_Documentation.md)

- ADR trigger: any decision that changes a public interface, deployment method, or core architectural pattern
- Lesson trigger: any bug solved, unexpected behavior discovered, or non-obvious pattern identified
- Review cadence: run `/kmgraph:sync-all` at the end of each significant work session
- Feature/enhancement suggestions: use `/kmgraph:start-issue-tracking` for standalone deferred work; for active plans, offer to add as a new phase rather than creating an informal suggestion
