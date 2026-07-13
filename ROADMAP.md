# Knowledge Management Graph — Roadmap

## Future / Deferred (captured 2026-04-07 during docs-restructure planning)

These items were identified during the v0.0.6-docs-restructure planning session and explicitly deferred. None are scheduled to a specific release yet — promote to enhancement issues when they reach the queue.

### Architectural (version-bump territory)

- **Pluggable knowledge graph storage backends** — Notion, Obsidian, and NotebookLM as primary stores instead of local markdown. Requires `/kmgraph:kmg-init` wizard updates, MCP server config schema additions, and per-backend adapter modules. Captured because the docs-restructure plan adds integration guides for these tools but cannot change the storage layer in scope.
- **Contributor commands vs user commands — surface area separation** — `update-doc`, `create-doc`, and the `doc-update-router` skill exist to update the KMGraph project's own docs site. Today they ship to every end user, conflating two audiences. Future work: move to a separate plugin (`kmgraph-contrib`?), gate by a `.kmgraph-contributor` marker file, or use a `commands/contributing/` subdirectory with conditional registration.
- **Hierarchical skill invocation pattern** — Future support for `/kmgraph:[category]/[skill-name]` notation to navigate skill hierarchy (currently flat). Requires Claude Code plugin evolution or workaround pattern (ADR-002).
- **`--all-graphs` flag for kg_capture MCP tool** — Enable multi-KG capture operations: write to all registered KGs in single operation. Currently requires separate calls per KG (ADR-006).

### MEMORY Management

- **MEMORY.md auto-sync rules engine** — YAML-based pattern matching to automate sync decisions (e.g., "gotcha" → "Common Failure Patterns", "best practice" → "Best Practices"). Requires real-world MEMORY.md patterns from live usage before implementation (ADR-005).
- **MEMORY.md smart summarization** — LLM-powered entry consolidation to merge similar entries and reduce token bloat. Lower priority until rules engine is operational (ADR-005).

- **MEMORY.md scope narrowing** — Once `me.md` and `rules.md` absorb static identity and rules content, MEMORY.md scope narrows to: session-derived discoveries, temporary working context, and pointers to external resources. Long-term: evaluate whether MEMORY.md becomes redundant for well-maintained KGs.

### Navigation / discoverability

- **Add `docs-updates` feed to site navigation** — The documentation updates feed (`/knowledge-graph/docs-updates/`) is live but unreachable from the navbar or footer. Add a navbar or footer link so users can discover changelog-style docs posts. RSS/Atom feeds also exist at `/docs-updates/rss.xml` and `/docs-updates/atom.xml` but are not advertised anywhere.

### Documentation polish (post-v0.0.6-docs-restructure)

- Slim-down rewrite of [STYLE-GUIDE.md](docs/STYLE-GUIDE.md) (currently 633 lines, contributors-only audience)
- `docusaurus-plugin-remote-content` to pull `CHANGELOG.md` from main branch at build time
- `docusaurus-theme-github-codeblock` for embedding source by line range
- Markprompt / LLM-powered Q&A search (wait until Algolia DocSearch usage data exists)
- Interactive decision tree component for "lesson vs ADR vs session-summary vs meta-issue"
- Setup guide for `scripts/notification-dispatch.sh`
- CONCEPTS.md page reordering — move process/workflow sections earlier for first-time users (currently buried after 400 lines of theory)
- CONCEPTS.md length reduction — trim Four-Layer Architecture (~100 lines) and How Search Works (~30 lines); currently 650 lines
- CONCEPTS.md accessibility improvements — add `accTitle`/`accDescr` to search diagrams; fix second-person pronouns in Personal vs Project section

### Process / governance (ADRs to capture)

- ADR placeholder: "Pluggable storage backends — Notion, Obsidian, NotebookLM"
- ADR placeholder: "Contributor command surface area separation"
- ADR placeholder: "Documentation updates feed via Docusaurus blog plugin" (lands in Phase 0 of the docs-restructure)
- ADR placeholder: "Update notifications and version sync mechanism" — Discovery and auto-detection for MCP/template-only users; version consistency across multiple files (ADR-011)

### UX / Ergonomics

