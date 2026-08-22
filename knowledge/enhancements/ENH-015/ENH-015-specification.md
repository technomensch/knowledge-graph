---
title: "ENH-015: Decision Governance Protocol"
number: 015
status: implemented
version_target: "v0.5.9"
github_issue: null
created: 2026-05-25
related_adrs: ["ADR-043", "ADR-049"]
related_enhs: ["ENH-016", "ENH-020"]
---

# ENH-015: Decision Governance Protocol

## Problem

`superpowers:brainstorming` and ad-hoc recommendation requests analyze the current codebase state only. They have no mechanism to consult the knowledge graph before making recommendations. This causes:

- Recommendations that contradict established ADRs
- Solutions already tried and documented as failures being re-proposed
- Design rationale behind existing patterns being ignored
- Cascading impacts on existing decisions being missed
- Docs page changes scattered across plan tasks instead of grouped

## Two-Pass Opus Review

Two Opus audit passes confirmed the architecture. Key finding from second pass: "cascading" has two distinct scopes that require different enforcement mechanisms.

## Four Rules

### Rule 1 — Recall before recommending
Before making any recommendation, run `/kmgraph:recall [topic]` to surface prior decisions, failed approaches, and design rationale. Present results under "Prior Art" heading.

### Rule 2 — ADR governance after decision
After a decision crystallizes: check if an existing ADR needs updating OR if a new ADR is needed. If new: determine whether it supersedes an existing ADR (present matches from recall) or is net-new.

### Rule 3 — Cascade impact (two scopes)
**Project-wide cascade:** Does this decision affect other ADRs, skills, commands, docs, hooks, or tests that already exist? Recall + grep; list each with action required.
**In-plan cascade:** Does this decision affect tasks already in the current active plan? Prompt plan-consistency review before execution begins.

### Rule 4 — Docs changes grouped
If any Docusaurus pages need updating, all changes must be accumulated in a single "Docs Updates (Grouped)" plan section — not scattered across task steps. All edits must follow the existing page style guide.

## Architecture (Opus-reviewed)

### Why not one skill

The four rules fire at three different lifecycle points:
- Rule 1: brainstorm-start (before recommendation)
- Rules 2-3a: brainstorm-end / decision-capture (after decision crystallizes)
- Rule 3b: execution-start (after plan is written, before execution)
- Rule 4: plan-write time

A single skill covering three lifecycle phases produces vague trigger conditions and unreliable auto-invocation.

### Deliverables

#### Deliverable 1: New skill `brainstorm-recall`
- **File:** `skills/brainstorm-recall/SKILL.md`
- **Triggers:** "should we", "I'm thinking of", "best way to", "which approach", "let's consider"; also when `superpowers:brainstorming` is invoked
- **Behavior (inline — blocking):** dispatch `/kmgraph:recall [topic]` → include results under "Prior Art" → then proceed with recommendation
- **Behavior (background — non-blocking):** when a decision or enhancement is identified during brainstorm, fire background fast-agents to draft ADR and/or ENH spec; brainstorm flow continues uninterrupted
- **Review-or-save prompt:** when background agents complete, ask: "Review before saving, or save now? Files at `knowledge/decisions/ADR-NNN.md` and `knowledge/enhancements/ENH-NNN/`"
  - "Save now" → files already written by agent; user reviews outside session at listed paths
  - "Review first" → surface content inline for approve/edit/skip per item
- **Action item capture:** Opus feedback and unresolved action items from brainstorm → written to relevant ADR/ENH "Open Questions" section (single write path — never written directly to session summary)
- **Precedence:** must fire before `adr-guide` at the same trigger surface
- **Reinforcement:** HARD BLOCK addition to `scripts/pre-skill-rules-inject.sh` for `superpowers:brainstorming` branch (separate case branch from planning — brainstorming must NOT inherit plan-routing or execution-handoff hard blocks)

