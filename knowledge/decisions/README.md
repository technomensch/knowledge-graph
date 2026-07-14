# Architecture Decision Records (ADRs)

**Navigation**: [Home](../../../README.md) > [Getting Started](../../../docs/GETTING-STARTED.md) > [Manual Workflows](../../docs/WORKFLOWS.md) > Templates

Formal documentation of significant architecture decisions.

**Total ADRs:** 60
**Last Updated:** 2026-07-12

---

## Active ADRs

[ADRs with Status: Accepted]

---

## All ADRs (Chronological)

- [ADR-064: Shared Module Pattern for Slash Command Deduplication](ADR-064-shared-module-pattern-for-slash-command-deduplication.md) — **Status:** Accepted — Duplicated init command logic extracted into five parameterized shared modules under `commands/kmg-init-shared/`; parent commands invoke modules by name with explicit parameter contracts. (Restored 2026-07-12 from archive — original was overwritten by ADR numbering collision on 2026-04-10.)
- [ADR-063: Never destroy known-good state before the replacement is confirmed written](ADR-063-never-destroy-known-good-state-before-confirmed-write.md) — **Status:** Accepted — two unrelated subsystems (chat-extraction's `--rebuild` path, and the separate `kg-config-silent-overwrite` bash-hook incident) independently hit the identical anti-pattern on the same day: destroying existing state (`shutil.rmtree`, `cp`/`rm -f` over a real config file) before a replacement was confirmed written, protected only by best-effort cleanup that a non-graceful interruption could bypass. Decision: never destroy old state until the new state exists and is confirmed complete — atomic write (temp file + rename/replace) plus rename-aside (not delete) for anything that must eventually be cleared. Implemented on `v0.6.18-fix-extraction-regressions` (chat-extraction side) and the merged sibling `v0.6.19-fix-kg-config-silent-overwrite` work (kg-config side).
- [ADR-062: Gemini .pb/hash-named directory project scoping fails closed, not open](ADR-062-gemini-pb-project-scoping-fail-closed.md) — **Status:** Accepted — real-data testing found ENH-044's `.json`/`.jsonl` `--project` fix (v0.6.17) didn't close the whole contamination vector: `.pb` files carry no per-project path signal, so 93 real `.pb` files and 9 hash-named directories were still unscoped (masked on this machine only by an absent optional dependency). Decision: fail closed — exclude anything unattributable to the requested project, with a visible skip notice, rather than risk leaking a foreign project's private conversation into this project's committed, searchable knowledge graph. A future payload-decoded project signal could recover excluded content later, explicitly deferred. Implemented under umbrella [ENH-038](../enhancements/ENH-038/ENH-038-specification.md) / [ENH-044](../issues/chat-extraction-reliability-saga/attempts/ENH-044/specification.md). **Amended 2026-07-11:** a post-merge review found the implementation didn't fully achieve this decision — check ordering let a hex `--project` filter fail open on a hash-named directory; closed (policy unchanged, ordering fixed).
- [ADR-061: First-run repair notice must be platform-specific, not one unified mechanism](ADR-061-first-run-repair-notice-platform-specific-not-unified.md) — **Status:** Accepted — v0.6.17's `--rebuild` feature (ENH-043) needed a way to tell users their chat-history might be affected. A first design pass proposed one uniform notice for Claude/Gemini/Codex; rejected after finding the three platforms have genuinely different failure modes (data loss vs. contamination vs. staleness). Decision: platform-specific notices with different remedies — Claude gets a layered notice + concrete backup-recovery guidance + new `--claude-projects-dir`/`--source-root` flags; Gemini gets a corrective `--project`-scoping note; Codex is out of scope, filed separately as [ENH-045](../issues/chat-extraction-reliability-saga/attempts/ENH-045/specification.md) (now tracked under umbrella [ENH-038](../enhancements/ENH-038/ENH-038-specification.md)).
- [ADR-060: Narrow kg_search scope away from raw chat-history — let context-mode own session recall](ADR-060-narrow-kg-search-scope-away-from-raw-chat-history.md) — **Status:** Proposed — Re-evaluated context-mode (v1.0.169) against kmgraph now that context-mode ships full session-continuity + RRF/proximity/fuzzy-ranked search. Decision: stop indexing raw `chat-history/*.md` in `kg_search`/`kg_fts5_rebuild` — context-mode owns ephemeral session/decision recall, kmgraph owns durable curated artifacts (ADRs/lessons/enhancements) only. Does not change ADR-001's multi-KG active-pointer model. Implemented by [ENH-040](../enhancements/ENH-040/ENH-040-specification.md).
- [ADR-059: Plans must not hardcode derivable counts — derive at run time](ADR-059-no-hardcoded-derivable-counts-in-plans.md) — **Status:** Accepted — Caught live in the v0.6.16 plan: `knowledge/enhancements/` count drifted 36→37→38 within one planning session as ENH-037 and ENH-038 were both created mid-session. Decision: plans must never hardcode a computed file/folder/entry count as a fixed expectation — phrase it as "derived at run time from `<command>`" instead. Rule-only change to `~/.kmgraph/plan-authoring-rules.md`; motivated by this user's actual multi-platform concurrent-session operating mode (Claude/Codex/Gemini on the same repo), not a hypothetical.
- [ADR-058: Command/skill naming and scope decisions require an upfront check, not ad-hoc creation](ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings.md) — **Status:** Accepted — A design session found 5 naming/scope confusions. A second opinion confirmed they are different failure modes (doc drift, scope leakage, architectural accretion, a missing feature) sharing one process gap: no upfront naming/scope check for new commands/skills/docstrings. Decision: establish a three-question check (audience / collision / accuracy) in CONTRIBUTING + the ADR-guide surface. Cites ADR-056 and ADR-057 as evidence (does not re-decide them); governs child [ENH-033](../enhancements/ENH-033/ENH-033-specification.md)/[034](../enhancements/ENH-034/ENH-034-specification.md)/[035](../enhancements/ENH-035/ENH-035-specification.md)/[036](../enhancements/ENH-036/ENH-036-specification.md) (all ready now). Target v0.7.0.
- [ADR-057: Detection layer requires unified design, not piecemeal growth](ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md) — **Status:** Accepted — 5 independent capture-trigger skills (lesson-capture, adr-guide, rules-capture, update-profile, capture-router) traced to accreted, undesigned growth. Decision: consolidate detection/classification into one shared skill; keep drafting agents separate. Originally deferred pending the parent auto-capture pipeline design — 2026-07-03 amendment found no real dependency; consolidation ENH is ready to spec now.
- [ADR-056: Reject plugin-split for contributor-only doc commands; fix via repo-context auto-detection](ADR-056-reject-plugin-split-for-contributor-only-doc-commands.md) — **Status:** Accepted — Rejects a `kmgraph-contrib` plugin (and marker-file / subdirectory options) for `kmg-update-doc`/`kmg-create-doc`; the real defect is imposed house style, not packaging. Resolves ADR-027's deferred item via behavioral auto-detection ([ENH-033](../enhancements/ENH-033/ENH-033-specification.md)) plus severity-dot labeling.
- [ADR-051: Session Summary / Handoff Asymmetric Coupling via continues_from](ADR-051-session-summary-handoff-asymmetric-coupling.md) — **Status:** Accepted — Adds optional `continues_from` frontmatter field to handoff documents; when set, the "what was completed" section collapses to a one-liner pointing at the session summary. Asymmetric one-way coupling: handoff → summary only.
- [ADR-050: Pre-Push Composite Gate + Inline Recommendation Gate](ADR-050-pre-push-composite-gate-inline-recommendation-gate.md) — **Status:** Accepted — Wires pre-push version-sync (Gate 2) and docs-impact-scan completion flag (Gate 3) as advisory PreToolUse Bash hooks; wires UserPromptSubmit hook for inline recommendation recall/ADR-precheck/cascade gate with per-session PID debounce.
- [ADR-046: Introduce concept+setup hybrid page type and document how-to guide pattern separately from narrative guides](ADR-046-concept-setup-hybrid-page-type-and-how-to-guide-pattern.md) — **Status:** Accepted — Adds style guide section 4g for Goal/Prerequisites/Steps/Verify how-to pattern; retains 4a for narrative guides; names concept+setup hybrid as a distinct third type.
- [ADR-045: Implement Profile Update Functionality as a Skill, Not a Command](ADR-045-update-profile-skill-not-command.md) — **Status:** Accepted — Skill over command: zero doc-update cost, natural language activation; platform-agnostic command deferred to future roadmap when non-CC usage grows.
- [ADR-044: Split Oversized Daily Chat History Files for Obsidian Compatibility](ADR-044-split-oversized-chat-history-files.md) — **Status:** Accepted — When a daily chat history file exceeds 900 KB or 30,000 lines, split into numbered parts in a YYYY-MM-DD/ subfolder; get_output_path reroutes transparently.
- [ADR-043: PreToolUse Hook Injection to Enforce User Rules During Superpowers Skill Execution](ADR-043-pretooluse-hook-injection-superpowers-rule-enforcement.md) — **Status:** Accepted — PreToolUse hook injects ~/.kmgraph/rules.md before brainstorming/writing-plans skills execute, ensuring file-location and execution-mode rules override skill defaults. (Renumbered from ADR-041 — cross-branch collision.)
- [ADR-042: ADR `implements` Field — Mandatory Implementation Commit Reference](ADR-042-adr-implements-commit-reference-mandatory.md) — **Status:** Accepted — Every ADR must include the implementation commit hash in the `implements` YAML field; rule lives at user level in `~/.kmgraph/rules.md`; enforcement wired into create-adr-agent wizard (Phase 3).
- [ADR-041: Tier Abstraction Label System for Model Selection](ADR-041-tier-abstraction-label-system.md) — **Status:** Accepted — Three tier labels (fast-tier, standard-tier, powerful-tier) abstract platform-specific model names; alias map and validation gate implemented in v0.5.2-beta Phase 3.
- [ADR-038: Model Selection Rule for Knowledge Graph Tasks](ADR-038-model-selection-rule-for-kg-tasks.md) — **Status:** Accepted — Route Haiku for write/capture operations (ADRs, lessons, sessions); Sonnet for review; Opus for complex judgment.
- [ADR-037: Default Graph-Usage Rules Seeded at Deployment](ADR-037-default-rules-for-graph-deployment.md) — **Status:** Proposed — Seed default meta-rules (ADR vs. memory, rules.md references) at graph init time.
- [ADR-034: Capture Level Routing — Dispatcher/Agent Split with Shared gov-capture-routing Skill](ADR-034-capture-level-routing-dispatcher-agent-split.md) — **Status:** Accepted — Dispatchers resolve NL to explicit flags; agents handle flags only; gov-capture-routing skill is the single source of truth for all routing logic.
- [ADR-031: Use Plural `Lessons_Learned_` Prefix for Lesson Filenames](ADR-031-lessons-learned-plural-prefix-naming.md) — **Status:** Accepted — Retroactively documents the `Lessons_Learned_` naming convention established in v0.2.1-beta; plural form is semantically correct and enforced by `capture.ts`.
- [ADR-030: Migration Moves KMGraph-Named Subdirectories Only — Never the Entire docs/ Directory](ADR-030-migration-moves-named-subdirs-only-never-entire-docs.md) — **Status:** Accepted — Migration moves only KMGraph-named subdirs (`lessons-learned/`, `decisions/`, etc.) plus scaffold files; never the entire `docs/` directory.
- [ADR-029: Plan File Location in Knowledge Graph](ADR-029-plan-file-location-in-knowledge-graph.md) — **Status:** Accepted — Plans linked to an ENH go in `knowledge/ENH-NNN/vX-plan.md`; issue plans in `knowledge/issue-NNN/vX-plan.md`; misc bundled plans in `knowledge/plans/vX-plan.md`.
- [ADR-025: Do not commit `enabledPlugins` blocks in `.claude/settings.json`](ADR-025-do-not-commit-enabledplugins-blocks.md) — **Status:** Accepted — Committed `enabledPlugins` blocks create orphaned scope references for cloners; rely on `.claude-plugin/plugin.json` auto-detection instead.

---

## By Category

### Architecture
- [ADR-064: Shared Module Pattern for Slash Command Deduplication](ADR-064-shared-module-pattern-for-slash-command-deduplication.md) — Parameterized shared modules under `commands/kmg-init-shared/` replace duplicated instruction blocks across init commands; explicit parameter contract tables enforce interfaces
- [ADR-057: Detection layer requires unified design, not piecemeal growth](ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md) — 5 capture-trigger skills grew accreted/undesigned; consolidate detection/classification into one shared skill, keep drafting agents separate; consolidation ENH ready to spec (deferral reasoning corrected 2026-07-03)
- [ADR-056: Reject plugin-split for contributor-only doc commands](ADR-056-reject-plugin-split-for-contributor-only-doc-commands.md) — Keep single-plugin architecture; fix imposed-house-style bug via repo-context auto-detection (ENH-033) + labeling instead of a `kmgraph-contrib` split
- [ADR-046](ADR-046-concept-setup-hybrid-page-type-and-how-to-guide-pattern.md) — Introduce concept+setup hybrid page type and document how-to guide pattern separately from narrative guides
- [ADR-045](ADR-045-update-profile-skill-not-command.md) — Implement Profile Update Functionality as a Skill, Not a Command
- [ADR-044](ADR-044-split-oversized-chat-history-files.md) — Split Oversized Daily Chat History Files for Obsidian Compatibility
- [ADR-034: Capture Level Routing — Dispatcher/Agent Split](ADR-034-capture-level-routing-dispatcher-agent-split.md) — Dispatchers resolve NL → flags; agents handle flags only; gov-capture-routing is single source of truth; user-level bypasses kg_capture
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
2. **Copy template:** Use [ADR-template.md](ADR-template.md)
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
- [ADR template](ADR-template.md) - Starting scaffold

**Resources**:
- [Real Examples](../../examples/decisions/) - Filled-out ADRs
- [Pattern Guide](../../docs/PATTERNS-GUIDE.md) - Writing quality tips
- [triggers.md — Platform-Agnostic Rule Timing Companion File](ADR-033-triggersmd-platform-agnostic-rule-timing-companion-file.md)
- [ADR-046: Introduce concept+setup hybrid page type and document how-to guide pattern separately from narrative guides](ADR-046-adr-046-introduce-conceptsetup-hybrid-page-type-and-document-how-to-guide-pattern-separately-from-narrative-guides.md)
