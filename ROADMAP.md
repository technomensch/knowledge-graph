# Knowledge Management Graph — Roadmap

## Prioritized Next (working list — captured 2026-07-13)

A filtered, ranked view onto the sections below — not a replacement for them. Every item in the roadmap is accounted for in one tier here; re-rank/prune as items land. The categorized backlog further down stays the source of truth for full detail.

### Tier 1 — Active / Do Next

- **ENH-064/#246 — Attribution README for initialized knowledge graphs.** Tracked on branch `v0.7.5-ENH-064-add-readme-to-graph` (stacked off `v0.7.4.1-graph-numbering-conflict-gate`). Auto-generate a README in every initialized graph pointing to KMGraph and telling a clone/fork reader without the plugin how to install it and run `/kmgraph:kmg-init`. Plan covers `kmg-init` wiring, `kmg-upgrade` backfill, and `INSTALL.md`/`docs/INSTALL.md` updates for the first-time-install-into-existing-graph path. Implementation complete, including a final-review fix wave (template routing, docs parity, scaffold-then-refuse leak, spec ruling); remaining: commit, push, PR.
- **v0.6.20 — Storage migration completion (ADR-066 execution).** On branch `v0.6.20-storage-migration-completion`: all 13 tasks complete (mcp-server ADR-066 fixes, upgrade-inspector cowork/global-topic handling, `kmg-init.md`/`kmg-list.md` cowork removal, the 12-file `docs/`→`knowledge/` folder-migration sweep, `INSTALL.md`/`ROADMAP.md` reconciliation, version bump to 0.6.20, supporting docs sweep, verification) — two independent review passes (Opus, Fable), findings fixed after each, plus issue-27 (a real data-loss bug in `applyStrayKnowledgeDir`, found live and fixed same session) and issue-28 (dev-loop gap between rebuilt `mcp-server/dist/` and live tool calls) discovered and filed along the way. Remaining: commit, push, PR.
- **Process/tooling gaps found 2026-07-17 — all open, none designed or fixed yet:** issue-17/#175 (no recall trigger when the assistant needs mid-task clarification), issue-18/#176 (`gov-capture-routing` is referenced by 8+ commands but unreachable via the Skill tool — the file's real, just in the wrong location; full provenance in the issue doc), issue-19/#177 (no hook-level enforcement for issue-creation discipline; proposes a `PostToolUse` hook, not yet designed), issue-20/#179 (this session skipped its own Bug/Enhancement Triage rule — the same-feature-area check and Path F/1/2/3 routing question — for 4 filings before catching itself), ENH-048/#178 (session-wrap should verify outstanding items' status/priority is still accurate before closing out; linked to ENH-002), ENH-049/#180 (notes the need to work across multiple repos/tools concurrently with different active KGs, without yet designing a solution; cross-references ADR-067).
- **issue-11 — Scan-based GitHub-issue-sync invariant.** The one item left on the branch you're already on (`v0.6.18-misc-patches`) — finish it before picking up anything else.
- **ENH-040 — Stop indexing `chat-history/*.md` in `kg_search`/`kg_fts5_rebuild`.** ADR-060 decided chat history shouldn't be searchable, but the code never caught up — confirmed still indexed as of this sweep, so every search a user runs is quietly polluted by raw chat transcripts until this lands. Cheap fix, high-frequency payoff.
- **ENH-041 — Broken nav breadcrumb in ~11 README scaffold files.** Root cause: ADR-027 deleted `GETTING-STARTED.md` but nothing updated the breadcrumbs pointing at it. Purely mechanical find/replace, and it's visible to anyone who scaffolds a new project.
- **ENH-002 — Refile as a new GitHub issue.** Issue #41 is closed, but only a wording fix actually shipped — the real feature (agent `--snapshot` mode, flag file, hooks, dedicated branch) was never built. The tracker says done when it isn't. Filing a fresh issue costs nothing and stops that false "closed" signal from being trusted later.
- **"Wrong session captured"** — a live, unresolved bug in the chat-extraction-reliability saga. The extractor sometimes grabs the wrong session, so captured knowledge can silently come from the wrong conversation entirely.
- **Docs-updates feed → site nav link.** The feed (`/knowledge-graph/docs-updates/`) plus RSS/Atom endpoints already exist and work — none are linked from navbar or footer. Wiring, not development.
- **ADR-037 — seed default graph-usage rules block at `/kmgraph:init`.** New KGs were supposed to ship with a baseline rules block, but the seeding step never made it into the init scaffold. Small fix — closes the gap between decision and reality.
- **ENH-023 remainder — "Protected files guard" injection.** Most of ENH-023 already shipped; this is the last piece — injecting a protected-files check into `pre-skill-rules-inject.sh` so paths like `commands/`/`core/templates/` can't be silently modified by a skill.
- **issue-28 — No dev-loop mechanism for locally rebuilt `mcp-server/dist/`.** Found while verifying issue-27's fix: live `kg_*` tool calls run whatever version is installed in the plugin cache, not this repo's own rebuild — passing tests can mask a fix that was never actually exercised live. No existing documented solution found; deferred (Track only), no ADR needed.
- **issue-25/issue-26/ENH-051 — process/reference gaps found while filing ENH-051.** issue-25: no documented authority for which of two overlapping mechanisms (hand-written `ENH-NNN` spec vs. `/kmgraph:kmg-start-issue-tracking`) governs enhancement capture. issue-26: `kmg-start-issue-tracking.md` references `docs/issue-tracker.md`, which never existed — same detection-gap class as issue-13. ENH-051 itself: `kg_config_init`/`kg_scaffold` still can't compute a KG path from a location choice, so `cli.ts` and `kmg-init.md` each hand-maintain their own copy — ADR-066 named the fix, never built. All three deferred (Track only).

