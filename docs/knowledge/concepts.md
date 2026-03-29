# Knowledge Graph - Concepts

Quick-reference architectural concepts and terminology.

---

## Concept Template

Copy this template for each new concept:

```markdown
## Concept Name

**Quick Reference:**
- **Definition:** [One-sentence definition]
- **Purpose:** [Why this concept exists]
- **Key Components:** [Main parts or aspects]

**Usage:**
- [Where this concept is used]
- [How it relates to other concepts]

**Evidence:**
[Link to lesson learned](../../lessons-learned/category/lesson-file.md) — [Context]
[Link to ADR](../../decisions/ADR-XXX.md) — [Decision context]

**See Also:** [Related concepts, patterns, decisions]
```

---

## Instructions

1. **Clear definitions:** Use simple language, avoid jargon
2. **Show relationships:** Connect concepts to each other
3. **Link to decisions:** Reference ADRs where concepts were chosen
4. **Practical examples:** Show where the concept is used in practice
5. **Evolution:** Note if concept has evolved over time

---

## Add Your Concepts Below

<!-- Your concepts go here -->

---

## Commands vs Skills Architecture

**Quick Reference:**
- **Definition:** Claude Code plugins distinguish two orthogonal execution patterns: commands (direct task automation that produces artifacts) and skills (contextual guidance that provides decision support)
- **Purpose:** Prevents hybrid abstractions that try to be both — each structure handles its designed purpose cleanly
- **Key Components:** Commands: flat files in `commands/`, invoked directly, produce files/modifications. Skills: hierarchical, guidance-focused, reference other commands/skills, provide decision trees

**Usage:**
- When a plugin feature produces artifacts (files, modifications) → Command
- When a plugin feature provides guidance, patterns, or decision support → Skill
- Commands reference skills for help text; skills reference commands for execution — no logic duplication

**Evidence:**
[Lesson: Commands vs Skills Architecture Research](../lessons-learned/architecture/Lessons_Learned_Commands_vs_Skills_Architecture.md) — mixing patterns creates ambiguous "where does X go?" decisions
[ADR-002: Commands vs Skills Architecture](../decisions/ADR-002-commands-vs-skills-architecture.md) — formal decision record

**See Also:** [ADR-002](../decisions/ADR-002-commands-vs-skills-architecture.md), [KMGraph Commands Reference](../COMMAND-GUIDE.md)

---

## Plugin Distribution Tier Model

**Quick Reference:**
- **Definition:** Three installation paths for the KMGraph plugin, each with different update mechanisms and file delivery constraints: Tier 1 (Claude Code marketplace), Tier 2 (MCP IDEs via local git clone), Tier 3 (template-only via local git clone)
- **Purpose:** Informs architectural decisions about update notifications, version reporting, and example file management — constraints differ per tier
- **Key Components:** Tier 1: `claude plugin update` handles updates; Tier 2/3: manual `git pull` with no push notification; all tiers use atomic file delivery (no selective download without sparse checkout)

**Usage:**
- When designing update notification features, plan for the least-capable tier (Tier 2/3 have no registry)
- When adding optional content (examples, templates), evaluate whether it should be tracked in the repo or hosted externally — git clone and plugin install are atomic
- When building version reporting, `--version` CLI flag and `kg_version` MCP tool serve Tier 2/3 users who can't use the marketplace

**Evidence:**
[Lesson: Update Notifications for Non-Plugin Users](../lessons-learned/architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users.md) — three version sources, none authoritative; Tier 2/3 users accumulate version drift
[Lesson: Plugin Example File Management](../lessons-learned/architecture/Lessons_Learned_Plugin_Example_File_Management.md) — git atomic constraints prevent selective exclusion of tracked files
[ADR-011: Defer Update Notifications](../decisions/ADR-011-defer-update-notifications.md)

**See Also:** [Version Sync Gotcha](gotchas.md), [ADR-011](../decisions/ADR-011-defer-update-notifications.md)

---

## Git Atomic Delivery Constraint

**Quick Reference:**
- **Definition:** `git clone` and plugin marketplace installs download all tracked files as an indivisible unit; there is no built-in mechanism to selectively exclude tracked directories without user-configured sparse checkout
- **Purpose:** Explains why "opt-out" features for plugin content (examples, templates) cannot be cleanly implemented via `.gitignore` or post-install prompts
- **Key Components:** Tracked file removal is not sticky — `git pull` restores deleted tracked files; `.gitignore` only affects untracked files; `.git/info/exclude` prevents git from flagging deletions but does not block `git pull` restoration

**Usage:**
- Before adding optional content to a tracked repo, evaluate whether it belongs in the tracked tree at all
- If users should be able to opt out of content, put it in a separate repo (submodule), a `gh-pages` branch, or a release artifact — not in the main tracked tree
- Design opt-in/opt-out mechanisms before adding the content, not after