#### Deliverable 2: Extend `adr-guide`
- **File:** `skills/adr-guide/SKILL.md`
- **New Step 4a:** Project-wide cascade — recall + grep for ADRs, skills, commands, docs referencing affected concept; list with action required
- **New Step 4b:** In-plan cascade advisory — if active plan exists, flag it for cascade review before execution
- **New supersede check:** recall on decision topic → present ADR matches → prompt supersedes/net-new
- **ADR template addition:** all ADRs must include an "Open Questions" section as a required template field (populated by brainstorm-recall action item capture; empty by default)

#### Deliverable 3: Extend `gov-execute-plan`
- **File:** `skills/gov-execute-plan/SKILL.md`
- **New prerequisite gate:** conditional on "was a new ADR captured or updated this session?" → if yes, prompt in-plan cascade review before proceeding
- **Pattern:** mirrors existing Step 6.4 sync-verification prerequisite

#### Deliverable 4: Plan template "Docs Updates (Grouped)" section
- **Files:**
  - `~/.claude/plans/` template (user-local, immediate effect)
  - `core/templates/plans/plan-template.md` (shipped to marketplace users — protected file, explicit permission required and granted in v0.5.9)
- **Change:** add required "Docs Updates (Grouped)" section that accumulates all Docusaurus page modifications

#### Deliverable 5: `knowledge/rules.md` one-liner
- **File:** `knowledge/rules.md`
- **Change:** under "User-Facing Docs Updates" subsection, add: "Group all Docusaurus page changes into a single plan section; follow existing page style guide before editing."

#### Deliverable 6: Tests
- **File:** `tests/test-decision-governance.sh`
- **Coverage:** brainstorm-recall trigger keywords present, adr-guide supersede/cascade steps present, gov-execute-plan cascade gate present

#### Deliverable 7: Extend `session-wrap` skill
- **File:** `skills/session-wrap/SKILL.md`
- **Behavior:** at session summary time, scan all ADRs and ENHs created or modified this session; extract their "Open Questions" sections; emit deduplicated "Open Items" list in the session summary
- **Deduplication enforcement:** session summary only reads from ADR/ENH files — no direct writes to the "Open Items" section permitted; structural single-source guarantees dedup

## Amendment Deliverables (v0.5.9 Expansion)

Identified during Opus planning review. All ship with v0.5.9.

### Task A — Planning branch HARD BLOCK injection (pre-skill-rules-inject.sh)
Add to the planning branch of `scripts/pre-skill-rules-inject.sh`:
- `RECALL_HARD_BLOCK` var: two-query pattern (topic + architectural domain), state-check before writing, compliance-failure clause ("RECALL BLOCKED — [reason]"), recall-miss instrumentation
- `ACTIVE_KG_HARD_BLOCK` var: recency scan, 14-day window
- Plan-file embedding block: embeds active plan sections (File Location, Parallelism, Approval Gates)
Constraint: RECALL_HARD_BLOCK must appear FIRST in planning output (before OVERRIDE_BLOCK).

### Task B — Recall in Plan Mode rule (plan-rules.md)
Add "Recall in Plan Mode" section to `~/.kmgraph/plan-rules.md` with two-query requirement and priority enforcement: "Recall results take priority over model's own architectural memory."

### Task B2 — Template seeding (core/templates)
Propagate "Recall in Plan Mode" rule to `core/templates/knowledge/templates/project/rules.md` and `core/templates/knowledge/templates/user/rules.md` so new users get it on `kmgraph:init`.

### Task C — Gemini parity
Verify or add recall directive to `~/.gemini/GEMINI.md` (outside repo, not committed).

### Task D — Tests 18–19
Add two tests to `tests/test-decision-governance.sh`:
- Test 18: planning branch injects RECALL_HARD_BLOCK
- Test 19: plan-rules.md contains "Recall in Plan Mode" section
Total test count: 19.

### Task E — kg-recall SKILL.md fix
Fix dispatch description; add priority enforcement, planning-context note, UQ-8 degradation path (MCP down → surface cached results with staleness warning).

### Task F — plan-rules.md section extraction
Add extraction of plan-rules.md sections (File Location, Parallelism, Approval Gates) into planning branch output. Separate from Task A for clarity.