### Tier 2 — Blocked on one decision (ENH-034)

- **ENH-034 — Command rename decision (Option A/B still open).** Whether `kmg-update-graph` becomes `kmg-ingest-graph` and `kmg-update-issue-plan` becomes `kmg-propagate-issue-plan`. Two other items are stuck waiting on this one call — resolve it and both unlock.
- **ENH-026 remainder — KG Write Guard.** `kmg-sync-all` guard + `run_extraction.py` bypass-proof check + ADR-019 supersession. A write-path integrity control that prevents bad or bypassed writes to the KG. The `kmg-update-graph` half is already done; the rest is held pending ENH-034 because the guard needs the final command names.
- **ENH-042 — Release-doc-sync mechanism.** Three disconnected mechanisms currently try to keep README/version/ROADMAP/CHANGELOG in sync and drift apart because nothing forces them to agree. It gets more expensive to untangle the longer it sits, and it's also held pending ENH-034.

### Tier 3 — Decision-debt (no code needed, just make a call)

- **ADR-046 — concept+setup hybrid page type.** File has duplicated frontmatter blocks and conflicting Proposed/Accepted status — unclear if it was ever executed in the docs site. Needs one look to confirm whether it shipped or still needs revision.
- **ENH-006 — sequential-prompts/skill-trigger-gap.** Mostly superseded, but its Step 6.4 (a ROADMAP/CHANGELOG sync gate) is still load-bearing — it caught a real sync gap recently via a generic fallback rather than its intended mechanism, since plans now go through `superpowers:brainstorming`→`writing-plans` instead of `kmg-start-issue-tracking`. Fix: add an explicit ROADMAP/CHANGELOG-sync row to the Post-Plan Validation Checklist.
- **Multiple same-day session UUIDs never deduplicated.** Unclear whether ENH-047's date-bucketing fix already incidentally solved this — needs a quick check against real data.
- **Command-surface reduction — should `kmg-update-issue-plan` be a hook instead of a command?** Untracked, no ENH filed. Needs its own brainstorm before it can be scoped.
- **ENH-025 / ENH-035 — overlapping backfill-extractor specs.** Building against either before reconciling into one spec risks building the wrong thing twice.
- **ROADMAP.md / CHANGELOG.md structural reconciliation.** Chronological ordering broken in both (stale in-progress markers, out-of-order version restarts after a stray divider). Related to ENH-042 but is one-time cleanup rather than drift prevention — decide whether to bundle with ENH-042 or handle separately.

### Tier 4 — Parked, reviewed, deliberately not now

