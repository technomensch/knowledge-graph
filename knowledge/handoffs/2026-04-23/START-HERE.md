# Handoff — v0.5.2 Docs Cleanup Session

**Date:** 2026-04-23
**Branch:** `v0.5.2-beta-phase3-tier-resolver`
**Last commit before this session:** `83becf2d` — test suites for tier resolver
**Status:** All docs changes unstaged — ready to commit and PR

---

## What This Session Was About

A comprehensive user-facing documentation pass for the v0.5.x release. The goal was to bring all docs up to date with the new tier abstraction system (fast/standard/powerful tiers, Ollama/LM Studio support, ai-model-tier-resolver), ADR implementation commit capture, and general housekeeping accumulated since the last docs update.

This was NOT a code change session. Everything here is documentation only.

---

## What Was Done

### Content updates (new features documented)
- **README.md** — Rewrote all v0.5.x/v0.4.x/v0.3.x version sections in user voice ("what changed and how does it affect me"). Consolidated each set of minor versions into a single section. Added Upgrading section. Added tier/Ollama/LM Studio coverage. Added create-adr and init-personal-kg to command list.
- **docs/CONFIGURATION.md** — Added full "Model Tier Configuration" section: personal defaults, project overrides, Ollama/LM Studio with host/port YAML, profile_schema field, tier-collapse fallback behavior
- **docs/GLOSSARY.md** — Added Tier Label, Tier Map, Alias Map, Tier Collapse, User Profile/Project Profile, Unknown-Model Trigger
- **docs/guides/me-and-rules.md** — Added platforms[] subsection with full YAML including profile_schema, host/port for local models, unreachable-model behavior
- **docs/guides/create-adr.md** — Updated to reflect wizard auto-captures implementation commit; added design-first ADR note
- **docs/reference/agents.md** — Added create-adr-agent row
- **docs/reference/commands.md** — Added Ollama/LM Studio discovery to init row; added create-adr description
- **docs/COMMAND-GUIDE.md** — Added tier config coverage to init section; rewrote 5 Purpose lines in third-person; added create-adr steps; reformatted capture-lesson; removed stale tags
- **docs/templates/decisions/ADR-template.md** — Updated implements field from [MANUAL] to [AUTO]
- **docs/templates/decisions/README.md** — Rewrote field guide; added wizard-first workflow
- **CHANGELOG.md** — Plain-language rewrites throughout v0.5.x entries

### Housekeeping (structural cleanup)
- Dropped `-beta` from all user-facing version strings and package files
- Removed "Beta Release" status language; replaced with "Actively developed and in daily use"
- Updated stale version numbers: CHEAT-SHEET (0.3.6→0.5.2), COMMAND-GUIDE (0.3.6→0.5.2), CONCEPTS (0.3.6→0.5.2), STYLE-GUIDE (0.1.0→0.5.2), reference/commands (0.3.9→0.5.2)
- Updated all `Updated:` / `Last Updated:` header dates to 2026-04-22
- Updated all stale `<!-- Updated: -->` section comments
- Removed `[NEW in v0.2.x]` / `(v0.2.x-beta)` inline version badges (kept [NEW in v0.5.2] only)
- Removed `(v0.2.1-beta refactored)` / `(v0.2.2-beta)` annotations from CHEAT-SHEET
- Removed "Commands (23 Total)" count from README (counts go stale)
- Removed "11 agents" count from README directory tree
- Removed ancient "Duplicate hooks file detected — fixed in v0.0.1-alpha" from Common Issues
- Removed "Phase 5 (publication)" from Contributing; replaced with open-source invite
- Fixed broken link: `docs/GETTING-STARTED.md` → `docs/quickstart.mdx`
- Updated MCP tool count: 7 → 12
- Updated Development Status: current release, removed stale checklist and Recent Versions table
- Added `skills/` directory to README tree (was missing)
- Consolidated v0.3.x versions into one section; flagged as major architectural change with optional migration note
- **commands/update-doc.md** — Added Step 2.5 pre-flight housekeeping scan + full user-facing file list (Tier 1/2/3)

---

## The Owner's Style

**Voice:** Conversational, direct, user-impact focused. The README and changelog should sound like a developer talking to another developer — not marketing copy, not internal engineering notes. "What changed and how does it affect me" is the frame.

