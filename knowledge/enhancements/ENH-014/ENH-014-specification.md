---
title: >-
  ENH-014: Audit and fix MEMORY.md cascade — update all
  commands/skills/agents/hooks to use profile files
---

# ENH-014: Audit and fix MEMORY.md cascade

## Summary

When behavioral rules were migrated from `MEMORY.md` (Claude's auto-memory system) to dedicated profile files (`~/.kmgraph/me.md`, `~/.kmgraph/rules.md`, `knowledge/rules.md`, `knowledge/me.md`), no cascade audit was done. Multiple commands, skills, agents, hooks, templates, and published docs still treat MEMORY.md as a content store.

## Root Cause

Profile-file migration was an architectural change with no impact scan. `rules-capture-agent.md` — the most critical capture path — still maps every capture type to MEMORY.md destinations. The SessionStart hook fires MEMORY.md status/diff on every session. The PostToolUse sync prompt is inverted (fires on MEMORY.md edits, silent on profile file edits).

## MEMORY.md's Correct Role (post-migration)

MEMORY.md is an **index/pointer file** only — a table of contents with links to actual files. Content must never be written there directly. The four authoritative stores are:

| Scope | Rules/Behavior | Identity/Preferences |
|---|---|---|
| Personal (cross-project) | `~/.kmgraph/rules.md` | `~/.kmgraph/me.md` |
| Project-specific | `{project}/knowledge/rules.md` | `{project}/knowledge/me.md` |

Architecture is documented at: `docs/pillars/organizing/personal-vs-project.md` and `docs/pillars/portability/your-ai-profile.mdx`.

---

## Affected Files (verified)

### Critical — wrong capture destination (all user behavioral corrections silently misrouted)

| File | Problem |
|------|---------|
| `agents/rules-capture-agent.md:347-395` | Routes ALL capture types (personal-rule, personal-me, project-rule, project-me, platform-specific, agents) to MEMORY.md. Must route to profile files. |
| `skills/rules-capture/SKILL.md:3` | Describes MEMORY.md as the fallback target instead of profile files. |

### Critical — hooks firing every session with wrong behavior

| File | Problem |
|------|---------|
| `scripts/hooks-master.sh:350-394` | SECTION 4: warns "No MEMORY.md found" and "MEMORY.md is stale" on every SessionStart. |
| `scripts/hooks-master.sh:397-440` | SECTION 5: git-diffs MEMORY.md and surfaces changes since last session. Neither section checks profile file staleness. |
| `hooks/hooks.json` | Comment still says "notify of MEMORY.md changes". |
| `scripts/platform-file-change-check.sh:36` | PostToolUse whitelist includes MEMORY.md but NOT the four profile files. Cross-platform sync prompt fires on the index file, never fires when the actual authoritative files change. |

### Critical — phantom commands with no implementation

References to `/kmgraph:archive-memory` and `/kmgraph:restore-memory` exist in multiple places, but **no command files and no skill directories exist** for either.

| File | Stale reference |
|------|----------------|
| `commands/help.md:80-81` | Lists both as available commands |
| `skills/knowledge-graph-usage/SKILL.md:291-298` | Instructs users to run them with flags |
| `docs/reference/command-guide.md:1221-1229` | Documents full behavior including flag syntax |
| `docs/reference/command-guide.md:1262-1269` | Troubleshooting section for "MEMORY.md too large" directs users to run archive-memory |
| `docs/pillars/recalling/session-memory.md:49-95` | Documents archive/restore as a current, working procedure |
| `scripts/fuzzy-search-archive.sh` | Helper script exists but is unwired |

Decision required: implement the commands, or remove all references.

### High — stale staleness checks (misleading signals)

| File | Problem |
|------|---------|
| `commands/status.md:106-124` | Checks MEMORY.md mtime and warns if stale — MEMORY.md is an index, its age is not meaningful. Should check profile file mtimes instead. |
| `skills/knowledge-graph-usage/SKILL.md:304` | Token budget check reads MEMORY.md size — wrong metric under new architecture. |

### High — published docs with stale claims

| File | Problem |
|------|---------|
| `docs/reference/command-guide.md:475-476` | Claims `update-graph` "checks MEMORY.md size and syncs new patterns" and "commits KG and MEMORY.md changes together" — false per `commands/update-graph.md` |
| `docs/reference/command-guide.md:1046,1054,1075,1161,1331` | Multiple stale claims about sync-all and update-graph writing to MEMORY.md |
| `docs/GLOSSARY.md:316-333` | MEMORY.md entry describes it as primary content store ("Key patterns are written to MEMORY.md") — contradicts the `User Profile / Project Profile` entry at line 606 in the same file |
| `docs/reference/commands.md:20` | Recall description says "searches lessons, ADRs, KG entries, sessions, and MEMORY.md" — omits profile files |
| `.claude-plugin/plugin.json:3` | Marketplace description: "MEMORY.md bidirectional sync" listed as a headline feature |

### Medium — templates seeding new installs with old model

| File | Problem |
|------|---------|
| `core/templates/MEMORY-template.md:7-94` | Entire template structured for writing governance patterns and failure fixes directly into MEMORY.md. Offered to new users via `commands/init-shared/template-seed.md:48-49`. |
| `core/templates/MEMORY-template.md:91` | `Usage Notes` references `update-graph` Step 7 for bidirectional sync — this step does not exist in current `commands/update-graph.md`. |

### Medium — recall missing profile files entirely

| File | Problem |
|------|---------|
| `agents/recall-agent.md:93` | Only searches MEMORY.md under `--type=all`. No awareness of `knowledge/rules.md`, `knowledge/me.md`, `~/.kmgraph/rules.md`, `~/.kmgraph/me.md`. These are now the authoritative behavioral stores and should be recalled. |

### Low — process gap

| File | Problem |
|------|---------|
| `commands/init.md:488-527` | Migration offer (MEMORY.md → rules.md) re-surfaces on every init/upgrade. No idempotency marker written when user accepts or declines. Users are re-prompted indefinitely. |

---

## Correct Routing (after fix)

| Capture type | Was (MEMORY.md) | Should be |
|---|---|---|
| personal-rule | `~/.claude/memory/MEMORY.md` | `~/.kmgraph/rules.md` |
| personal-me | `~/.claude/memory/MEMORY.md` | `~/.kmgraph/me.md` |
| project-rule | `~/.claude/projects/{project}/memory/MEMORY.md` | `{project}/knowledge/rules.md` |
| project-me | `~/.claude/projects/{project}/memory/MEMORY.md` | `{project}/knowledge/me.md` |
| platform-specific | `~/.claude/projects/{project}/memory/MEMORY.md` | `~/.kmgraph/rules.md` (platform section) |
| agents | `~/.claude/projects/{project}/memory/MEMORY.md` | `{project}/knowledge/rules.md` (agents section) |

---

## Retracted from initial scan (Opus second-pass)

- **Gap: no profile-file concept doc** — RETRACTED. Fully covered by `docs/pillars/organizing/personal-vs-project.md` and `docs/pillars/portability/your-ai-profile.mdx`.
- **~25 docs files stale** — over-counted. `core/docs/` and `core/templates/` are internal (not published via Docusaurus). Actual published stale files are those listed above only.
- **sync-all writing to MEMORY.md** — RETRACTED. `commands/sync-all.md` and `agents/sync-all-agent.md` have zero MEMORY.md references. The sync-all run that surfaced the issue came from `rules-capture-agent.md` (already in scope).

---

## Notes

- MEMORY.md files remain valid as index/pointer files — do NOT delete them or remove their use as an index
- Content at `/Users/mkaplan/.claude/projects/-Users-mkaplan-GitHub-knowledge-graph/memory/MEMORY.md` has only 1 substantive entry (hook variable regression) — no content loss risk
- `docs/pillars/recalling/session-memory.md` lines 18-22 already correctly describe the three-layer model; only the archive/restore section (lines 49-95) is stale