- **Pluggable KG storage backends (Notion/Obsidian/NotebookLM as primary stores).** Needs `/kmgraph:kmg-init` wizard changes, MCP config schema additions, and a full adapter layer per backend — the largest blast radius on the roadmap, and demand for it is still speculative. Version-bump territory; don't start casually.
- **Contributor commands vs user commands separation.** `update-doc`/`create-doc`/`doc-update-router` maintain this project's own docs site but ship to every end user. Real problem; the fix itself is an open design question needing its own decision first.
- **Hierarchical skill invocation (`/kmgraph:[category]/[skill]`).** Blocked on Claude Code plugin capabilities not yet available (ADR-002) — can't build until the platform supports it.
- **`--all-graphs` flag for `kg_capture`.** Multi-KG capture in one call instead of per-KG calls. Convenience, not correctness — a working path exists today.
- **MEMORY.md auto-sync rules engine + smart summarization.** Both self-gated: the rules engine needs real-world MEMORY.md patterns from live usage before it can be designed well; summarization is lower priority until the rules engine exists. Correctly parked.
- **MEMORY.md scope narrowing.** Once `me.md`/`rules.md` fully absorb static identity/rules content, MEMORY.md's job shrinks to session-derived discoveries and pointers — evaluate necessity then. Check-back-later item.
- **All 9 documentation-polish items** (STYLE-GUIDE.md slim-down, `docusaurus-plugin-remote-content` for CHANGELOG pull, `docusaurus-theme-github-codeblock`, Markprompt/LLM Q&A search, interactive decision-tree component, notification-dispatch setup guide, CONCEPTS.md reordering, CONCEPTS.md length reduction, CONCEPTS.md accessibility fixes). Legitimate polish, none urgent; Markprompt explicitly waits on Algolia usage data. Candidate for a dedicated docs-polish pass post-v1.0.
- **4 ADR placeholders** (storage backends, contributor command separation, docs-updates feed via blog plugin, update-notifications/version-sync mechanism). Follow their parent items above — write once the underlying decision is made.
- **Skill aliases.** Autocomplete already handles this well enough — marginal gain vs. config complexity. Correctly cut.
- **Backup before destructive operations.** Real safety net, but git already provides this insurance; would be a second, redundant layer for user error specifically.
- **Archival/superseding KG entries.** Useful once KGs mature, but adds lifecycle complexity before core usage patterns are established. Revisit when a KG actually needs it.
- **Per-project config overrides.** Targets team collaboration at scale — multi-KG already covers project-local KGs today; solving a problem not yet had as a solo maintainer.
- **Cross-repo knowledge graphs.** Pattern already usable/documentable today; just needs usage examples written up — a docs task, not a build task, and not urgent.
- **Additional MCP tools** (`kg_git_metadata`, `kg_link_issue`, `kg_extract_chat` ported to MCP). Deferred on purpose — skills already do this today; porting pays off once non-Claude-Code adoption materializes post-v1.0.
- **Web UI for KG browsing** (D3.js/Cytoscape.js + Lunr.js). Large effort; markdown already judged readable enough at current scale.
- **Plugin marketplace integration.** Tagged "High — post-v1.0" — correctly sequenced after v1.0, not low-priority. Should be first thing queued once v1.0 ships, not started early.
- **ENH-030 — KG Remove/Unregister command.** No such command exists today. Real gap, but nothing's hit it yet — fine to leave until it causes actual friction.
- **ENH-027 — Superpowers Brainstorming Spec → KG Linkage.** Valuable for continuity, but an enhancement to an already-working manual path, not a fix for something broken.
- **ENH-033 — repo-context auto-detection for `kmg-update-doc`/`kmg-create-doc`.** Convenience, not correctness — safe to defer.
- **Real-data-validation checkpoint for `--rebuild`'s backup-vs-destroy behavior.** Explicitly pending a trigger condition (a real split-eligible date occurring) — nothing to build until then.

### Reviewed, out of backlog scope entirely (not action items)

- **Known Limitations (v1.0)** — 6 documented, accepted constraints with stated mitigations. Deliberate non-goals, not deferred work.
- **Community Contributions Welcome** — 5 aspirational ideas for if/when someone shows up wanting to build them. Not on the maintainer to schedule.
- **v1.0.0 planned bullets, LLM Provider Adapters, Integration Tests & CI, Template Customization System** — already explicitly scoped to v1.0/post-v1.0 with stated reasons ("Why not v1.0" given for each). Roadmap already made the call correctly; no re-triage needed.

---

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
- **Backup before destructive operations** (Medium priority) — `switch` and `init` should auto-snapshot current state before category deletion or KG removal (`cp -r` to `~/.kmgraph/kg-backups/`). Deferred: users should use git for versioning; this is insurance against user error only.
- **Archival / superseding KG entries** (Low priority) — Mark entries as `status: superseded`, archive to `archive/` subdirectory, search includes archived content. Useful for mature KGs where patterns evolve. Deferred: adds lifecycle complexity before core usage patterns are established.

### Data / Storage