**Evidence:**
[Lesson: Plugin Example File Management](../lessons-learned/architecture/Lessons_Learned_Plugin_Example_File_Management.md) — post-install cleanup of `core/examples/` returns on `git pull`

**See Also:** [Plugin Distribution Tier Model](#plugin-distribution-tier-model)

---

## Single Version Source Pattern

**Quick Reference:**
- **Definition:** All version strings in a codebase read from one authoritative file at runtime; no version string is hardcoded in more than one place
- **Purpose:** Prevents silent version drift across multiple config files (`mcp-server/package.json`, `plugin.json`, `mcp-server/src/index.ts`) — drift accumulates imperceptibly until a user reports a confusing version mismatch
- **Key Components:** One canonical file (e.g., `mcp-server/package.json`); all other files read from it at runtime; release checklist step verifies all sources agree before pushing; `--version` CLI flag and `kg_version` MCP tool both read from the same source

**Usage:**
- Establish the single source at project inception — don't let version strings proliferate
- Implement `--version` (no network, always works) before any update-check mechanism
- Separate version reporting (`what am I running?`) from update checking (`is there a newer version?`) — implement them independently

**Evidence:**
[Lesson: Update Notifications for Non-Plugin Users](../lessons-learned/architecture/Lessons_Learned_Update_Notifications_NonPlugin_Users.md) — hardcoded `"1.0.0"` in `index.ts` disconnected from actual plugin version
[ADR-011: Defer Update Notifications](../decisions/ADR-011-defer-update-notifications.md)

**See Also:** [Plugin Distribution Tier Model](#plugin-distribution-tier-model)

---

## Dual Changelog Pattern

**Quick Reference:**
- **Definition:** This project maintains two separate CHANGELOG files that must both be updated on every release: `CHANGELOG.md` (root, GitHub-facing) and `docs/CHANGELOG.md` (MkDocs-served, docs-site-facing)
- **Purpose:** Neither file is generated from the other — both must be kept in sync manually; missing an update leaves the docs site showing a changelog that stops at an old version
- **Key Components:** Root `CHANGELOG.md`: shown on GitHub repo landing page, for contributors. `docs/CHANGELOG.md`: served by MkDocs, shown to plugin users reading the documentation site. Long-term resolution: configure MkDocs to include the root file directly (ADR-023)

**Usage:**
- On every release: update both files in the same commit
- Verify: `grep -n "{version}" CHANGELOG.md docs/CHANGELOG.md` — both should return matches
- When creating a new root `CHANGELOG.md`, remember `docs/CHANGELOG.md` already exists with full history

**Evidence:**
[Lesson: Two CHANGELOG Files Exist — Both Must Be Updated on Every Release](../lessons-learned/process/Lessons_Learned_Dual_Changelog_Both_Must_Be_Updated.md) — v0.2.1-beta: docs site changelog stopped at v0.1.2-beta
[ADR-023: Single Source of Truth for CHANGELOG](../decisions/ADR-023-single-source-changelog.md)

**See Also:** [Single Source of Truth (DRY) for Documentation](patterns.md#single-source-of-truth-dry-for-documentation)

---

## Dual Plan File Protocol

**Quick Reference:**
- **Definition:** Implementation plans exist in two locations serving different purposes: `~/.claude/plans/` (Claude Code internal, ephemeral, auto-created by plan mode) and `docs/plans/` (project local, gitignored, manually created for working reference)
- **Purpose:** Clarifies why two files are required — plan mode's automatic file serves Claude Code's internal needs; the `docs/plans/` file serves the developer's audit trail needs. They are complementary, not alternatives
- **Key Components:** `~/.claude/plans/`: created automatically on plan mode exit, session-specific; `docs/plans/`: created manually before implementation starts, persistent locally but gitignored (never committed); both must exist before implementation begins

**Usage:**
- After plan mode exits: immediately copy to `docs/plans/{version}-{slug}.md` before writing any code
- `docs/plans/` entries are never staged with `git add` — git silently ignores them (expected, not an error)
- When handing off work: the committed implementation artifacts are the handoff; plan files are ephemeral scratch pads

**Evidence:**
[Lesson: Plan File Dual-Location Protocol](../lessons-learned/process/Lessons_Learned_Plan_File_Dual_Location_Protocol.md) — implementation proceeded without `docs/plans/` file; plan created retroactively
[Lesson: Plan Files Are Gitignored — Local-Only Working Copies](../lessons-learned/process/Lessons_Learned_Plan_Files_Gitignored_Local_Only.md) — time wasted debugging why `git add docs/plans/` produced no output
[ADR-014: Maintain Dual Plan File Locations](../decisions/ADR-014-dual-plan-file-locations.md)

**See Also:** [ADR-014](../decisions/ADR-014-dual-plan-file-locations.md), CLAUDE.md § Key Workflows

