---
title: 'Session Summaries vs. Handoff Documents: Design Decisions and Overlap'
category:
  uri: uri-that-does-not-map-to-architecture
---

# Session Summaries vs. Handoff Documents

A comprehensive analysis of two complementary context-capture tools in this knowledge management project.

---

## TL;DR

| Aspect | Session Summary | Handoff Document |
|---|---|---|
| **Purpose** | Chronicle what happened | Prepare for next session |
| **Question answered** | "What was accomplished?" | "What should I do next?" |
| **Tone** | Narrative, past-tense, reflective | Prescriptive, imperative, forward-looking |
| **Retention** | Permanent (historical archive) | Ephemeral (often deleted after next session) |
| **When created** | End of work session or after completing a branch | When unfinished work needs context transfer |
| **Audience** | Project history readers, future self, collaborators | Next immediate session |
| **File naming** | Date-based: `2026-05-27.md` | Branch-based: `v0.5.9.1-handoff.md` |

---

## Detailed Comparison

### Definitions

#### Session Summary

A **historical record** of a work session that captures what was accomplished, decisions made, and lessons learned. It exists to preserve project memory and provide organizational context.

- **Trigger:** Manual (`/kmgraph:session-summary`) at natural session endpoints
- **Audience:** Future self, team members, and anyone reading project history
- **Timeframe:** Typically covers 1–3 hours of focused work (or multiple mini-sessions within a single calendar day)
- **Retention:** Always kept; archived in `knowledge/sessions/` for historical reference
- **Scope:** Complete account of what happened, why it matters, and what was learned

#### Handoff Document

A **bridge document** that prepares the current state for resumption in the next session. It exists to enable seamless context transfer and provide actionable next steps.

- **Trigger:** Manual (`/kmgraph:handoff`) when transitioning contexts or pausing unfinished work
- **Audience:** Next session (or the next developer), with highly specific resume instructions
- **Timeframe:** Covers everything needed to understand the current branch state from where you left off
- **Retention:** Often ephemeral; typically deleted or archived after the next session resumes
- **Scope:** Current blockers, unfinished work, immediate next steps, and exact resume instructions

---

### Structural Differences

#### Session Summary Structure

**Frontmatter:**
```yaml
title: "2026-05-27 — v0.5.9 Shipping + Governance Research + Tier Labels Hardening"
date: 2026-05-27
branches: [v0.5.9-decision-governance, main]
commits: [ad7f0151]
tags: [session, feature, research, v0.5.9, decision-governance, ENH-015, governance, tier-labels, gemini, plan-rules, me-md]
```

**Standard Sections:**
1. **Session Overview** (2–3 sentences describing what happened)
2. **What We Built / What Was Studied** (with file counts, detailed commit messages)
3. **Decisions Made** (with explicit context, choice, and rationale)
4. **Problems Solved** (issues discovered and fixed)
5. **Open Items** (unfinished work or conscious deferrals)
6. **Artifacts Modified** (file paths and what changed)
7. **Potential Lessons Not Yet Captured** (ideas for formal lesson documents)
8. **Git Context** (branch, commits, uncommitted edits, untracked items)

**Tone:** Retrospective, narrative, past-tense. Answers "What happened and why?"

**Real-world example:**
> Session 1 — v0.5.9 Decision Governance Protocol: Completion + Shipping
> 
> **Type:** Feature development — completion and merge of ENH-015
> **Branch:** `v0.5.9-decision-governance` (merged to main)
> **Commits:** `ad7f0151` (squash merge to main)

#### Handoff Document Structure

**Frontmatter:**
```yaml
date: 2026-05-28
branch: v0.5.9.1-review-audit-protocol
parent_commit: 4b7721d9
status: pending-push
type: Feature
```