- **Per-project config overrides** (Medium priority) — Allow `.kmgraph/kg-local.json` at project root to commit shared category definitions for teams. Read hierarchy: project-local → global → defaults. Deferred: multi-KG already supports project-local KGs; this targets team collaboration at scale.
- **Cross-repo knowledge graphs** (Medium priority) — Share KG entries across multiple repos via global topic-based KGs at `~/.kmgraph/knowledge-graphs/<topic>/`. Deferred: pattern already documentable; needs usage examples in PLATFORM-ADAPTATION.md.


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
- ENH-023 (remainder) — "Protected files guard" injection in `pre-skill-rules-inject.sh` not yet added (the rest of ENH-023 is already done)
- **ENH-002 — closed-but-incomplete: needs a new GitHub issue.** Spec (`knowledge/enhancements/ENH-002/ENH-002-specification.md`) and progress-log both self-report `status: partially-implemented` — only the Snapshot Gate wording fix shipped (v0.2.3.2-beta); the actual feature (agent `--snapshot` mode, flag file, hooks, dedicated implementation branch) was never built. Yet GitHub issue #41 is `CLOSED`. Found 2026-07-12 while trimming ROADMAP.md per ADR-065 — this version's stale-status class of bug (status says done, issue closed, work isn't done) is exactly what this Outstanding Action Items section exists to catch. Action: file a fresh GitHub issue for the remaining ENH-002 scope; do not treat #41's closure as evidence the feature works.
- **issue-13 / GH #170 — No automated broken-link detection anywhere in the docs pipeline — 45 broken links accumulated silently for ~3 months.** Filed 2026-07-14 (`knowledge/issues/issue-13/`, [GitHub #170](https://github.com/technomensch/knowledge-graph/issues/170), status `deferred` — Mode 3 track-only, no branch). Root cause: `docusaurus.config.js`'s `onBrokenLinks`/`onBrokenMarkdownLinks` are both `'warn'`, so no build (manual or CI) can ever hard-fail on a dead link; `skills/kmg-docs-impact-scan/SKILL.md` only greps diff'd identifiers against doc prose, structurally incapable of catching a dangling relative path; `scripts/pre-push-gate.sh` has no gate that runs a build or checks link validity at all. Full detail and proposed fix: `knowledge/issues/issue-13/solution-approach.md`. Deliberately sequenced after broken-link clusters 2/3 are fixed (see docs-site-broken-links-audit), since flipping to `'throw'` immediately would hard-fail CI on those still-broken clusters.
- **This project's decision-capture automation didn't flag that 2 of 3 presented options went unrecorded.** During v0.6.19 planning, 3 options were presented for the broken-links scope (fix all / triage / defer entirely); the user picked one, and the other two simply disappeared from the conversation with no automated prompt to record them as considered-and-declined alternatives. Flagged 2026-07-14, not yet investigated — action: determine why `kmg-adr-guide`/`kmg-brainstorm-recall`/the Decision Governance Protocol (ENH-015) didn't catch this, then file a GitHub issue once the actual mechanism gap is identified.