### Task G — Rules Registry
Create `core/rules-registry/` directory with:
- `recall-in-planning.md`: canonical rule text for the recall requirement
- `README.md`: one-line "authoritative rule text lives here; deployment surfaces copy from this directory"
All deployment surfaces (plan-rules.md, template rules.md, GEMINI.md) copy from this registry.

### Task H — RECALL_HARD_BLOCK state check
RECALL_HARD_BLOCK includes: "Before writing any rule, read the current file and check if a recall rule already exists — do not duplicate."

### Task I — Active KG Context block
Planning branch injects recent knowledge graph entries (14-day window) as context before plan is written.

### Task J — Recall miss instrumentation
If recall returns no results for any query: STOP, output user prompt (expand vocabulary and retry vs. proceed explicitly), log to `/tmp/kmgraph-recall-miss-$(date +%Y-%m-%d).log`. Silent nothing-found-then-proceed is prohibited.

### Task K — Expand planning injection (Gap 3 fix)
After Wave 6 (Task A+F+H+I+J) completes: extend `pre-skill-rules-inject.sh` to also extract and inject Ad-Hoc Updates, Plugin Cache, and Capture Checkpoints sections from `~/.kmgraph/plan-rules.md` into the planning branch output.

### Task L — writing-plans recall block (Gap 1 + Bonus fix)
Add Plan Recall HARD BLOCK to `superpowers:writing-plans` skill output via hook injection in `pre-skill-rules-inject.sh`. The planning branch must classify `superpowers:writing-plans` and inject the recall block BEFORE the Execution Handoff Override block fires.

### Task M — PostToolUse:Write plan gate (Gap 2 partial fix)
Add PostToolUse:Write hook to `hooks/hooks.json` that fires on plan file writes (`*plans/*.md`) and outputs Post-Plan Validation Checklist as an advisory reminder (not a hard blocker — PostToolUse cannot block tool calls).

### Tasks session-wrap and adr-template
- `skills/session-wrap/SKILL.md`: extended to scan session ADRs/ENHs, extract "Open Questions" sections, emit deduplicated "Open Items" in summary. Single write path: no direct writes to session summary.
- `core/templates/decisions/ADR-template.md`: extended with `search_aliases` frontmatter field and `## Open Questions` required section.

## Known Gaps and Future Scope

### Gap 1 — Conversational enforcement (closed by Task L)
Hook fires on Skill tool invocations only. `superpowers:writing-plans` invocations get the recall HARD BLOCK via Task L. **Remaining limitation:** pure conversational responses ("what's the best approach?") where no skill is invoked at all receive no enforcement — this is an architecture-level constraint of the PreToolUse hook model. Not addressed in v0.5.9 or v0.6.0; acceptable limitation.

### Gap 2 — Post-Plan Validation Checklist (partial fix in v0.5.9; hard gate future scope)
v0.5.9 adds Task M: PostToolUse:Write hook that fires after plan files are written and outputs the Post-Plan Validation Checklist as an advisory reminder. This is model self-enforcement, not a hard gate.

**Tracked bug:** [[issue-6]] — GitHub #125 (v0.5.9.2): plan-rules.md falsely described the hook as a blocking gate; corrected to advisory. Layer 3 (kmg-execute-plan pre-flight gate) deferred to v0.7.0.

**Future scope (v0.7.0 candidate):** A PreToolUse:Write hook could provide a true hard gate with the following pattern to avoid blocking mid-draft saves:
- Only block if the plan file **already exists** (not a first write)
- AND the previous version already had a `## Post-Plan Validation Checklist` section
- AND the incoming content has any `❌` items in that section
This would block "finalization writes that regress the checklist" without disrupting incremental saves.

### Gap 3 — Partial injection (fixed in v0.5.9 by Task K)
Pre-v0.5.9: only File Location, Parallelism, Approval Gates, RECALL_HARD_BLOCK, ACTIVE_KG_HARD_BLOCK were injected. Ad-Hoc Updates, Plugin Cache, Capture Checkpoints from `plan-rules.md` were not injected. Task K closes this.