- **Skill aliases / short commands** (Low priority) — Allow `/kmgraph:cl` as alias for `/kmgraph:kmg-capture-lesson` etc., configurable in kg-config.json. Deferred: marginal UX gain vs configuration complexity; autocomplete already handles this.
- **Backup before destructive operations** (Medium priority) — `switch` and `init` should auto-snapshot current state before category deletion or KG removal (`cp -r` to `~/.claude/kg-backups/`). Deferred: users should use git for versioning; this is insurance against user error only.
- **Archival / superseding KG entries** (Low priority) — Mark entries as `status: superseded`, archive to `archive/` subdirectory, search includes archived content. Useful for mature KGs where patterns evolve. Deferred: adds lifecycle complexity before core usage patterns are established.

### Data / Storage

- **Per-project config overrides** (Medium priority) — Allow `.claude/kg-local.json` at project root to commit shared category definitions for teams. Read hierarchy: project-local → global → defaults. Deferred: multi-KG already supports project-local KGs; this targets team collaboration at scale.
- **Cross-repo knowledge graphs** (Medium priority) — Share KG entries across multiple repos via global topic-based KGs at `~/.claude/knowledge-graphs/<topic>/`. Deferred: pattern already documentable; needs usage examples in PLATFORM-ADAPTATION.md.


### MCP / Platform Extensibility

- **Additional MCP tools** (Medium priority) — Port skill operations to MCP for cross-platform portability:
  - `kg_git_metadata` — capture branch, commit, author, PR, issue (currently bash in skills)
  - `kg_link_issue` — update YAML frontmatter + post GitHub comment (currently `/kmgraph:kmg-link-issue`)
  - `kg_extract_chat` — wrap Python extraction scripts with structured results
  - Deferred: skills already implement these; MCP layer adds value after v1.0 proves adoption.

### Visualization

- **Web UI for knowledge graph browsing** (Low priority) — Static site converting KG markdown to browsable HTML with interactive graph visualization (D3.js/Cytoscape.js) and search (Lunr.js). Deferred: KG is optimized for LLM consumption; markdown is readable enough for current scale.

### Marketplace

- **Plugin marketplace integration** (High — post-v1.0 launch) — Submit to official Claude Code plugin directory; auto-update mechanism; version compatibility matrix.
  - Requirements: sanitization checks pass, examples generalized, docs comprehensive, MCP tested on macOS + Linux, README has install instructions, CHANGELOG current.

### Outstanding Action Items (tracked 2026-07-11 — see knowledge/analysis/outstanding-items-inventory-2026-07-11.md)

Full detail, file:line evidence, and verdicts for every item below: `knowledge/analysis/outstanding-items-inventory-2026-07-11.md`. Batch A items (status-label corrections) are already closed out above/via this same commit — not repeated here.

**Next branch focus — command cluster:**
- ENH-034 — Capture-pipeline command naming and grouping (targeted renames `kmg-update-graph`→`kmg-ingest-graph`?, `kmg-update-issue-plan`→`kmg-propagate-issue-plan`?; Option A/B decision still open)
- ENH-026 (remainder) — KG Write Guard: `kmg-sync-all` guard + `run_extraction.py` bypass-proof check + ADR-019 supersession. The `kmg-update-graph` piece is already done; held pending ENH-034's naming decision (cross-linked in both specs)
- ENH-042 — Three disconnected release-doc-sync mechanisms leave README/version/ROADMAP/CHANGELOG chronically out of sync; held pending ENH-034 (cross-linked in both specs)
- Command-surface reduction / whether `kmg-update-issue-plan` should be a hook instead of a command — untracked, no ENH yet; needs its own brainstorm before scoping

**Docs/nav scaffold parity:**
- ENH-041 — Broken nav breadcrumb baked into ~11 README scaffold files (root cause: ADR-027 deleted GETTING-STARTED.md)

**Small governance/process gaps:**
- ADR-037 — seed default graph-usage rules block at `/kmgraph:init` (not yet seeded in any scaffold)
- `session-summary-agent` scans `docs/plans/` for active plans, but the real convention is `~/.claude/plans/` copied to `knowledge/plans/` — untracked, no ENH filed yet
- ENH-023 (remainder) — "Protected files guard" injection in `pre-skill-rules-inject.sh` not yet added (the rest of ENH-023 is already done)
- **ENH-002 — closed-but-incomplete: needs a new GitHub issue.** Spec (`knowledge/enhancements/ENH-002/ENH-002-specification.md`) and progress-log both self-report `status: partially-implemented` — only the Snapshot Gate wording fix shipped (v0.2.3.2-beta); the actual feature (agent `--snapshot` mode, flag file, hooks, dedicated implementation branch) was never built. Yet GitHub issue #41 is `CLOSED`. Found 2026-07-12 while trimming ROADMAP.md per ADR-065 — this version's stale-status class of bug (status says done, issue closed, work isn't done) is exactly what this Outstanding Action Items section exists to catch. Action: file a fresh GitHub issue for the remaining ENH-002 scope; do not treat #41's closure as evidence the feature works.