**Needs its own dedicated brainstorm/ADR before scheduling:**
- ENH-025 / ENH-035 — overlapping backfill-extractor specs; reconcile into one spec before any implementation
- `ROADMAP.md` / `CHANGELOG.md` structural reconciliation — chronological ordering broken in both (e.g. stale `v0.2.2-beta (In Progress: 2026-03-29)` marker here; CHANGELOG's stray `## [Released]` divider after which versions restart out of order)
- ~~ADR-067 (proposed) — mutable `.active` switch vs. context-derived KG resolution.~~ **DESIGN RESOLVED 2026-08-01** — moved out of this "needs a brainstorm" list. Full design (all 13 Fable-review items + 3 previously-undesigned mechanisms) resolved across multiple Opus/Fable review rounds; transcribed into `knowledge/decisions/ADR-067-implementation-spec.md`, fidelity-checked. Implementation plan written: `knowledge/plans/v0.7.0-adr-067-kg-resolution.md`, on branch `v0.7.0`, **not yet approved for implementation** (awaiting explicit Proceed/Start). Retires `kmg-switch`/`kg_config_switch`/`KG_MISMATCH` entirely, replaced with cwd-derived resolution + `[personal]`/`[project]` marker syntax.
  - **Close-out reminder — do not forget once this ships:** `issue-18` (`gov-capture-routing` skill unreachable, referenced by 8+ commands) overlaps with this work — its "fix vs. retire" Decision Fork should be revisited once ADR-067 lands, since the new `[personal]`/`[project]` marker + cwd-derived resolution likely subsumes what `gov-capture-routing` was trying to do, making **retire** the likely right answer rather than spending effort fixing a soon-to-be-redundant mechanism. See `knowledge/handoffs/2026-08-01-issue-18-adr-067-overlap-findings.md` for full findings. Also revisit `knowledge/issues/issue-36/` (same "phantom skill reference" failure class) at the same time.
- ~~ADR-066 (proposed) — KG *content*-storage location for global-topic/cowork modes.~~ **RESOLVED 2026-07-17** — moved out of this "needs a brainstorm" list because it got one: in conversation, plus independent web research and a Fable code review. Decision: cowork mode stops being offered for new KGs (existing content gets detected and archived, never silently dropped); global-topic mode stays, relocating `~/.claude/knowledge-graphs/<name>/` → `~/.kmgraph/knowledge-graphs/<name>/` (no wrapper folder); `cli.ts`/MCP server becomes authoritative for the storage-mode list once its own home-option bug is fixed. Full decision recorded in `knowledge/decisions/ADR-066-*.md` (status: Accepted). Implementation in progress on `v0.6.20-storage-migration-completion` (Tasks 1-12 of 13 done as of this edit — see Tier 1 entry above): `~/.claude/plans/v0.6.20-storage-migration-completion.md` (13 tasks — also completes the `docs/`→`knowledge/` folder-migration sweep an independent Fable audit found incomplete, 106 stale lines across 15 files originally flagged; 12 files actually needed a fix once re-verified at implementation time).

**Unclear — needs a human call before triaging further:**
- ADR-046 — concept+setup hybrid page type (file has duplicated frontmatter blocks, Proposed vs Accepted; unclear whether executed in the docs site)
- ENH-006 — sequential-prompts/skill-trigger-gap complaints, written pre-`kmg-` rename. New evidence from 2026-07-11 (live during c0 planning): its Step 6.4 ROADMAP/CHANGELOG sync gate — generalized into `kmg-execute-plan` — fired correctly and caught a real sync gap on this branch, so it's not superseded, still load-bearing. But the step is defined against `kmg-start-issue-tracking`'s own numbered steps, and this branch's plans (c1-c4) went through `superpowers:brainstorming`→`writing-plans` instead, which has no "Step 6.4" of its own. The check fell back to a generic grep rather than its literal meaning. The real fix: add an explicit ROADMAP/CHANGELOG-sync row to the Post-Plan Validation Checklist so non-`start-issue-tracking` plans get the same gate natively, instead of relying on `kmg-execute-plan`'s fallback.
- Multiple same-day session UUIDs never merged/deduplicated — unclear whether ENH-047's date-bucketing fix incidentally subsumed this

**Other still-outstanding (not yet batched):**
- ENH-040 — remove `chat-history/*.md` from `kg_search`/`kg_fts5_rebuild` indexing scope (ADR-060); confirmed still indexed in code as of this sweep
- ENH-030 — KG Remove/Unregister command (no such command/tool exists yet)
- ENH-027 — Superpowers Brainstorming Spec → KG Linkage
- ENH-033 — repo-context auto-detection for `kmg-update-doc`/`kmg-create-doc`
- "Wrong session captured" — live, unresolved session-selection bug in chat-extraction-reliability-saga (the oldest open thread in that saga)
- Real-data-validation checkpoint for `--rebuild`'s backup-vs-destroy behavior on a real split-eligible date — pending trigger condition, no code needed until it occurs

---

## v0.6.18 — Post-Release Patches (✅ Released: 2026-07-10)

Branch: `v0.6.18-misc-patches`

### Planned
- ✅ Fix `getProjectRoot()` KG_MISMATCH false positive (issue-10) — commit `78957a88`
- ✅ Migrate `kg-config.json` default location to platform-neutral `~/.kmgraph/` — commit `654c13fb`
- ✅ Sync `mcp-server/package.json` version to `0.6.18` — commit `e05ffef1`
- ✅ Flip 11 stale status labels + add ROADMAP "Outstanding Action Items" tracking section
- ✅ Scan-based GitHub-issue-sync invariant for `issues/`/`enhancements/` (issue-11) — commit `84f1f499`
- ✅ Scope `kmg-execute-plan` to Gemini/Antigravity only (issue-12) — commit `4e397e60`

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
**Current State**: Users can override templates in project-local knowledge/templates/

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
| v0.6.19 | Config-path split-brain fix (issue-14/#171, `~/.kmgraph` migration), personal-KG FTS5 index routing fix (issue-15/#172), docs-site broken-link + `docs/`→`knowledge/` path corrections | 2026-07-16 | ✅ Released |
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

*Last updated: 2026-07-16*
*Plugin Version: 0.6.19*