### Dispatch Branch Bug (fixed in v0.5.9 by Task 6b)
`subagent-driven-development` maps to `SKILL_TYPE="execution"` in the case statement. A separate `dispatch` branch is unreachable. The ADR cascade gate (dispatch block) must live INSIDE the `execution` branch.

## Platform Delivery Matrix

| Rule | Claude Code (hook) | plan-rules.md | Gemini | Copilot/Codex |
|------|--------------------|---------------|--------|---------------|
| Recall before planning | ✅ HARD BLOCK injected | ✅ documented | ✅ Task C | NOT DELIVERED (v0.7.0) |
| Two-query pattern | ✅ HARD BLOCK | ✅ documented | ✅ | NOT DELIVERED |
| Recall miss instrumentation | ✅ hook log | ✅ documented | ⚠️ advisory only | NOT DELIVERED |
| Post-Plan Checklist gate | ⚠️ advisory (PostToolUse) | ✅ documented | ⚠️ advisory only | NOT DELIVERED |
| Ad-hoc updates injection | ✅ Task K | ✅ documented | NOT DELIVERED | NOT DELIVERED |
| Plugin cache rule injection | ✅ Task K | ✅ documented | NOT DELIVERED | NOT DELIVERED |
| Capture Checkpoints injection | ✅ Task K | ✅ documented | NOT DELIVERED | NOT DELIVERED |

## Cascade Scope Table

| Check | Scope | Owner | When |
|---|---|---|---|
| Project-wide cascade | ADRs, skills, commands, docs, hooks, tests | adr-guide Step 4a | Decision-capture time |
| In-plan cascade | Active plan tasks | gov-execute-plan prerequisite gate | Execution-start time |

## Existing Skill Conflicts Resolved

- **brainstorm-recall vs adr-guide:** Both fire on prospective-recommendation keywords. Resolved by explicit precedence declaration: brainstorm-recall fires first.
- **docs-impact-scan:** Fires at pre-push (different phase). Rule 4 fires at plan-write. No conflict — complementary.
- **kg-recall:** Triggers on retrospective questions ("have we", "did we"). Rule 1 triggers on prospective ("should we"). Complementary, no conflict.
- **gov-execute-plan zero-deviation constraint:** In-plan cascade check fires as a prerequisite gate BEFORE execution begins — not during. Does not conflict with zero-deviation enforcement.

## Related ENHs / Known Gaps

### ENH-020 — Preventive Cascade Template + Profile Ecosystem Docs

**Status:** Deferred

The cascade rules in ENH-015 fire _post-decision_ (after the user confirms "proceed"), not _pre-implementation_. ENH-020 closes this gap by adding a preventive cascade evaluation step that fires before implementation begins.

**What ENH-020 adds:**
- Pre-implementation scope classification prompt
- Profile file ecosystem reference document
- Initialization impact matrix

Until ENH-020 is implemented, the review-audit-protocol rule (`core/rules-registry/review-audit-protocol.md`) includes a cascade check stub that defers to ENH-015 and ENH-020.

See: `knowledge/enhancements/ENH-020/ENH-020-specification.md`

## Not In Scope

- Modifying `superpowers:writing-plans` or `superpowers:brainstorming` skill files directly — these are third-party; all enforcement is via the hook layer (`pre-skill-rules-inject.sh`)
- Replacing `superpowers:brainstorming` — brainstorm-recall works alongside it
- Multi-platform skill name collision risk: **addressed in v0.6.0** via `kmg-` prefix normalization (all skill/command names prefixed — bare-name collision eliminated).
- Pure conversational planning enforcement: when a model answers a planning question WITHOUT invoking any skill at all, no hook fires. This is an architecture-level limitation — hooks only fire on Skill tool invocations.

## Related

- [ENH-023](../ENH-023/ENH-023-specification.md) — extends the `pre-skill-rules-inject.sh` hard-block pattern this ENH established (via ADR-043) to cover official marketplace skills (e.g. `code-review:code-review`) beyond `superpowers:*`.
