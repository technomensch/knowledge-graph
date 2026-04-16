# Rules — knowledge-graph

> Quick navigation: [Version & Release](#version--release) · [Git Workflow](#git-workflow) · [Development Workflow](#development-workflow) · [Knowledge Capture](#knowledge-capture) · [Code Protection](#code-protection) · [Tool Preferences](#tool-preferences) · [File Paths & Directory Map](#file-paths--directory-map)

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

### Sidebar Update on Doc Rename or Move

When a user-facing document is moved or renamed, update `sidebars.js` to reflect the new path.
- The `id:` field is the path relative to `docs/` without the `.md` extension (e.g., `docs/guides/foo.md` → `id: 'guides/foo'`)
- Also grep `docs/` for internal links pointing to the old path and update them
- **Why:** a stale `id:` in `sidebars.js` causes Docusaurus to throw `Unknown doc ID` and breaks the build silently until the next deploy
- **Invoke:** `sidebar-update` skill when a rename or move is detected

### Pre-PR Doc Verification

Before creating a PR with doc changes: run `git diff HEAD~N -- docs/` for each changed file, check for formatting regressions (stray spaces, broken tables, removed blank lines, wrong agent names), then run `mkdocs build` and confirm no new warnings
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

### Plugin Cache & Local Testing

Local `commands/` or `core/` changes are not live during testing; copy files to `~/.claude/plugins/cache/stayinginsync-knowledge-graph/kmgraph/{version}/` then run `/reload-plugins`
- If a plan includes edits to `commands/`, `skills/`, `agents/`, or `core/templates/`, add a final step: copy changed files to the plugin cache and run `/reload-plugins` (exclude `.SynologyWorkingDirectory` from any copy operations)
- **Why:** `/reload-plugins` serves from cache, not the local repo; local fixes had no effect until the cache path was discovered during v0.3.0-beta testing
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
