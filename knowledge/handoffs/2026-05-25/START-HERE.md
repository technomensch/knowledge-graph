# Start Here — Session Handoff 2026-05-25

**Branch:** `v0.5.8-fix-plan-rules-injection`
**Commit:** `1889d9e0` — v0.5.8: fix plan rules injection + MEMORY.md cascade (ENH-013, ENH-014)
**Versions:** plugin v0.5.8 / mcp-server v0.3.10

---

## What This Session Did

Pure planning session — no code written. Worked through Phase 1 decisions for the v0.6.0 multi-platform expansion plan (`docs/plans/v0.6.0-multi-platform-expansion.md`).

**Decisions locked (recorded inline in plan):**

| # | Decision | Outcome |
|---|----------|---------|
| 1.1 | npm scope + package name | `@stayinginsync/kmgraph` (org `stayinginsync` created on npmjs.com; never previously published — no migration needed) |
| 1.2 | Version sync mechanism | Build-time injection: `prebuild` script generates `src/version.ts` from `package.json` |
| 1.3a | Canonical platform list | 10 Tier 1 + 2 Tier 2 — see table in plan |
| 1.3b | Pointer-line format | Format-native: markdown=first line, YAML=`#` comment, JSON=`"_kmgraph_context"` key |
| 1.3c | Pointer source | Injected by `init`/`setup-platform` only — never in templates |
| 1.3d | Pointer references | `knowledge/rules.md` (required) + `knowledge/me.md` (if present) + `~/.kmgraph/me.md` (if present) |
| 1.3e | Platform vocabulary | `platform_vocabulary_version: 1` added to `me.md` schema; alias map sunset in v0.6.0; new ADR needed (supersedes ADR-041, references ADR-039/028/032) |
| 1.3f | Cursor write target | `.cursorrules` = detection-only; writes go to `.cursor/rules/project-preferences.mdc` |

**Plan updates made:**
- Task 2.1: npm package name, Docusaurus page updates captured
- Task 2.2: version sync mechanism updated
- Task 2.3: massively expanded — platform templates, GEMINI.md fix, pointer logic, .cursorrules fix, kg-config migration, all Docusaurus pages captured
- Task 2.7: platform list updated 8→10 Tier 1
- Task 2.10: plugin.json description update, CHANGELOG first-npm-publish note
- Cascade notes added to Tasks 1.5, 1.6, 1.9, 1.13

**Session summary saved:** `knowledge/sessions/2026-05/2026-05-25-v0.6.0-phase-1-planning-multi-platform-decisions.md`
_(unstaged — needs commit)_

---

## Immediate Next Actions

### 1. Merge v0.5.8 (prerequisite for v0.6.0 branch)
Branch is fully implemented. Just needs PR merge.
```bash
gh pr create --base main --title "v0.5.8 — fix plan rules injection + MEMORY.md cascade"
```

### 2. Continue Phase 1 decisions (where we left off)

**Last completed:** Decision 6 (.cursorrules → .cursor/rules/)
**Next up:** Working through project-wide impact items 3–5, then resume Phase 1 decisions 1.4–1.13

**Project-wide impacts still to address:**
- Impact 3 — ENH-013 blocks Task 2.4 (rename `kg-recall` → `auto-recall` BEFORE creating 140 tool mapping files)
- Impact 4 — ENH-014 / v0.6.0 config migration overlap (`commands/init.md` touched by both — sequence carefully)
- Impact 5 — Hook variable audit (confirm no `${CLAUDE_PROJECT_DIR}` survivors after e727b226 fix)

**Remaining Phase 1 decisions (1.4–1.13):**
- 1.4 — kg-config.json migration path (`~/.claude/` → `~/.kmgraph/`)
- 1.5 — Bootstrap skill (now 14 skills × 10 platforms = 140 combinations)
- 1.6 — Co-located MCP vs npm-global (Option B path now concrete: `$(npm root -g)/@stayinginsync/kmgraph/dist/index.js`)
- 1.7 — Postinstall landmine (no decision — just a bug fix)
- 1.8 — Clone-once vs per-platform-copy
- 1.9 — Hooks: accept-and-document vs port (10 platforms now weighs toward accept-and-document)
- 1.10 — AGENTS.md symlink (Windows compat)
- 1.11 — Copilot CLI scope (enterprise-gated, untestable)
- 1.12 — npm publish mechanics
- 1.13 — INSTALL.md detection (now 10 Tier 1; Cursor needs dual-detection)

**Pending 1.3 sub-decisions not yet reached:**
- Decision 7 — `kg_*` MCP tool names in templates (affects MCP-setup fallback on non-Claude platforms)
- Decision 8 — "Platform Preferences (X)" heading required in every template (for rules-capture-agent append logic)
- Decision 9 — Merge strategy for existing hand-edited platform files

**Working pattern established this session:**
- Use `/kmgraph:recall` before EVERY recommendation
- After each decision: update plan inline + capture any Docusaurus page updates (specific file paths, not generic "docs site")
- After every 2–3 decisions: check for cascading impacts on remaining Phase 1 tasks AND project-wide
- Opus review for complex/risky decisions before user decides

---

## v0.5.8 Status

Fully implemented. Commits on branch:
```
1889d9e0 v0.5.8: fix plan rules injection + MEMORY.md cascade (ENH-013, ENH-014)
87dcad4c docs(core): update PATTERNS-GUIDE MEMORY.md section for profile-file arch
faa4fafe fix(release): address Opus review findings pre-PR
98e46617 test(hooks): fix profile-file staleness tests to use fake HOME
1a1f8340 chore(release): bump version 0.5.7.1 → 0.5.8
c10d0805 fix(capture): route behavioral captures to profile files (ENH-014)
6622103d fix(commands): relay subagent draft to main thread
c4d16e78 test: register pre-skill-rules-inject suite
01ce0698 fix(hooks): restore stop-plan-gate.sh to canonical repo
9a3da316 fix(hooks): inject project knowledge/rules.md + hard block promotion
```

---

## Open PRs (oldest first — backlog)

| PR | Title | Branch | Age |
|----|-------|--------|-----|
| #71 | CI Node.js 24 + version sync | v0.2.4.1-beta | 7 weeks |
| #73 | Draft-and-approve flow | v0.3.2-capture-draft-approve | 7 weeks |
| #76 | Docs: no-branch-delete rule | docs-update-no-branch-delete-rule | 7 weeks |
| #90 | Chat-history path config | v0.3.8-chat-history-path-config | 6 weeks |
| #112 | MEMORY.md governance migration | v0.5.6-update-graph-governance-migration | 3 weeks |
| #122 | Dependabot bump | dependabot/... | Today |

⚠️ PRs #71–#112 are stale (predating many architecture changes). Likely need triage before merging.

---

## Key Files

| File | Purpose |
|------|---------|
| `docs/plans/v0.6.0-multi-platform-expansion.md` | Active plan — Phase 1 decisions being recorded here |
| `docs/plans/v0.5.8-fix-plan-rules-injection.md` | Complete — just needs PR |
| `knowledge/sessions/2026-05/2026-05-25-*.md` | Today's session summary (unstaged) |
| `~/.claude/plans/v0.6.0-multi-platform-expansion.md` | Canonical plan copy |
