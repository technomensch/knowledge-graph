# Architecture Decision Records (ADRs)

**Navigation**: [Home](../../../README.md) > [Getting Started](../../../docs/GETTING-STARTED.md) > [Manual Workflows](../../docs/WORKFLOWS.md) > Templates

Formal documentation of significant architecture decisions.

**Total ADRs:** 70
**Last Updated:** 2026-08-04

---

## Active ADRs

[ADRs with Status: Accepted]

---

## All ADRs (Chronological)

- [ADR-068: Lightweight-vs-Full Workflow Rule, and a Piloted Command-Completion Check for Handoff/Recall File Tracing](ADR-068-lightweight-vs-full-workflow-rule-and-piloted-command-completion-check.md) — **Status:** Accepted — issue-25's lightweight-vs-full workflow rule: use a hand-written file (no branch, no GitHub issue) when no code change is planned, no external visibility is needed, and the write-up fits in a paragraph or two; paired with a piloted command-completion check for handoff/recall file tracing.
- [ADR-067: Mutable `.active` switch vs context-derived KG resolution — decision pending](ADR-067-mutable-active-switch-vs-context-derived-kg-resolution.md) — **Status:** Proposed — context + open decision only, explicitly deferred (not decided this session); related to [ADR-066](ADR-066-kg-content-storage-location-for-global-and-cowork-modes.md), governs [ENH-051](../enhancements/ENH-051/ENH-051-specification.md).
- [ADR-067 Implementation Spec: KG Resolution Model](ADR-067-implementation-spec.md) — **Status:** Ready for implementation — Companion implementation-ready reference transcribed from the full ADR-067 brainstorm/review record (13 Fable-review items + 3 previously-undesigned mechanisms, resolved 2026-07-28); the source ADR above remains the durable decision record and rationale trail, this document covers *what to build*.
- [ADR-066: KG content-storage location for global-topic and cowork modes](ADR-066-kg-content-storage-location-for-global-and-cowork-modes.md) — **Status:** Accepted — resolved 2026-07-17; decided cowork KG mode should be retired and global-topic KG storage relocated. Implemented on `v0.6.20-storage-migration-completion` (this branch) — cowork retirement, storage-location bugfixes, and the 12-file `docs/`→`knowledge/` folder-migration sweep all trace back to this decision.
- [ADR-065: ROADMAP.md and CHANGELOG.md duplication — CHANGELOG is the single source of truth for shipped history](ADR-065-roadmap-changelog-duplication-changelog-is-source-of-truth.md) — **Status:** Accepted — CHANGELOG.md is authoritative for shipped history; ROADMAP.md covers forward-looking/unshipped work only.
- [ADR-064: Shared Module Pattern for Slash Command Deduplication](ADR-064-shared-module-pattern-for-slash-command-deduplication.md) — **Status:** Accepted — Duplicated init command logic extracted into five parameterized shared modules under `commands/kmg-init-shared/`; parent commands invoke modules by name with explicit parameter contracts. (Restored 2026-07-12 from archive — original was overwritten by ADR numbering collision on 2026-04-10.)
- [ADR-063: Never destroy known-good state before the replacement is confirmed written](ADR-063-never-destroy-known-good-state-before-confirmed-write.md) — **Status:** Accepted — two unrelated subsystems (chat-extraction's `--rebuild` path, and the separate `kg-config-silent-overwrite` bash-hook incident) independently hit the identical anti-pattern on the same day: destroying existing state (`shutil.rmtree`, `cp`/`rm -f` over a real config file) before a replacement was confirmed written, protected only by best-effort cleanup that a non-graceful interruption could bypass. Decision: never destroy old state until the new state exists and is confirmed complete — atomic write (temp file + rename/replace) plus rename-aside (not delete) for anything that must eventually be cleared. Implemented on `v0.6.18-fix-extraction-regressions` (chat-extraction side) and the merged sibling `v0.6.19-fix-kg-config-silent-overwrite` work (kg-config side).
- [ADR-062: Gemini .pb/hash-named directory project scoping fails closed, not open](ADR-062-gemini-pb-project-scoping-fail-closed.md) — **Status:** Accepted — real-data testing found ENH-044's `.json`/`.jsonl` `--project` fix (v0.6.17) didn't close the whole contamination vector: `.pb` files carry no per-project path signal, so 93 real `.pb` files and 9 hash-named directories were still unscoped (masked on this machine only by an absent optional dependency). Decision: fail closed — exclude anything unattributable to the requested project, with a visible skip notice, rather than risk leaking a foreign project's private conversation into this project's committed, searchable knowledge graph. A future payload-decoded project signal could recover excluded content later, explicitly deferred. Implemented under umbrella [ENH-038](../enhancements/ENH-038/ENH-038-specification.md) / [ENH-044](../issues/chat-extraction-reliability-saga/attempts/ENH-044/specification.md). **Amended 2026-07-11:** a post-merge review found the implementation didn't fully achieve this decision — check ordering let a hex `--project` filter fail open on a hash-named directory; closed (policy unchanged, ordering fixed).
- [ADR-061: First-run repair notice must be platform-specific, not one unified mechanism](ADR-061-first-run-repair-notice-platform-specific-not-unified.md) — **Status:** Accepted — v0.6.17's `--rebuild` feature (ENH-043) needed a way to tell users their chat-history might be affected. A first design pass proposed one uniform notice for Claude/Gemini/Codex; rejected after finding the three platforms have genuinely different failure modes (data loss vs. contamination vs. staleness). Decision: platform-specific notices with different remedies — Claude gets a layered notice + concrete backup-recovery guidance + new `--claude-projects-dir`/`--source-root` flags; Gemini gets a corrective `--project`-scoping note; Codex is out of scope, filed separately as [ENH-045](../issues/chat-extraction-reliability-saga/attempts/ENH-045/specification.md) (now tracked under umbrella [ENH-038](../enhancements/ENH-038/ENH-038-specification.md)).
- [ADR-060: Narrow kg_search scope away from raw chat-history — let context-mode own session recall](ADR-060-narrow-kg-search-scope-away-from-raw-chat-history.md) — **Status:** Proposed — Re-evaluated context-mode (v1.0.169) against kmgraph now that context-mode ships full session-continuity + RRF/proximity/fuzzy-ranked search. Decision: stop indexing raw `chat-history/*.md` in `kg_search`/`kg_fts5_rebuild` — context-mode owns ephemeral session/decision recall, kmgraph owns durable curated artifacts (ADRs/lessons/enhancements) only. Does not change ADR-001's multi-KG active-pointer model. Implemented by [ENH-040](../enhancements/ENH-040/ENH-040-specification.md).
- [ADR-059: Plans must not hardcode derivable counts — derive at run time](ADR-059-no-hardcoded-derivable-counts-in-plans.md) — **Status:** Accepted — Caught live in the v0.6.16 plan: `knowledge/enhancements/` count drifted 36→37→38 within one planning session as ENH-037 and ENH-038 were both created mid-session. Decision: plans must never hardcode a computed file/folder/entry count as a fixed expectation — phrase it as "derived at run time from `<command>`" instead. Rule-only change to `~/.kmgraph/plan-authoring-rules.md`; motivated by this user's actual multi-platform concurrent-session operating mode (Claude/Codex/Gemini on the same repo), not a hypothetical.
- [ADR-058: Command/skill naming and scope decisions require an upfront check, not ad-hoc creation](ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings.md) — **Status:** Accepted — A design session found 5 naming/scope confusions. A second opinion confirmed they are different failure modes (doc drift, scope leakage, architectural accretion, a missing feature) sharing one process gap: no upfront naming/scope check for new commands/skills/docstrings. Decision: establish a three-question check (audience / collision / accuracy) in CONTRIBUTING + the ADR-guide surface. Cites ADR-056 and ADR-057 as evidence (does not re-decide them); governs child [ENH-033](../enhancements/ENH-033/ENH-033-specification.md)/[034](../enhancements/ENH-034/ENH-034-specification.md)/[035](../enhancements/ENH-035/ENH-035-specification.md)/[036](../enhancements/ENH-036/ENH-036-specification.md) (all ready now). Target v0.7.0.
- [ADR-057: Detection layer requires unified design, not piecemeal growth](ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md) — **Status:** Accepted — 5 independent capture-trigger skills (lesson-capture, adr-guide, rules-capture, update-profile, capture-router) traced to accreted, undesigned growth. Decision: consolidate detection/classification into one shared skill; keep drafting agents separate. Originally deferred pending the parent auto-capture pipeline design — 2026-07-03 amendment found no real dependency; consolidation ENH is ready to spec now.
- [ADR-056: Reject plugin-split for contributor-only doc commands; fix via repo-context auto-detection](ADR-056-reject-plugin-split-for-contributor-only-doc-commands.md) — **Status:** Accepted — Rejects a `kmgraph-contrib` plugin (and marker-file / subdirectory options) for `kmg-update-doc`/`kmg-create-doc`; the real defect is imposed house style, not packaging. Resolves ADR-027's deferred item via behavioral auto-detection ([ENH-033](../enhancements/ENH-033/ENH-033-specification.md)) plus severity-dot labeling.
- [ADR-055: Cross-Platform Upgrade Triggering — Version Sentinel Over Startup Notification](ADR-055-cross-platform-upgrade-triggering-version-sentinel-over-startup-notification.md) — **Status:** Accepted — Selected a version-sentinel file plus AGENTS.md instruction over a startup-notification mechanism for detecting and triggering cross-platform upgrades.
- [ADR-054: Document Cache-Clear as Official Upgrade Path for Claude Code Plugin](ADR-054-document-cache-clear-upgrade-workaround.md) — **Status:** Accepted — Documents the confirmed Claude Code/Codex CLI plugin-cache staleness bug and establishes manual cache-clear as the official upgrade workaround until an upstream fix ships. Renumbered from ADR-006 (collision) on 2026-06-15; the original ADR-006-slugged file remains on disk unlinked pending cleanup.
- [ADR-053: kmg- Prefix as Canonical Cross-Platform Skill and Command Naming Convention](ADR-053-kmg-prefix-cross-platform-naming.md) — **Status:** Accepted — Applies the `kmg-` prefix to all skill and command names (directory names, SKILL.md `name:` fields, command filenames) as the canonical cross-platform naming convention.
- [ADR-052: docs-impact-scan User-Facing Guide Page](ADR-052-docs-impact-scan-user-facing-guide.md) — **Status:** Accepted — Adds a dedicated user-facing guide at `docs/pillars/tailoring/docs-impact-scan.md` covering the eight-step workflow, pre-push gate contract, trigger phrases, and learned-correction behavior.
- [ADR-051: Session Summary / Handoff Asymmetric Coupling via continues_from](ADR-051-session-summary-handoff-asymmetric-coupling.md) — **Status:** Accepted — Adds optional `continues_from` frontmatter field to handoff documents; when set, the "what was completed" section collapses to a one-liner pointing at the session summary. Asymmetric one-way coupling: handoff → summary only.
- [ADR-050: Pre-Push Composite Gate + Inline Recommendation Gate](ADR-050-pre-push-composite-gate-inline-recommendation-gate.md) — **Status:** Accepted — Wires pre-push version-sync (Gate 2) and docs-impact-scan completion flag (Gate 3) as advisory PreToolUse Bash hooks; wires UserPromptSubmit hook for inline recommendation recall/ADR-precheck/cascade gate with per-session PID debounce.
- [ADR-049: Review Audit Protocol — Post-Plan/Pre-Push Review Governance](ADR-049-review-audit-protocol-post-plan-pre-push-review-governance.md) — **Status:** Accepted — Formal review audit protocol scoped to post-plan/pre-push audits, PR audits, and explicit "full review" requests; findings mid-review are investigated via non-blocking background agents rather than derailing the pass.
- [ADR-048: Governance Capture Routing — update-graph Flag-Only, session-wrap as Action Point](ADR-048-governance-capture-routing.md) — **Status:** Accepted — update-graph Step 8 flags governance-worthy content in output only (no writes); session-wrap is the sole action point that surfaces the capture prompt.
- [ADR-047: Profile Auto-Load — Inject Routing Layer Only (me.md + triggers.md), Not rules.md](ADR-047-profile-auto-load-routing-layer-only.md) — **Status:** Accepted — SessionStart hook injects only the routing layer (me.md + triggers.md) at session start; rules.md is loaded on demand rather than unconditionally.
- [ADR-046: Introduce concept+setup hybrid page type and document how-to guide pattern separately from narrative guides](ADR-046-concept-setup-hybrid-page-type-and-how-to-guide-pattern.md) — **Status:** Accepted — Adds style guide section 4g for Goal/Prerequisites/Steps/Verify how-to pattern; retains 4a for narrative guides; names concept+setup hybrid as a distinct third type.
- [ADR-045: Implement Profile Update Functionality as a Skill, Not a Command](ADR-045-update-profile-skill-not-command.md) — **Status:** Accepted — Skill over command: zero doc-update cost, natural language activation; platform-agnostic command deferred to future roadmap when non-CC usage grows.
- [ADR-044: Split Oversized Daily Chat History Files for Obsidian Compatibility](ADR-044-split-oversized-chat-history-files.md) — **Status:** Accepted — When a daily chat history file exceeds 900 KB or 30,000 lines, split into numbered parts in a YYYY-MM-DD/ subfolder; get_output_path reroutes transparently.
- [ADR-043: PreToolUse Hook Injection to Enforce User Rules During Superpowers Skill Execution](ADR-043-pretooluse-hook-injection-superpowers-rule-enforcement.md) — **Status:** Accepted — PreToolUse hook injects ~/.kmgraph/rules.md before brainstorming/writing-plans skills execute, ensuring file-location and execution-mode rules override skill defaults. (Renumbered from ADR-041 — cross-branch collision.)
- [ADR-042: ADR `implements` Field — Mandatory Implementation Commit Reference](ADR-042-adr-implements-commit-reference-mandatory.md) — **Status:** Accepted — Every ADR must include the implementation commit hash in the `implements` YAML field; rule lives at user level in `~/.kmgraph/rules.md`; enforcement wired into create-adr-agent wizard (Phase 3).
- [ADR-041: Tier Abstraction Label System for Model Selection](ADR-041-tier-abstraction-label-system.md) — **Status:** Accepted — Three tier labels (fast-tier, standard-tier, powerful-tier) abstract platform-specific model names; alias map and validation gate implemented in v0.5.2-beta Phase 3.
- [ADR-040: Restructure Knowledge Templates into Subdirectory](ADR-040-knowledge-templates-subdirectory-structure.md) — **Status:** Accepted — Moves all template and example starter files into a structured `knowledge/templates/` subdirectory.
- [ADR-039: Profile Terminology for Behavioral Configuration](ADR-039-profile-terminology.md) — **Status:** Accepted — Adopts "profile" as the collective term for the three configuration files (me.md, rules.md, triggers.md) at each scope level.
- [ADR-038: Model Selection Rule for Knowledge Graph Tasks](ADR-038-model-selection-rule-for-kg-tasks.md) — **Status:** Accepted — Route Haiku for write/capture operations (ADRs, lessons, sessions); Sonnet for review; Opus for complex judgment.
- [ADR-037: Default Graph-Usage Rules Seeded at Deployment](ADR-037-default-rules-for-graph-deployment.md) — **Status:** Proposed — Seed default meta-rules (ADR vs. memory, rules.md references) at graph init time.
- [ADR-036: docs-impact-scan Skill — Pre-PR Docs Discovery Layer](ADR-036-docs-impact-scan.md) — **Status:** Accepted — Adds a `docs-impact-scan` skill as the discovery layer feeding the existing update-doc workflow, scanning all `.md` files in project root for pre-PR docs impact.
- [ADR-035: Stuck-Work Escalation — Auto-Trigger Meta-Issue with Opus Gate and Exit-Path Decision](ADR-035-stuck-work-escalation.md) — **Status:** Proposed — Introduces a stuck-work escalation pattern with two thresholds: an Opus gate at 3 distinct failed attempts or 30 minutes, and a mandatory exit-path decision.
- [ADR-034: Capture Level Routing — Dispatcher/Agent Split with Shared gov-capture-routing Skill](ADR-034-capture-level-routing-dispatcher-agent-split.md) — **Status:** Superseded by ADR-067 — the shared `gov-capture-routing` skill (unreachable for 3+ months, issue-18) is retired; dispatcher/agent split preserved, routing now direct via `kg_capture`/`kg_search`'s own `scope`/`targetKg` params.
- [ADR-033: triggers.md — Platform-Agnostic Rule Timing Companion File](ADR-033-triggersmd-platform-agnostic-rule-timing-companion-file.md) — **Status:** Accepted — Adds `triggers.md` as a standard companion to `rules.md` in both user and project KGs, mapping workflow phases to rule sections; user-level triggers always apply, project-level entries extend.
- [ADR-032: Platform-Specific Tool Directives Belong in knowledge/platform/<platform>.md](ADR-032-platform-specific-directives-in-platform-config.md) — **Status:** Superseded (v0.3.5-beta fixup) — Proposed `knowledge/platform/` as the canonical directory for per-platform tool directives; superseded by CLAUDE.md-as-platform-config for Claude Code (other platforms use native files); further amended in part by ADR-039 (platform files now project-level overrides only).
- [ADR-031: Use Plural `Lessons_Learned_` Prefix for Lesson Filenames](ADR-031-lessons-learned-plural-prefix-naming.md) — **Status:** Accepted — Retroactively documents the `Lessons_Learned_` naming convention established in v0.2.1-beta; plural form is semantically correct and enforced by `capture.ts`.
- [ADR-030: Migration Moves KMGraph-Named Subdirectories Only — Never the Entire docs/ Directory](ADR-030-migration-moves-named-subdirs-only-never-entire-docs.md) — **Status:** Accepted — Migration moves only KMGraph-named subdirs (`lessons-learned/`, `decisions/`, etc.) plus scaffold files; never the entire `docs/` directory.
- [ADR-029: Plan File Location in Knowledge Graph](ADR-029-plan-file-location-in-knowledge-graph.md) — **Status:** Accepted — Plans linked to an ENH go in `knowledge/ENH-NNN/vX-plan.md`; issue plans in `knowledge/issue-NNN/vX-plan.md`; misc bundled plans in `knowledge/plans/vX-plan.md`.
- [ADR-028: me.md + rules.md as Platform-Agnostic Source of Truth](ADR-028-me-and-rules-as-platform-agnostic-source-of-truth.md) — **Status:** Accepted — Scaffolds three platform-agnostic files (`knowledge/index.md`, `me.md`, `rules.md`) as part of the `knowledge/` directory, with `index.md` as the entry point linking each pillar to its purpose.
- [ADR-027: Docusaurus Docs Restructure — Diátaxis IA, docs-updates Feed, Branch Schema, and Landing Page Strategy](ADR-027-docusaurus-restructure-diataxis-docs-feed.md) — **Status:** Accepted — Seven interdependent decisions bundled together, including retaining Docusaurus over Mintlify, adopting a Diátaxis information architecture, and a `docs-updates/` feed for docs-only branches.
- [ADR-026: Snapshot Gate Invokes session-summary-agent, Not a Lightweight Temp Capture](ADR-026-snapshot-gate-uses-session-summary.md) — **Status:** Accepted — The Snapshot Gate in all capture commands invokes `session-summary-agent --snapshot` rather than a bespoke lightweight capture; user-facing prompt says "session summary" to match the canonical command name.
- [ADR-025: Do not commit `enabledPlugins` blocks in `.claude/settings.json`](ADR-025-do-not-commit-enabledplugins-blocks.md) — **Status:** Accepted — Committed `enabledPlugins` blocks create orphaned scope references for cloners; rely on `.claude-plugin/plugin.json` auto-detection instead.
- [ADR-024: Decouple Issue Tracking Decisions into Four Independent Sequential Prompts](ADR-024-decouple-issue-tracking-decisions-sequential-prompts.md) — **Status:** Accepted — Replaces the batched Step 1 with four independent sequential prompts (Type, Version Impact, Branch, Plan), each asked one at a time with enforcement gates at Steps 6.2 and 6.4.
- [ADR-023: Single Source of Truth for CHANGELOG](ADR-023-single-source-of-truth-changelog.md) — **Status:** Accepted — Establishes root `CHANGELOG.md` as the single authoritative source; MkDocs includes it directly in the docs build, replacing the hand-maintained `docs/CHANGELOG.md`.
- [ADR-022: Branch-Creation Commands Require an Active-Work Guard](ADR-022-branch-creation-commands-active-work-guard.md) — **Status:** Accepted — All commands that create Git branches must check the current branch first; if not on the default branch, the command presents an explicit choice before taking any branch action.
- [ADR-021: Single Source of Truth / DRY Documentation](ADR-021-single-source-of-truth-dry-documentation.md) — **Status:** Accepted — Each architectural concept has one authoritative source document; other documents reference it via an Authority Map rather than duplicating the explanation.
- [ADR-020: Lifecycle Hooks Suite for Automated Capture](ADR-020-lifecycle-hooks-suite-automated-capture.md) — **Status:** Accepted — Introduces a six-script lifecycle hook suite, each narrowly scoped to one moment (SessionStart, PreToolUse, etc.) and one behavior.
- [ADR-019: Write-Guard Enforced via Agent Instructions vs. Data Layer](ADR-019-write-guard-agent-instructions-vs-data-layer.md) — **Status:** Accepted (amended v0.5.10.8) — For v0.2.0-beta, the write guard is enforced via agent instructions: before any filesystem write, `lesson-capture-agent`/`session-summary-agent` must read `~/.claude/kg-config.json` and identify the active KG and its `projectRoot`.
- [ADR-018: AGENTS.md Template for Platform Portability](ADR-018-agents-template-platform-portability.md) — **Status:** Accepted — Creates `core/templates/AGENTS-template.md`, a plain-markdown behavioral spec any LLM can follow for KMGraph behaviors without platform-specific syntax, organized into four behavioral sections.
- [ADR-017: Four-Layer Architecture with Thin Commands](ADR-017-four-layer-architecture-thin-commands.md) — **Status:** Accepted — Introduces a four-layer architecture separating concerns across distinct file types, keeping slash commands thin and delegating logic to skills/agents/scripts.
- [ADR-016: Graceful Fallback for Optional MCP Dependencies](ADR-016-graceful-fallback-optional-mcp-dependencies.md) — **Status:** Accepted — Two complementary mechanisms: a package.json hash check in `hooks-master.sh` that triggers `npm install` on change, plus a try/require fallback pattern in TypeScript so the MCP server starts cleanly without the optional package.
- [ADR-015: node-sqlite3-wasm for FTS5 Search](ADR-015-node-sqlite3-wasm-for-fts5-search.md) — **Status:** Accepted — Uses `node-sqlite3-wasm` (^0.8.55) as the SQLite provider for FTS5 search in the kmgraph MCP server; WASM build ships FTS5/BM25 compiled in, no native toolchain required.
- [ADR-014: Maintain Dual Plan File Locations](ADR-014-maintain-dual-plan-file-locations.md) — **Status:** Accepted — `~/.claude/plans/` remains the automatic internal plan-mode storage; `docs/plans/` (later `knowledge/plans/`) becomes the mandatory project-level audit trail created immediately after plan-mode exit.
- [ADR-013: Documentation Update Protocol for Multi-Branch Releases](ADR-013-documentation-update-protocol.md) — **Status:** Accepted — Establishes a mandatory two-layer documentation update protocol for multi-branch releases (v0.0.11 onward): in-process updates per feature branch, plus a release-time consolidation layer.
- [ADR-012: Hook Security Model](ADR-012-hook-security-model.md) — **Status:** Accepted — Adopts a security model for all hook scripts restricting allowed operations to read-only file metadata (size, mtime, existence checks); no arbitrary file content reads or writes.
- [ADR-011: Defer Update Notifications and Version Sync to v0.0.9](ADR-011-defer-update-notifications.md) — **Status:** Accepted — Selects a two-phase approach: v0.0.9-alpha ships local-only version sync + `--version` flag + `kg_version` tool (no network calls), with a cached-check option added later.
- [ADR-010: Plugin Namespace Rename — knowledge → kg-sis](ADR-010-namespace-rename-knowledge-to-kg-sis.md) — **Status:** Accepted — Full namespace rename from `knowledge` to `kg-sis`; "kg" = knowledge-graph, chosen for domain clarity.
- [ADR-009: Three-Tier Installation Architecture](ADR-009-three-tier-installation-architecture.md) — **Status:** Accepted — Establishes three installation tiers with explicit trade-offs, led by Tier 1 (Claude Code & Codex CLI, full feature set).
- [ADR-008: Third-Person Language Standard for User-Facing Docs](ADR-008-third-person-language-standard.md) — **Status:** Accepted — All user-facing documentation uses third-person language only ("Users can execute...", "The system provides...").
- [ADR-007: Distribution Hygiene via package.json Files Allowlist](ADR-007-distribution-hygiene-files-allowlist.md) — **Status:** Accepted — Implements an explicit `package.json` files allowlist with three tiers (essential/optional/excluded) to control what ships in the distributed package.
- [ADR-006: Delegated vs Inline KG Update Architecture](ADR-006-delegated-vs-inline-kg-updates.md) — **Status:** Accepted — Implements a hybrid architecture: inline updates limited to simple single-file changes within the current KG, delegated (agent-routed) updates for everything else.
- [ADR-006 (duplicate, orphaned): Document Cache-Clear as Official Upgrade Path](ADR-006-document-cache-clear-upgrade-workaround.md) — **Status:** Accepted (superseded duplicate) — The original ADR-006-numbered file, pre-dating the 2026-06-15 collision renumbering. Its content is now [ADR-054](ADR-054-document-cache-clear-upgrade-workaround.md); per ADR-054's own note this file "remains on disk unlinked pending cleanup." Listed here only for index completeness, not as an independent decision.
- [ADR-005: Defer MEMORY.md Auto-Sync Rules Engine to v0.0.5](ADR-005-defer-memory-rules-engine.md) — **Status:** Accepted — Selects Option 3 (Restore Only): implements `/kg-sis:restore-memory` in v0.0.4-alpha, defers the rules engine and smart summarization to v0.0.5-alpha.
- [ADR-004: Token-Based MEMORY.md Size Limits](ADR-004-token-based-memory-size-limits.md) — **Status:** Accepted — Implements token-based size limits with soft and hard thresholds for MEMORY.md.
- [ADR-003: Abandon Shadow Commands; Use File Prefix](ADR-003-abandon-shadow-commands-for-file-prefix.md) — **Status:** Accepted — Phase 1 (v0.0.1–v0.0.2) uses file-prefix naming (`knowledge-init.md`, `knowledge-capture-lesson.md`) instead of shadow commands.
- [ADR-002: Commands vs Skills Architecture](ADR-002-commands-vs-skills-architecture.md) — **Status:** Accepted — Implements a dual architecture: commands (flat namespace) for direct task automation producing artifacts, skills for auto-invoked context providers.
- [ADR-001: Centralized Multi-KG Configuration](ADR-001-centralized-multi-kg-configuration.md) — **Status:** Accepted — Implements centralized configuration via a config JSON file tracking multiple knowledge graphs; default location later updated to `~/.kmgraph/kg-config.json` (2026-07-11) for platform-neutral access.

---

## By Category

### Architecture
- [ADR-064: Shared Module Pattern for Slash Command Deduplication](ADR-064-shared-module-pattern-for-slash-command-deduplication.md) — Parameterized shared modules under `commands/kmg-init-shared/` replace duplicated instruction blocks across init commands; explicit parameter contract tables enforce interfaces
- [ADR-057: Detection layer requires unified design, not piecemeal growth](ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md) — 5 capture-trigger skills grew accreted/undesigned; consolidate detection/classification into one shared skill, keep drafting agents separate; consolidation ENH ready to spec (deferral reasoning corrected 2026-07-03)
- [ADR-056: Reject plugin-split for contributor-only doc commands](ADR-056-reject-plugin-split-for-contributor-only-doc-commands.md) — Keep single-plugin architecture; fix imposed-house-style bug via repo-context auto-detection (ENH-033) + labeling instead of a `kmgraph-contrib` split
- [ADR-046](ADR-046-concept-setup-hybrid-page-type-and-how-to-guide-pattern.md) — Introduce concept+setup hybrid page type and document how-to guide pattern separately from narrative guides
- [ADR-045](ADR-045-update-profile-skill-not-command.md) — Implement Profile Update Functionality as a Skill, Not a Command
- [ADR-044](ADR-044-split-oversized-chat-history-files.md) — Split Oversized Daily Chat History Files for Obsidian Compatibility
- [ADR-034: Capture Level Routing — Dispatcher/Agent Split](ADR-034-capture-level-routing-dispatcher-agent-split.md) — Superseded by ADR-067; gov-capture-routing retired (issue-18), user-level bypass of kg_capture also closed (was a live security gap)
- [ADR-031: Use Plural `Lessons_Learned_` Prefix for Lesson Filenames](ADR-031-lessons-learned-plural-prefix-naming.md) — Plural form is semantically correct; hardcoded in `capture.ts`; changing it would require migration of 33 files
- [ADR-030: Migration Moves KMGraph-Named Subdirectories Only](ADR-030-migration-moves-named-subdirs-only-never-entire-docs.md) — Named subdir list prevents collision with docs sites; explicit scope over blanket directory moves

### Process
- [ADR-058: Command/skill naming and scope decisions require an upfront check](ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings.md) — Five naming/scope findings share one process gap (not one technical bug); establish a three-question upfront check (audience / collision / accuracy) in CONTRIBUTING + ADR-guide; governance layer above ADR-056/ADR-057; governs ENH-033/034/035/036; target v0.7.0
- [ADR-043: PreToolUse Hook Injection for Superpowers Rule Enforcement](ADR-043-pretooluse-hook-injection-superpowers-rule-enforcement.md) — PreToolUse hook injects rules.md before brainstorming/writing-plans; two-scope (plugin + user-wide). Renumbered from ADR-041.
- [ADR-042: ADR `implements` Field — Mandatory Implementation Commit Reference](ADR-042-adr-implements-commit-reference-mandatory.md) — Mandatory `implements` YAML field for all ADRs; design-first and ad hoc workflows defined; rule at user level
- [ADR-041: Tier Abstraction Label System for Model Selection](ADR-041-tier-abstraction-label-system.md) — Three tier labels abstract model names; alias map (S4) and validation gate (S5) implemented in v0.5.2-beta
- [ADR-038: Model Selection Rule for Knowledge Graph Tasks](ADR-038-model-selection-rule-for-kg-tasks.md) — Route Haiku for write/capture; Sonnet for review; Opus for judgment
- [ADR-037: Default Graph-Usage Rules Seeded at Deployment](ADR-037-default-rules-for-graph-deployment.md) — Seed meta-rules at init time
- [ADR-029: Plan File Location in Knowledge Graph](ADR-029-plan-file-location-in-knowledge-graph.md) — Three-location plan structure: ENH folder, issue folder, or knowledge/plans/ fallback
- [ADR-025: Do not commit `enabledPlugins` blocks](ADR-025-do-not-commit-enabledplugins-blocks.md) — Plugin settings scope hygiene for committed repos

### Technology Choices
- [ADR-XXX](ADR-XXX-title.md) — [Topic]

---

## ADR Statuses

- **Proposed:** Decision under consideration
- **Accepted:** Decision approved and implemented
- **Deprecated:** No longer relevant or superseded
- **Superseded:** Replaced by a newer ADR

---

## Field Guide

The ADR template uses manual markdown fields (no auto-fill commands yet):

**Header Fields (all manual):**
- `ADR-XXX` - Sequential number (e.g., ADR-001, ADR-002)
- `Title` - Concise decision description
- `Date` - Date decision was made (format: 2024-01-15)
- `Status` - Current status (Proposed | Accepted | Deprecated | Superseded)
- `Implements` - Optional: Version or feature this applies to
- `Related` - Optional: Links to related ADRs, lessons, KG entries

**Content Sections:**
All sections are manually filled:
- **Context** - Why this decision is needed
- **Decision** - What was decided (clear, concise statement)
- **Rationale** - Why this choice over alternatives
- **Consequences** - Positive and negative impacts
- **Related** - Links to implementation, lessons, KG entries

**Troubleshooting:**
- ADRs are created manually — no auto-fill commands yet
- Replace all `[bracketed placeholders]` with your content
- For sequential numbering, check the highest existing ADR number and add 1

**Examples:**
See [core/examples/decisions/](../../examples/decisions/) for filled-out ADR examples.

---

## Creating a New ADR

1. **Determine next number:** Find the highest existing ADR number and increment
2. **Copy template:** Use [ADR-template.md](../templates/ADR-template.md)
3. **Fill all sections:** Context, Decision, Rationale, Consequences
4. **Link to evidence:** Reference lessons learned, KG entries, implementation
5. **Update this index:** Add entry above

---

## Integration

- **Knowledge Graph:** Architecture ADRs link to architecture.md entries
- **Lessons Learned:** Decisions often emerge from lessons
- **Meta-Issues:** Complex decisions may reference meta-issue investigations

---

## Format

ADRs follow a lightweight format:
- Sequential numbering (001, 002, ...)
- Descriptive filename with slug
- Standard sections: Context, Decision, Rationale, Consequences, Related
- Status tracking (Proposed → Accepted → Deprecated/Superseded)

---

## Learn More

**Concepts & Guides**:
- [Concepts Guide](../../../docs/CONCEPTS.md#adr-architecture-decision-record) - Term explanations
- [ADR template](../templates/ADR-template.md) - Starting scaffold

**Resources**:
- [Real Examples](../../examples/decisions/) - Filled-out ADRs
- [Pattern Guide](../../docs/PATTERNS-GUIDE.md) - Writing quality tips
- [triggers.md — Platform-Agnostic Rule Timing Companion File](ADR-033-triggersmd-platform-agnostic-rule-timing-companion-file.md)
- [ADR-046: Introduce concept+setup hybrid page type and document how-to guide pattern separately from narrative guides](ADR-046-concept-setup-hybrid-page-type-and-how-to-guide-pattern.md)