**Standard Sections:**
1. **Session Overview** (brief: what was completed, current state)
2. **What We Built / What Was Completed** (specific files, versions, commit hashes)
3. **Decisions Made** (if any strategic choices made)
4. **Problems Solved** (if any issues fixed in prep for next session)
5. **Files Touched** (Created/Modified/Read breakdown)
6. **Commits Created** (list with hashes)
7. **Lessons Learned** (or deferred learnings)
8. **Next Steps** (immediate, future, blocked — with checkboxes)
9. **Branch and Worktree State** (exact paths, commit hashes, unfinished work)
10. **Resume Instructions** (step-by-step how to pick up where you left off)
11. **Related Resources** (plans, issues, ADRs, enhancements, knowledge references)
12. **Session Stats** (counts: files, commits, tokens, duration)

**Tone:** Prescriptive, imperative, forward-looking. Answers "What should I do next?"

**Real-world example:**
> **Status:** pending-push — branch complete, issue-7 commit pending, push + PR not yet opened
>
> **Next Steps (Immediate)**
> - [ ] Commit issue-7 files: `knowledge/issues/issue-7/` (4 files)
> - [ ] Await user "Proceed" before push
> - [ ] Push: `git push origin v0.5.9.1-review-audit-protocol`
> - [ ] Open draft PR targeting `main`

---

### Content and Purpose Differences

#### Session Summary

**What it records:**
- The actual work completed during the session
- Strategic and architectural decisions made
- Problems discovered and fixed
- Lessons learned or patterns discovered

**File details:**
- Files Modified/Created/Read — but presented as a record, not for action
- Not focused on "what needs to change next"

**Next steps:** Often None, or "Open Items" section identifies things explicitly deferred or left incomplete.

**Lessons section:** "Potential Lessons Not Yet Captured" — identifies what should eventually become formal lesson documents.

**Git information:** A snapshot of the current state (branch, commits, uncommitted edits, untracked items) as the session ended.

#### Handoff Document

**What it prepares:**
- The next session's immediate starting point
- Blockers and unfinished work
- Exact resume instructions
- Unfinished implementation tasks

**File details:**
- Created/Modified/Read — focused on what needs action or review
- Explicitly flags uncommitted files that need staging
- Directs attention to files that require decisions

**Next steps:** Central to the entire document — detailed, ordered, with checkboxes, and categorized into Immediate / Future / Blocked.

**Blockers section:** Explicit list of what's waiting on external input, user decisions, or reviews.

**Resume instructions:** Step-by-step procedural guide — where to navigate, which branch to switch to, which plan file to read, which issue to start with.

---

### When to Use Each

#### When to Create a Session Summary

1. **End of a focused work session** — Even if incomplete, document what was accomplished.
2. **Completed a feature branch** — Document what was built before merging to main.
3. **Made significant architectural decisions** — Record decisions and rationale for future reference.
4. **Solved a tricky problem** — Capture the lesson for future reference.
5. **Mixed session (multiple unrelated tasks)** — Summarize each independently if they're distinct enough.
6. **Post-merge review or release** — Document how the release went, any surprises discovered, lessons learned.

#### When to Create a Handoff

1. **Branch is complete but waiting for review/approval** — Next session will need to know the exact next steps (commit files, push, open PR, dispatch review, etc.).
2. **About to hit context limit (~180K tokens)** — Prepare comprehensive resume instructions so the next session can pick up seamlessly.
3. **Transitioning to a different developer or AI assistant** — Provide explicit step-by-step instructions so the handoff is frictionless.
4. **Pausing work for a long break** — Weekend, holiday, project switch — capture everything needed to resume.
5. **Completed a merge/release cycle** — Set up the next version branch with worktree, issues, and plan already in place.
6. **Post-merge: discovered issues need addressing** — Create the v0.5.9.2 branch, scaffold the issues, write resume instructions for the next session to pick it up immediately.

---

### Overlap and Relationship

#### Overlap

