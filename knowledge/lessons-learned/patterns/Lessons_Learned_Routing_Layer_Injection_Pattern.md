---
title: 'Lesson: Routing-Layer-Only Profile Injection Pattern'
category:
  uri: uri-that-does-not-map-to-patterns
---

# Lesson Learned: Routing-Layer-Only Profile Injection Pattern

**Date:** 2026-04-28
**Category:** patterns
**Version:** 1.0

---

## Problem

After context compaction, `~/.kmgraph/me.md`, `~/.kmgraph/triggers.md`, `knowledge/me.md`, and `knowledge/triggers.md` were not reloaded into session context. The `CLAUDE.md` instruction to read them at session start was passive — nothing enforced it when the session window was reset by compaction.

**Context:**
- KMGraph project: `knowledge-graph`
- Triggered by: context compaction mid-session on branch `v0.5.4-profile-autoload`
- Initial symptoms: AI agent lost behavioral routing rules and identity context silently; no warning to the user

**Impact:**
- Behavioral rules (triggers, identity framing) went missing without any visible signal
- Agent behavior became inconsistent post-compaction
- Users on new projects (no `init` run yet) would see spurious errors if missing files were not handled gracefully

---

## Root Cause

The `CLAUDE.md` instruction to read `me.md` and `triggers.md` relied on passive convention — the files would be read if Claude happened to reference them, but there was no active enforcement mechanism at `SessionStart`. When compaction wiped the active context, these files were simply not re-injected.

**Analysis:**
1. `CLAUDE.md` instructs the agent to read the files but does not trigger any shell-level hook
2. `SessionStart` hooks (`hooks-master.sh`) had no injection step for routing files
3. `rules.md` was already not injected (correct — it is loaded on-demand by trigger anchors); but `me.md` and `triggers.md` must be injected unconditionally because they are the routing layer itself

**Evidence:**
- After compaction, the agent failed to apply identity-based routing preferences
- Manually running the session start hook showed no injection of `me.md` or `triggers.md`

---

## Solution

**Routing-layer-only injection:** `me.md` and `triggers.md` (both personal `~/.kmgraph/` scope and project `knowledge/` scope) are auto-injected at every `SessionStart` via a `_inject_profile` bash helper function.

### Implementation

**Approach:**
Add two new sections to `scripts/hooks-master.sh`. Use a shared `_inject_profile` helper that wraps file contents in provenance delimiters and silently skips missing files.

**Key Components:**

1. **`_inject_profile` helper** (defined once in Section 1.5):
   - Wraps each file in `===== BEGIN <label> =====` / `===== END <label> =====` delimiters
   - Silently returns early if the file does not exist (no error output)
   - Accepts `(label, filepath)` arguments — reusable for both scopes

2. **Section 1.5 — Personal injection** (runs BEFORE early-exit guards):
   - Injects `~/.kmgraph/me.md` and `~/.kmgraph/triggers.md`
   - Must run before the early-exit guards so personal routing context survives even when no project KG is configured

3. **Section 3.75 — Project injection** (runs AFTER `$KG_PATH` is resolved):
   - Injects `$KG_PATH/me.md` and `$KG_PATH/triggers.md`
   - Reuses `_inject_profile` defined in Section 1.5

**What is NOT injected:**
- `rules.md` files — these are intentionally excluded. They load on-demand when workflow-phase triggers fire, referenced by specific section anchors (e.g., `rules.md § Approval Gates`). Injecting `rules.md` unconditionally would pay a permanent context tax proportional to file growth.

---

## Verification

**Test Cases:**
1. After compaction: routing preferences (from `triggers.md`) are applied correctly in the new window
2. On a project with no `init` run yet: hook runs without errors, missing files are silently skipped
3. Personal injection fires even when no `$KG_PATH` is set (early-exit guard does not block it)

**Results:**
- Routing context survives compaction without manual intervention
- No noise for users on new projects
- Personal identity context available even in non-KG sessions

---

## Prevention System

**Immediate Prevention:**
- `_inject_profile` helper centralizes the skip logic — adding new routing files is a one-line call
- Provenance delimiters make it clear in context which text came from which file

**Systematic Prevention:**
- Any file that must survive compaction should be injected at `SessionStart`, not merely referenced in `CLAUDE.md`
- Files that should NOT be injected unconditionally (e.g., `rules.md`) must be explicitly excluded with a comment explaining why

---

## Replication Pattern

### For Other Projects

**When to Apply:**
- You have files that define routing behavior, identity, or trigger conditions for an AI agent
- Those files must be available at the start of every session, including after context compaction
- The files are small enough (~4k tokens) to be a fixed overhead, not a variable cost

**Universal Pattern:**
1. Define a `_inject_profile(label, filepath)` helper that outputs `===== BEGIN <label> =====` / file contents / `===== END <label> =====` and silently skips missing files
2. Place personal-scope injection BEFORE any early-exit guards in the session start hook
3. Place project-scope injection AFTER the project path is resolved
4. Never inject large, growing files (e.g., `rules.md`) unconditionally — use trigger anchors for those

**Customization Points:**
- Delimiter format: the `BEGIN/END` tags can be adjusted; the key is that they are machine-readable and unique
- Scope names: "personal" (`~/.kmgraph/`) vs. "project" (`$KG_PATH/`) can be renamed for different architectures
- File list: add new routing files by adding a single `_inject_profile` call

### Example Application

**Scenario:** A team adds a `context-budget.md` file that defines token-budget rules for the agent. It should be injected at every session start.

```bash
# In Section 1.5 (personal scope) or Section 3.75 (project scope):
_inject_profile "context-budget" "$KG_PATH/context-budget.md"
```

---

## Trade-offs

- **Trigger anchors must stay in sync with `rules.md` section headings.** If a heading in `rules.md` changes, its trigger pointer in `triggers.md` breaks silently. This is a known trade-off accepted in ADR-047.
- **~4k token fixed overhead per session.** The routing layer (`me.md` + `triggers.md`) is small by design. If these files grow significantly, the injection cost must be re-evaluated.
- **Silent skip on missing files.** New projects that haven't run `init` get no errors, but also no routing context until they do. This is the correct behavior.

---

## Related Documentation

**Architecture Decisions:**
- [[ADR-047-profile-auto-load-routing-layer-only]] — Decision record for this pattern; covers the routing-layer-only scope and the rules.md exclusion rationale

**Other Lessons:**
- [[Lessons_Learned_Two_Level_Identity_Rules_Hierarchy]] — The hierarchy design that this injection pattern enforces at runtime

---

## Lessons & Takeaways

**Key Insights:**
1. Passive `CLAUDE.md` instructions do not survive context compaction — active shell-level injection is required for any file that must always be present
2. Routing layer (`me.md` + `triggers.md`) is a fixed ~4k token overhead that is worth paying unconditionally; `rules.md` is not
3. Placing personal injection before early-exit guards is load-bearing — skipping this means users without a project KG lose personal identity context

**What Worked:**
- Shared `_inject_profile` helper with provenance delimiters
- Two-section approach (1.5 personal, 3.75 project) that maps cleanly onto the two scopes in the identity hierarchy

**What Didn't Work:**
- Relying on `CLAUDE.md` instructions alone to ensure file availability post-compaction

**If We Had to Do It Again:**
- We'd add this pattern at the same time as introducing the two-level identity hierarchy (the injection mechanism is the enforcement arm of that design)
- We'd document the "never inject rules.md" constraint explicitly from day one

---

**Version:** 1.0
**Created:** 2026-04-28
**Last Updated:** 2026-04-28