**Needs its own dedicated brainstorm/ADR before scheduling:**
- ENH-025 / ENH-035 — overlapping backfill-extractor specs; reconcile into one spec before any implementation
- `ROADMAP.md` / `CHANGELOG.md` structural reconciliation — chronological ordering broken in both (e.g. stale `v0.2.2-beta (In Progress: 2026-03-29)` marker here; CHANGELOG's stray `## [Released]` divider after which versions restart out of order)

**Unclear — needs a human call before triaging further:**
- ADR-046 — concept+setup hybrid page type (file has duplicated frontmatter blocks, Proposed vs Accepted; unclear whether executed in the docs site)
- ENH-006 — sequential-prompts/skill-trigger-gap complaints, written pre-`kmg-` rename. **New evidence (2026-07-11, live during c0 planning):** its Step 6.4 ROADMAP/CHANGELOG sync gate (generalized into `kmg-execute-plan`) fired correctly and caught a real sync gap on this branch — NOT superseded, still load-bearing. But it's defined against `kmg-start-issue-tracking`'s own numbered steps, and this branch's plans (c1-c4) went through `superpowers:brainstorming`→`writing-plans` instead, which has no "Step 6.4" of its own — the check fell back to a generic grep rather than its literal meaning. Real gap: reconcile by adding an explicit ROADMAP/CHANGELOG-sync row to the Post-Plan Validation Checklist so non-`start-issue-tracking` plans get the same gate natively, instead of relying on `kmg-execute-plan`'s generalized fallback.
- Multiple same-day session UUIDs never merged/deduplicated — unclear whether ENH-047's date-bucketing fix incidentally subsumed this

**Other still-outstanding (not yet batched):**
- ENH-040 — remove `chat-history/*.md` from `kg_search`/`kg_fts5_rebuild` indexing scope (ADR-060); confirmed still indexed in code as of this sweep
- ENH-030 — KG Remove/Unregister command (no such command/tool exists yet)
- ENH-027 — Superpowers Brainstorming Spec → KG Linkage
- ENH-033 — repo-context auto-detection for `kmg-update-doc`/`kmg-create-doc`
- "Wrong session captured" — live, unresolved session-selection bug in chat-extraction-reliability-saga (the oldest open thread in that saga)
- Real-data-validation checkpoint for `--rebuild`'s backup-vs-destroy behavior on a real split-eligible date — pending trigger condition, no code needed until it occurs

---

## v0.6.18 — Post-Release Patches (🔲 In Progress: 2026-07-11)

Branch: `v0.6.18-misc-patches`

### Planned
- ✅ Fix `getProjectRoot()` KG_MISMATCH false positive (issue-10) — commit `78957a88`
- ✅ Migrate `kg-config.json` default location to platform-neutral `~/.kmgraph/` — commit `654c13fb`
- ✅ Sync `mcp-server/package.json` version to `0.6.18` — commit `e05ffef1`
- ✅ Flip 11 stale status labels + add ROADMAP "Outstanding Action Items" tracking section
- 🔲 Scan-based GitHub-issue-sync invariant for `issues/`/`enhancements/` (issue-11)

---

## v1.0.0 (Planned)

**Status**: Planning — no target quarter committed as of 2026-07-12 (original "Q2 2026" estimate has elapsed with work not yet started)
**Focus**: Stable release — community feedback incorporated, marketplace launch

### Planned
- 🔲 Bug fixes from beta testing
- 🔲 Performance optimizations (large KG search benchmarking — target: <2s for 500+ files)
- 🔲 Enhanced documentation based on user feedback
- 🔲 Additional real-world usage examples
- 🔲 Marketplace submission (plugin passes sanitization, docs comprehensive, MCP tested macOS + Linux)

_See [Future / Deferred](#future--deferred-captured-2026-04-07-during-docs-restructure-planning) for post-v1.0 feature backlog._

---

### LLM Provider Adapters
**Priority**: Medium (for non-Claude users)
**Use Case**: Make skills work with GPT-4, Gemini, local LLMs

Abstraction layer for provider-specific features:
- GitHub integration (requires API tokens for non-Claude users)
- MCP compatibility (Claude Desktop, Cursor, Continue.dev, Cline)
- Prompt format adapters (some LLMs don't support tool use the same way)

**Implementation**:
- Provider config in kg-config.json: `"provider": "claude|gpt4|gemini|local"`
- Skills check provider and adjust behavior
- Document provider-specific limitations

**Why not v1.0**: Claude Code is the primary target. Core/ already supports platform-agnostic workflows for other LLMs.

---

### Integration Tests & CI
**Priority**: High (post-v1.0)
**Use Case**: Automated testing before publishing updates

Test suite:
- Template validation (all placeholders documented, syntax valid)
- Example sanitization (no project-specific terms)
- MCP server build (TypeScript compiles without errors)
- Skill syntax validation (YAML frontmatter valid)
- Cross-reference integrity (no broken links in examples)

**CI Pipeline** (GitHub Actions):
```yaml
- Lint shell scripts (shellcheck)
- Validate Python scripts (ruff)
- Test MCP server build
- Run sanitization validator
- Check example content
```

**Why not v1.0**: Manual testing sufficient for initial release. CI is for sustainable maintenance.

---

### Template Customization System
**Priority**: Medium
**Current State**: Users can override templates in project-local docs/templates/

Enhancements:
- Template inheritance (extend plugin template, override specific sections)
- Template variables with defaults
- Visual template editor (web UI)
- Template gallery (community-contributed templates)

**Example extended template**:
```markdown
<!-- Extends: ${CLAUDE_PLUGIN_ROOT}/core/templates/lessons-learned/lesson-template.md -->
<!-- Adds: security-impact field -->

---
title: "{{ title }}"
security-impact: high|medium|low|none
---
```

**Why not v1.0**: Users can already copy templates and modify. Inheritance adds complexity for marginal benefit.

---

## Known Limitations (v1.0)

These are understood constraints that won't be addressed in v1.0:

1. **MEMORY.md Discovery**: Uses heuristics (project hash search). May fail for non-standard setups.
   - **Mitigation**: User can manually provide path via config

2. **Multi-User Collaboration**: No conflict resolution for concurrent KG edits
   - **Mitigation**: Use git for versioning, communicate within team

3. **Large Binary Files**: Chat extraction doesn't handle binary log formats (only text-based JSONL, JSON, protobuf)
   - **Mitigation**: Document supported formats, add converters if needed

4. **Cross-Platform Scripts**: Bash scripts tested on macOS and Linux, not Windows
   - **Mitigation**: Document WSL requirement for Windows users

5. **GitHub-Only Integration**: Issue linking requires GitHub (no GitLab, Bitbucket, Azure DevOps)
   - **Mitigation**: Document as GitHub-specific feature, make optional

6. **No Cloud Sync**: KG data is local-only (no automatic sync across machines)
   - **Mitigation**: Users can sync via git, Dropbox, etc.

---

## Community Contributions Welcome

Ideas for community-driven enhancements:
- Additional template categories (security, compliance, legal)
- Platform adapters (JetBrains IDEs, Emacs, Vim)
- MCP tools for other knowledge management systems (Obsidian, Notion, Roam)
- Internationalization (non-English templates and examples)
- Integration with external knowledge bases (Confluence, Wiki.js, Docusaurus)

**Contributing**: See CONTRIBUTING.md (to be added post-v1.0)

---

## Version History & Planning

| Version | Focus | Release Date | Status |
|---------|-------|-------------|--------|
| v0.0.1-alpha | Core plugin + 16 commands + MCP server + architecture migration | 2026-02-16 | ✅ Released |
| v0.0.2-alpha | Validation + knowledge-graph-usage skill + marketplace branding | 2026-02-16 | ✅ Released |
| v0.0.3-alpha | Automation + memory management + duplicate detection | 2026-02-16 | ✅ Released |
| v0.0.4-alpha | MEMORY.md restore capability (see ADR-001) | 2026-02-16 | ✅ Released |
| v0.0.5-alpha | Validation fixes + issue tracking command | 2026-02-17 | ✅ Released |
| v0.0.6-alpha | Distribution hygiene + files allowlist | 2026-02-17 | ✅ Released |
| v0.0.7-alpha | Documentation consolidation (CHEAT-SHEET, CONCEPTS, COMMAND-GUIDE, etc.) | 2026-02-20 | ✅ Released |
| v0.0.8-alpha | Universal installer + three-tier installation architecture | 2026-02-20 | ✅ Released |
| v0.0.8.1-alpha | Documentation infrastructure (FAQ, DEPLOYMENT-SITEMAP, CONTRIBUTING) | 2026-02-21 | ✅ Released |
| v0.0.8.2-alpha | Update-doc --user-facing command | 2026-02-21 | ✅ Released |
| v0.0.8.3-alpha | Plugin namespace refactor (knowledge → kg-sis) | 2026-02-21 | ✅ Released |
| v0.0.8.4-alpha | Extract-chat date/project filtering | 2026-02-21 | ✅ Released |
| v0.0.8.6-alpha | MkDocs Material theme customization + documentation updates | 2026-02-22 | ✅ Released |
| v0.0.8.7-alpha | Manual documentation updates + npm security fixes | 2026-02-22 | ✅ Released |
| v0.0.9-alpha | Infrastructure alignment, kmgraph namespace, hook consolidation | 2026-02-27 | ✅ Released |
| v0.0.10-alpha | Skills (5), subagents (2), KG backfill, handoff command | 2026-02-27 | ✅ Released |
| v0.0.10.4-alpha | MCP node_modules auto-install fix | 2026-03-01 | ✅ Released |
| v0.1.0-beta | First beta release — ready for external testing | 2026-03-03 | ✅ Released |
| v0.1.1-beta | Context-mode token savings integration | 2026-03-16 | ✅ Released |
| v0.1.2-beta | Native FTS5 search | 2026-03-16 | ✅ Released |
| v0.2.0-beta | Layered architecture restructuring | 2026-03-16 | ✅ Released |
| v0.2.1-beta | MCP write tools, agent portability, AGENTS-template | 2026-03-27 | ✅ Released |
| v0.2.2-beta | Personal KG, session snapshot on capture, FTS5 upgrade fix | 2026-03-29 | ✅ Released |
| v0.3.0-beta | KG default path migration (`docs/`→`knowledge/`), plan metadata standards (ADR-028) | 2026-04-10 | ✅ Released |
| v0.3.1-beta | Obsidian wiki link formatting, `init-shared/` module layer (ADR-031) | 2026-04-10 | ✅ Released |
| v0.3.2-beta | Draft-and-approve UX for lesson/ADR capture skills | 2026-04-10 | ✅ Released |
| v0.5.8 | Rules-inject project-rules extraction, MEMORY.md cascade fixes | 2026-05-25 | ✅ Released |
| v0.5.9 | Decision Governance Protocol (ENH-015) | 2026-05-27 | ✅ Released |
| v0.5.10 | Codex CLI expansion, ENH-021 continues_from, template disambiguation | 2026-06-14 | ✅ Released |
| v0.5.11 | Security fix (esbuild HIGH CVE) | 2026-06-14 | ✅ Released |
| v0.6.0 | kmg- prefix normalization (ADR-053) | | ✅ Released |
| v0.6.16 | Chat-extraction message loss/format-drift fixes (ENH-038), enhancements/issues README indexes | 2026-07-06 | ✅ Released |
| v0.6.17 | Multi-day session date-bucketing (ENH-047), Gemini project-scoping (ENH-044), extractor `--rebuild` mode (ENH-043) | 2026-07-10 | ✅ Released |
| v0.6.18 | Post-merge extraction regression fixes (data-loss/security), hook `KG_CONFIG_PATH` compliance (ADR-012) | 2026-07-10 | ✅ Released |
| v1.0.0 | Stable release with alpha feedback | (unscheduled) | Planning |
| v1.1.0 | Performance + UX improvements | Q3 2026 | Roadmap |
| v1.2.0 | Cross-platform adapters | Q4 2026 | Roadmap |
| v2.0.0 | Web UI + advanced automation | 2027 | Vision |

---

## Feedback & Feature Requests

- **GitHub Issues**: https://github.com/technomensch/knowledge-graph/issues
- **Discussions**: https://github.com/technomensch/knowledge-graph/discussions
- **Priority Voting**: Community can upvote features in Discussions

**Decision Criteria**:
- Does it align with "knowledge capture and cross-session memory" mission?
- Does it benefit majority of users, or just edge cases?
- Can it be implemented without breaking existing workflows?
- Is maintenance burden acceptable?

---

*Last updated: 2026-07-12*
*Plugin Version: 0.6.18*