**What he hates:**
- Internal jargon in user-facing copy ("S4", "S5", "phase3", "thin dispatcher", "ai-model-tier-resolver")
- Em dashes — use commas, "by", "including", or restructure
- "You/your" in COMMAND-GUIDE.md (third-person rule per STYLE-GUIDE)
- Hard counts that go stale ("23 Total", "11 agents", "7 tools")
- `[NEW in vX.X]` badges from old release cycles
- Inline `(vX.X-beta)` version annotations
- `<!-- Updated: old-date -->` section comments left stale
- Stale links to files that no longer exist
- "Beta" language when the tool is already in daily use
- Long walls of text — prefers bullet lists and short paragraphs

**What he wants:**
- Version badges only for the current release cycle; remove when the cycle rolls
- Counts replaced with plain headings
- Every `update-doc` run to auto-scan for housekeeping issues before touching content
- Docs that reflect what the tool actually does today, not what it used to do

**Workflow preferences:**
- Show him proposed changes before writing when content is subjective
- Make structural/housekeeping changes silently (he'll review in VS Code)
- Dispatch opus for review/analysis tasks, opus for writing tasks
- No plans needed for docs-only work — just do it

---

## Files Modified This Session

All unstaged. Commit as `docs(user-facing): v0.5.2 release docs pass and housekeeping`

| File | Change type |
|---|---|
| `README.md` | Major rewrite — version sections, command list, status, housekeeping |
| `CHANGELOG.md` | Plain-language rewrites throughout v0.5.x |
| `docs/CHEAT-SHEET.md` | Version, dates, stale inline annotations |
| `docs/COMMAND-GUIDE.md` | Tier coverage, stale tags, dates, voice fixes |
| `docs/CONCEPTS.md` | Version number |
| `docs/CONFIGURATION.md` | New tier config section with Ollama/LM Studio |
| `docs/GLOSSARY.md` | New tier/profile terminology entries |
| `docs/STYLE-GUIDE.md` | Version number |
| `docs/guides/create-adr.md` | Implementation commit auto-capture |
| `docs/guides/me-and-rules.md` | Tier overrides section with full YAML |
| `docs/reference/agents.md` | create-adr-agent row added |
| `docs/reference/commands.md` | Version, init row, Ollama/LM Studio |
| `docs/templates/decisions/ADR-template.md` | implements field [MANUAL]→[AUTO] |
| `docs/templates/decisions/README.md` | Field guide rewrite, wizard-first workflow |
| `commands/update-doc.md` | Step 2.5 pre-flight scan + file list |
| `package.json` | 0.5.2-beta → 0.5.2 |
| `.claude-plugin/plugin.json` | 0.5.2-beta → 0.5.2 |
| `mcp-server/package.json` | 0.3.10-beta → 0.3.10 |

---

## What Was Not Done (Suggestions to Continue)

### Immediate next step
Commit and PR this branch. Suggested message:
```
docs(user-facing): v0.5.2 release docs pass and housekeeping

- Documented tier abstraction, Ollama/LM Studio, profile schema across
  CONFIGURATION.md, GLOSSARY.md, me-and-rules.md, COMMAND-GUIDE.md
- Added create-adr-agent to agents reference; updated ADR template to [AUTO]
- Rewrote v0.5.x/v0.4.x/v0.3.x README sections in user voice
- Dropped -beta from all user-facing version strings
- Removed stale counts, version badges, date stamps, broken links
- Baked pre-flight housekeeping scan into update-doc command (Step 2.5)
```

### Planned next branch: `docs-update-tier-local-models`
Spec agent found gaps between the design spec and current docs. These are all docs-only:

1. **COMMAND-GUIDE.md** — The comprehensive guide has zero coverage of tier configuration as a standalone topic (not just buried in the init section). Needs a dedicated "Model Tier Configuration" section.
2. **CONFIGURATION.md** — `required_tier` opt-out field and `CLAUDE_CODE_HEADLESS=1` env var not documented
3. **GLOSSARY.md** — "Profile Schema" entry still missing
4. **me-and-rules.md** — The read-order change (rules.md is now loaded on-demand, not always) is not reflected; this is a user-visible behavior change
5. **reference/commands.md** — `docs-impact-scan` skill is invokable as a command but not listed

### Longer-term
- **v0.6.0** — Alias sunset and resolver cleanup (code changes, not docs)
- **docs-update-tier-local-models** should land before v0.6.0 so the docs are clean before the next code cycle

---

## Key Rules for Docs Work on This Project

- `commands/` and `core/templates/` are PROTECTED — never modify without explicit user permission
- Docs-only branches: `docs-update-{description}` format, no version prefix
- Code release branches: `v{ver}-{description}`
- CHANGELOG.md is for code releases only; `docs-updates/` feed is for docs site changes
- Never auto-merge — push and wait for user review
- No counts anywhere in docs (they go stale)
- No em dashes in user-facing copy
- Third-person only in COMMAND-GUIDE.md