- **Both live in** `knowledge/sessions/` directory
- **Both include** session date and branch context
- **Both can reference** commits created during the work
- **Both serve as** project memory artifacts
- **Session Summaries can transition to Handoff** — if work is incomplete, convert or create a paired handoff document

#### Key Distinctions

| Aspect | Session Summary | Handoff |
|---|---|---|
| **Direction** | Retrospective (what happened) | Prospective (what's next) |
| **Permanence** | Permanent archive | Often ephemeral |
| **Tone** | Narrative, reflective | Procedural, imperative |
| **Focus** | Completed or consciously-deferred work | Unfinished work and blockers |
| **Central section** | "What We Built" / "Decisions Made" | "Next Steps" / "Resume Instructions" |
| **Audience expectation** | "Tell me about this day's work" | "Help me pick up where I left off" |

---

### Real-World Examples from This Project

#### 2026-05-27: Session Summary

**File:** `knowledge/sessions/2026-05/2026-05-27.md`

**Why this is a Session Summary:**
- This was a completed work session with three distinct sub-sessions
- Shipped v0.5.9 (merged to main), completed governance research, made cross-project tier-label updates
- All major work was finished or consciously deferred
- Appropriate to summarize as a historical record for future reference

**Frontmatter pattern:**
```yaml
title: "2026-05-27 — v0.5.9 Shipping + Governance Research + Tier Labels Hardening"
date: 2026-05-27
branches: [v0.5.9-decision-governance, main]
commits: [ad7f0151]
tags: [session, feature, research, v0.5.9, decision-governance, ENH-015, ...]
```

#### 2026-05-28: Handoff Document

**File:** `knowledge/sessions/2026-05/2026-05-28-v0.5.9.1-handoff.md`

**Why this is a Handoff:**
- Branch implementation was complete (Review Audit Protocol feature)
- But push and PR were **pending explicit user approval**
- Unfinished work: issue-7 files need to be committed before push
- User couldn't safely assume the next steps without explicit guidance
- Handoff explicitly lists: commit issue-7, await approval, push, open PR, dispatch Opus review with pre-embedded diff

**Frontmatter pattern:**
```yaml
date: 2026-05-28
branch: v0.5.9.1-review-audit-protocol
parent_commit: 4b7721d9
status: pending-push
type: Feature
```

**Key sections:**
- **Status:** "pending-push — branch complete, issue-7 commit pending, push + PR not yet opened"
- **Next Steps:** Explicit ordered checklist with four immediate items
- **Blocked:** "Push and PR are gated on explicit user 'Proceed' command"

#### 2026-05-29: Handoff Document (Post-Merge)

**File:** `knowledge/sessions/2026-05/2026-05-29-post-merge-handoff.md`

**Why this is a Handoff:**
- Post-merge state with multiple unresolved issues and a newly-created worktree
- User needed explicit resume instructions
- Worktree is ready; no implementation commits yet; issues are scaffolded
- Handoff provides: "cd into this worktree, capture this rule, read this plan file, then start with issue-5 in this order"

**Frontmatter pattern:**
```yaml
date: 2026-05-29
branch: v0.5.9.2-fix-gh-issue-create
parent_commit: 5d671b7a
status: ready-to-implement
type: Bug Fix + Meta
```

**Key sections:**
- **Branch and Worktree State:** Exact paths and commit hashes
- **Resume Instructions:** Step-by-step procedure starting from the current directory
- **Open Issues in Scope:** issue-5, 6, 8, 9 with brief descriptions of each
- **Next Steps:** Implementation order (issue-5 first, then 6, then 8, then 9)

---

### Design Principles

#### Session Summary Principles

1. **Chronicle, don't prescribe** — Record what happened, not what should happen next
2. **Narrative flow** — Tell the story of the session; use past tense
3. **Capture learnings** — Identify insights worth formalizing into lessons-learned files
4. **Preserve context** — Include enough detail that someone reading this in six months understands the decisions and their rationale
5. **Always save** — Session summaries are permanent project memory

#### Handoff Principles

1. **Enable seamless resumption** — The next session should be able to pick up exactly where this one left off
2. **Prescribe next actions** — Be explicit about what needs to happen immediately
3. **Order dependencies** — Present next steps in dependency order (blockers first, then dependent items)
4. **Flag ambiguity** — Explicitly call out decisions waiting on the user, external reviews, or external input
5. **Provide escape hatches** — Include links to plans, issues, ADRs, and enhancements so the next session can quickly understand context
6. **Accept ephemerality** — Handoffs are bridges; they can be deleted after serving their purpose

---

### Design Decisions and Rationale

#### Why Both Exist

1. **Different temporal perspectives**
   - Session Summaries look backward (what happened)
   - Handoffs look forward (what's next)
   - Both perspectives are valuable

2. **Different scopes**
   - Session Summaries capture a day's or session's worth of work
   - Handoffs capture unfinished work in a branch or context

3. **Different audiences**
   - Session Summaries are for the project archive and team understanding
   - Handoffs are for the immediate next session

4. **Different retention models**
   - Session Summaries are always kept (permanent memory)
   - Handoffs are often ephemeral (context bridge, then deleted)

#### Design Constraint: No Redundancy

The two documents **overlap in content** but serve **different purposes**:
- A handoff can reference a session summary ("see 2026-05-28 summary for context on the Review Audit Protocol")
- A session summary can mention that a handoff was created ("work not completed; see v0.5.9.1-handoff.md for next steps")
- But there's no requirement that every session has both documents

---

### Naming Conventions

**Session Summary:**
- Date-based: `YYYY-MM-DD.md` or `YYYY-MM-DD-description.md`
- Examples: `2026-05-27.md`, `2026-05-28-v0.5.9.1-snapshot.md`
- Lives in: `knowledge/sessions/YYYY-MM/`

**Handoff Document:**
- Branch-based: `branch-name-handoff.md`
- Examples: `v0.5.9.1-handoff.md`, `v0.5.9.2-fix-gh-issue-create-handoff.md` (or just `2026-05-29-post-merge-handoff.md` if the branch name is descriptive)
- Lives in: `knowledge/sessions/YYYY-MM/`
- Note: Both live in the same directory; they're distinguished by frontmatter `type` and by naming pattern

---

## Related Tools and ADRs

**Session Summary Command:**
- `/kmgraph:session-summary` — Auto-capture session content with git archaeology

**Handoff Command:**
- `/kmgraph:handoff` — Generate comprehensive handoff package (START-HERE.md, DOCUMENTATION-MAP.md, SESSION-COMPILATION.md, etc.)

**Related Decisions:**
- ADR-004: Token-Based MEMORY.md Size Limits (context preservation)
- ADR-005: Defer Memory Rules Engine (simplify knowledge capture)
- ADR-006: Document Cache Clear Upgrade Workaround (context transfer across versions)
- ADR-014: Maintain Dual Plan File Locations (local + gitignored)

---

## Summary

Session Summaries and Handoff Documents are **complementary, not competing** tools:

- **Session Summary** = "What happened and what did we learn?"
- **Handoff Document** = "What should I do next and how do I start?"

Use both when appropriate. Neither is mandatory, but each serves a distinct purpose in maintaining project memory and enabling seamless context transfer.

**Key insight:** The distinction between them is **temporal direction** — one looks backward, one looks forward. Both preserve different facets of project knowledge.

---

**Related files:**
- `knowledge/sessions/2026-05/2026-05-27.md` — Example session summary
- `knowledge/sessions/2026-05/2026-05-28-v0.5.9.1-handoff.md` — Example handoff (pending-push)
- `knowledge/sessions/2026-05/2026-05-29-post-merge-handoff.md` — Example handoff (post-merge setup)
- `knowledge/sessions/session-template.md` — Session summary template
- `commands/handoff.md` — Handoff command documentation
