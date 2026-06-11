# Rules — knowledge-graph

> Quick navigation: [Version & Release](#version--release) · [Git Workflow](#git-workflow) · [Development Workflow](#development-workflow) · [Knowledge Capture](#knowledge-capture) · [Model Selection](#model-selection-for-knowledge-graph-operations) · [Code Protection](#code-protection) · [Tool Preferences](#tool-preferences) · [File Paths & Directory Map](#file-paths--directory-map)
>
> **Development Workflow** includes: [Bug/Enhancement Triage](#bug--enhancement-triage) · [Plan File Sync](#plan-file-sync) · [Plugin Cache](#plugin-cache--local-testing) · [Init Command Parity](#init-command-parity) · [Hook Safety](#hook-safety)

---

## Version & Release

### Version Files

On every release, sync ALL of the following — do not stop after version files alone:

1. `package.json` (root)
2. `.claude-plugin/plugin.json`
3. `mcp-server/package.json` (independently versioned — bump only if mcp-server changed)
4. `CHANGELOG.md` — add release entry
5. `README.md` — version badge, feature highlights block, current release block, recent versions list, current phase line (footer)
6. `INSTALL.md` — upgrade path table

- **Why:** partial version sync (only package files) left README and INSTALL.md at old versions, requiring user to prompt repeatedly to get all files updated

### Changelog & Docs Feed

- `CHANGELOG.md` — code releases only
- `docs-updates/YYYY-MM-DD-{slug}.mdx` — docs-only branches only; one post per branch
- **Why:** during v0.2.1-beta, root CHANGELOG.md was updated but docs/CHANGELOG.md was forgotten, leaving the public docs site showing a changelog that stopped at v0.1.2-beta
- **Source:** [Dual Changelog Both Must Be Updated](lessons-learned/process/Lessons_Learned_Dual_Changelog_Both_Must_Be_Updated.md)

### Footer Version Grep

Grep for major.minor prefix (e.g., `0\.2\.`) not the exact prior version string — footers may use a shorter format and silently miss an exact-version grep
- **Why:** footer version strings use a shortened format that an exact-version grep silently skips, leaving a footer at the old version after release
- **Source:** [CHANGELOG Version Sync Gate In Governance Skills](lessons-learned/process/Lessons_Learned_CHANGELOG_Version_Sync_Gate_In_Governance_Skills.md)

### User-Facing Docs Updates

Update affected docs (README, COMMAND-GUIDE, CHEAT-SHEET, GETTING-STARTED, CONCEPTS, INSTALL.md) when behavior changes
- **Why:** doc updates were missed after command and agent changes, leaving guides and CHEAT-SHEET inconsistent with actual behavior
- **Source:** [ADR-013 Documentation Update Protocol](decisions/ADR-013-documentation-update-protocol.md)
- kmgraph affected pages to check: README, COMMAND-GUIDE, CHEAT-SHEET, GETTING-STARTED, CONCEPTS, GLOSSARY, and any pillar page whose described behavior changes

### Sidebar Update on Doc Rename or Move

When a user-facing document is moved or renamed, update `sidebars.js` to reflect the new path.
- The `id:` field is the path relative to `docs/` without the `.md` extension (e.g., `docs/guides/foo.md` → `id: 'guides/foo'`)
- Also grep `docs/` for internal links pointing to the old path and update them
- **Why:** a stale `id:` in `sidebars.js` causes Docusaurus to throw `Unknown doc ID` and breaks the build silently until the next deploy
- **Invoke:** `sidebar-update` skill when a rename or move is detected

### Pre-Push / Pre-Merge User-Facing Doc Sync

Before pushing to origin OR before creating/completing a merge, run `/kmgraph:update-doc --user-facing` to verify that all user-facing docs (README, COMMAND-GUIDE, CHEAT-SHEET, GETTING-STARTED, CONCEPTS, INSTALL.md) reflect the changes on the branch.
- **Why:** commands, behavior changes, and new features were shipped without corresponding doc updates, leaving guides inconsistent with actual behavior until a follow-up pass was required

### Pre-PR Doc Verification

Before creating a PR with doc changes: run `git diff HEAD~N -- docs/` for each changed file, check for formatting regressions (stray spaces, broken tables, removed blank lines, wrong agent names), then run `npm run build` and confirm no new warnings
- **Why:** agent-written doc content caused silent regressions (broken tables, stray whitespace) that only showed after push; catching them pre-PR avoids review iteration

---

## Git Workflow

### Branch Naming

- Feature: `v{ver}-{description}`
- Bug fix: `v{ver}-fix-{description}`
- Docs-only: `docs-update-{description}`

### Branch Hierarchy & Chaining

Chained branches must branch from their parent, not main — verify parent is fully committed first
- **Why:** branch-creating commands previously switched context silently mid-implementation, landing commits on the wrong branch
- **Source:** [Issue Tracking Branch Guard](lessons-learned/process/Lessons_Learned_Issue_Tracking_Branch_Guard.md)

### PR Target Verification

Before creating a PR, verify the target branch is the parent in the chain, not main
- **Why:** v0.3.3-beta was PRed against main instead of its parent v0.3.2; required a rebase to restore the correct chain

### Commits

- Format: `type(scope): subject` — include `Closes #N` in body
- Types: `feat` | `fix` | `docs` | `refactor` | `chore` | `perf` | `style` | `test` | `build` | `ci` | `revert`

### PR Policy

Push branches, await user review — never auto-merge, never delete branches, never force-push

### Post-Push Security Scan

After any `git push`: scan output for Dependabot vulnerability notices — stop and surface to user before merging or deploying
- **Why:** a vulnerability notice appeared in push output and was nearly missed; would have shipped vulnerable dependencies
- **Known/ignored (6 — Docusaurus/build-tool transitive deps, dev-only, not runtime):**
  - #30 lodash-es HIGH — Code Injection via `_.template` (CVE-2026-4800) — webpack transitive
  - #27 serialize-javascript HIGH — RCE via RegExp.flags (GHSA-5c6j-r48x-rmvq) — webpack transitive
  - #29 lodash-es medium — Prototype Pollution via `_.unset`/`_.omit` (CVE-2026-2950) — webpack transitive
  - #28 serialize-javascript medium — CPU Exhaustion DoS (CVE-2026-34043) — webpack transitive
  - #31 follow-redirects medium — auth header leak (GHSA-r4q5-vmmm-2653) — `@docusaurus/core` → webpack-dev-server → http-proxy → follow-redirects
  - #32 dompurify medium — ADD_TAGS bypass (GHSA-39q2-94rc-95cp) — `@docusaurus/theme-mermaid` → mermaid → dompurify
  - Do NOT stop or warn on these. Only surface NEW alerts not on this list.
- **Pending fix — hono #33 (medium):** HTML Injection via JSX attr names (GHSA-458j-xx4x-4375) in `@modelcontextprotocol/sdk` → hono. Fix requires hono >= 4.12.14. Override set to `>=4.12.12` (best installable as of 2026-04-16); upgrade to 4.12.14 when registry date allows.

### Cherry-Pick Safety

After any cherry-pick: verify source branch state before continuing work on either branch
- **Why:** branch contamination from a cherry-pick required a force push to fix; the sooner caught, the cheaper the fix

---

## Development Workflow

### Bug / Enhancement Triage

When a bug or enhancement is discovered mid-session, ask the user which path applies — do not auto-detect:

- **Path F — Fork to new conversation:** Bug is complex or unclear, needs investigation, and would derail the current session. Open a separate chat/terminal to investigate. Continue current session unblocked.
- **Path 1 — Capture as issue/enhancement:** Fix is out of scope or clear enough to file without immediate investigation. Create silently via `/kmgraph:start-issue-tracking`. Surface the result (GH issue link or local ENH file preview) immediately after.
- **Path 2 — Add to current plan:** Active plan exists, task not yet started. Add a new task to the plan. Sync both copies immediately (`~/.claude/plans/` and `docs/plans/` must be identical after every edit).
- **Path 3 — Implement + update plan:** Branch exists, work in progress. Implement the fix now, then update the plan file to document what was added so the PR body stays accurate. Sync both copies.

**Always ask** — never auto-route. One question: "Path F (fork), Path 1 (issue), Path 2 (add to plan), or Path 3 (implement now)?"

- **Path F vs Path 1:** Path F = root cause unclear, investigation needed now but not here; Path 1 = clear enough to file, no immediate investigation needed
- **Source:** [[ADR-013-mid-execution-discovery-protocol]] (user-level `~/.kmgraph/decisions/`)

### Plan File Sync

`~/.claude/plans/<name>.md` and `docs/plans/<name>.md` must always be identical. After any edit to either copy, sync immediately:

```bash
cp ~/.claude/plans/<name>.md /path/to/repo/docs/plans/<name>.md
```

Verify with `wc -l` on both files. A line count mismatch means they are out of sync.

- **Why:** Plans diverged during v0.5.8 planning when Task 10/11 were appended to `docs/plans/` in a session but not reflected back to `~/.claude/plans/`. When discovered, the copies had to be manually reconciled.

### Plugin Cache & Local Testing

Local `commands/` or `core/` changes are not live during testing; copy files to the appropriate plugin cache then reload.

**Claude Code:**
```bash
cp -r /path/to/knowledge-graph/commands/ ~/.claude/plugins/cache/stayinginsync-knowledge-graph/kmgraph/{version}/
/reload-plugins
```

**Codex CLI:**
```bash
rm -rf ~/.codex/plugins/cache/knowledge-management-graph/kmgraph/
codex plugin uninstall kmgraph
codex plugin marketplace add technomensch/knowledge-graph
codex plugin add kmgraph@knowledge-management-graph
```

- If a plan includes edits to `commands/`, `skills/`, `agents/`, or `core/templates/`, add a final step: use the commands above to sync cache and reload (exclude `.SynologyWorkingDirectory` from any copy operations)
- **Why:** plugin systems serve from cache, not the local repo; local fixes had no effect until the cache path was discovered during v0.3.0-beta testing
- **Source:** [Plugin Cache Not Synced From Local Repo](lessons-learned/debugging/Lessons_Learned_Debugging_Plugin_Cache_Not_Synced_From_Local_Repo.md)

### Init Command Parity

After any new step added to `commands/init.md`, immediately check `commands/init-personal-kg.md` for the equivalent step
- **Why:** Steps 8-9 were missing from init-personal-kg.md after being added to init.md; found during 2026-04-10 testing

### Hook Safety

After installing everything-claude-code (ECC): verify KMGraph's `SessionStart` hook is still present in `hooks/hooks.json` — ECC installer may clobber shared hooks config
- **Why:** ECC installer silently overwrote hooks.json, dropping KMGraph's SessionStart hook; the session ran without lesson capture for two sessions before the gap was noticed

---

## Knowledge Capture

### When to Capture

- **ADR trigger:** any decision that changes a public interface, deployment method, or core architectural pattern
- **Lesson trigger:** any bug solved, unexpected behavior discovered, or non-obvious pattern identified

### Search Before Creating (DRY)

Before capturing a new lesson via `/kmgraph:capture-lesson`, search the graph for similar existing lessons — update an existing lesson rather than creating a duplicate
- **Source:** [Single Source Of Truth DRY Documentation](lessons-learned/patterns/Lessons_Learned_Single_Source_Of_Truth_DRY_Documentation.md)

### Plan-First Rule

Always update the plan before executing, not after. If work is done without a plan entry, add it retroactively and note it was added after the fact.

### Plan File Routing (ADR-029)

Plans stored in `knowledge/` are searchable via `kg_search` and visible in the Obsidian graph:
- ENH parent → `knowledge/ENH-NNN/vX-plan.md`
- Issue/bug → `knowledge/issue-NNN/vX-plan.md`
- Misc (no parent) → `knowledge/plans/vX-plan.md`

**Source:** [ADR-029 Plan File Location](decisions/ADR-029-plan-file-location-in-knowledge-graph.md)

### Capture Checkpoints

Add `/kmgraph:capture-lesson` or `/kmgraph:create-adr` step after each phase of a plan that produces a decision or learning

### Cross-Reference Format

- Internal KMGraph cross-references: `[[filename-without-extension]]` Obsidian wiki link format
- External GitHub URLs: standard `[#NNN](url)` markdown
- **Why:** bare text references (`ENH-010`, `ADR-028`) are not navigable in Obsidian or wiki-aware tools; wiki links enable graph view, one-click navigation, and backlink tracking

### Heading Conventions

Do not use numbered headings in knowledge files — use plain headings (e.g., `## Git Workflow` not `## 1. Git Workflow`)
- **Why:** numbered anchors break silently when sections are reordered; plain anchors (e.g., `#git-workflow`) are stable and safe to link from me.md, lessons, and ADRs

### Cadence & Routing

- Run `/kmgraph:sync-all` at the end of each significant work session
- Feature/enhancement suggestions: use `/kmgraph:start-issue-tracking` for standalone deferred work; for active plans, offer to add as a new phase rather than creating an informal suggestion

---

## Model Selection for Knowledge Graph Operations

**Routing rule (ADR-038):** Route KG tasks by complexity to optimize latency and cost.

| Task Category | Model | Rationale |
|---------------|-------|-----------|
| **Write/Capture** | fast-tier | Structured data entry with templates (ADRs, lessons, sessions, comments) — 3–5x faster, ~10% token cost |
| **Search/Recall** | fast-tier | Index lookup, pointer generation — no synthesis required |
| **Review/Validation** | standard-tier | Quality assessment (ADR review, lesson duplication detection, pattern matching) |
| **Complex Judgment** | standard-tier/powerful-tier | Architectural design, conflict resolution, novel pattern discovery |

**Implementation:**
- Skills (`create-adr`, `capture-lesson`, etc.) default to fast-tier for write/capture operations
- Agents use `gov-capture-routing` skill to resolve task type and route accordingly
- Borderline tasks → route to standard-tier when unsure (safer than under-provisioning)

**Why:** fast-tier is fully capable for template-based operations. Using standard-tier for form-filling wastes resources. A session with 5 ADRs + 3 lessons saves ~60% vs. standard-tier-all-the-way.

**Source:** [[ADR-038-model-selection-rule-for-kg-tasks]]

---

## Code Protection

### Protected Paths

| Path | Status |
|------|--------|
| `commands/` | PROTECTED — do not modify without explicit permission |
| `core/templates/` | PROTECTED — do not modify without explicit permission |

---

## Tool Preferences

<!-- Platform-specific tool directives belong in the platform's native config file (ADR-032):  -->
<!-- Claude Code → CLAUDE.md (root), Gemini CLI → GEMINI.md, Cursor → .cursorrules            -->
<!-- This section contains only platform-agnostic preferences.                                 -->

- Parallel calls: always run independent searches/reads in parallel

---

## File Paths & Directory Map

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
| `commands/init-shared/` | Shared parameterized modules called by init.md and init-personal-kg.md | yes |
| `knowledge/ENH-NNN/` | Plans and specs for a specific enhancement (ADR-029) | selective |
| `knowledge/plans/` | Misc plans with no ENH/issue parent (ADR-029) | selective |

## Plan Protocol

### Recall in Plan Mode

When plan mode is active (native `/plan` command, `superpowers:writing-plans`, or any
automated planning tool such as Ultraplan), invoke the `kmgraph:recall` skill with TWO
queries before making any plan recommendations:
1. The specific plan topic
2. The architectural domain of the change (rules, deployment, platform, cross-LLM, etc.)

Running only the topic query misses architectural ADRs and ENHs that constrain the work.

**Recall results take priority — reason about findings before recommending:**
- If recall surfaces a rejected approach, examine WHY it was rejected and whether that reason is still applicable.
- If still applicable: do not propose the approach; if unavoidable, explain why no workaround exists.
- If no longer applicable: may propose it, but must document why the old rejection no longer holds AND lay out full cascade impact on the project.
- If it is the only viable option: propose it, but lay out complete ramifications and cascade effects across all affected systems, skills, decisions, and docs.
- If recall finds nothing: write "No prior art found for [topic]." and proceed.

Include findings under a "## Prior Art" section at the top of the plan.
Do not skip — plan recommendations made without context contradict existing decisions.
