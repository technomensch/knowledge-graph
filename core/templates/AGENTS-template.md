# Knowledge Management — AI Assistant Behaviors

These guidelines shape how your AI coding assistant participates in knowledge management alongside you. The goal is simple: capture what matters, recall what's relevant, and never let useful work disappear into forgotten context windows.

Your assistant should treat these as natural habits — surfacing opportunities without being pushy, and always deferring to you on what's worth saving.

---

## Capturing Knowledge

Some moments in a coding session are worth preserving. Your assistant should watch for these signals and gently surface them.

**A bug was solved after real investigation.** If the fix wasn't obvious — if it required digging, hypotheses, or trial-and-error — the problem, root cause, and solution are worth capturing. Offer something like: *"That was a real investigation. Want me to save what caused it and how we fixed it?"*

**A technical decision was made.** Choosing one library over another, picking an architecture pattern, accepting a tradeoff — these decisions have context that fades fast. When you notice one, offer to capture the choice and the reasoning behind it.

**A pattern keeps coming up.** If the same approach, workaround, or technique appears across multiple files or sessions, it might be worth generalizing into a reusable note. *"This is the third time we've handled it this way — want me to write it up as a pattern?"*

**A setup step was painful or non-obvious.** Environment configuration, dependency quirks, platform-specific workarounds — anything that took longer than expected because the path wasn't clear. Future sessions (or teammates) will hit the same wall.

**A "gotcha" wasted time.** Misleading error messages, silent failures, undocumented API behavior, version incompatibilities. If it was surprising and cost time, it's worth a note.

In every case, the assistant should briefly describe what it would capture and ask for confirmation. Never save anything without the user's approval. Keep the offer lightweight — one or two sentences, not a form to fill out.

---

## Recalling Existing Knowledge

Before answering from scratch, your assistant should check whether relevant knowledge already exists.

**The user asks about past work.** Questions like "have we done this before," "what did we decide about X," or "do we have notes on Y" are direct signals. Search existing knowledge before composing an answer.

**The user references a past session or decision.** If a previous conversation, decision, or debugging session is mentioned — even vaguely — check for existing records before guessing.

**Work might already be documented.** If the user is about to implement something that sounds familiar, or is re-investigating a problem that might have been solved before, a quick search could save significant time.

When presenting results from a search, be conversational. Don't dump raw records. Summarize what was found and why it might be relevant: *"I found a note from last month on this — we went with approach X because of Y. Does that still apply, or have things changed?"*

If a `kg_search` MCP tool is available, use it with relevant terms before answering questions that might have prior context. If MCP tools aren't configured, let the user know they can search manually.

---

## Wrapping Up Work

When a work session is ending or a milestone is reached, your assistant should help tie up loose ends before context is lost.

**Watch for these signals:**

- The user says they're done, stopping, taking a break, or wrapping up
- A pull request was just created or a major feature was completed
- A long debugging or research session just concluded
- The conversation is getting long and context limits are approaching

**Before stopping, surface a brief summary:**

- What was built, fixed, or decided during the session
- Any open items in active plans — check `docs/plans/` for tasks that were completed but not yet marked done
- Any draft or proposed decisions in `docs/decisions/` that need follow-up
- Any lesson-worthy moments from the session that haven't been captured yet

Offer to save a session summary: *"Before you go — want a quick note on what we covered today? I can capture the key commits, decisions, and anything worth remembering for next time."*

Keep the summary offer brief. If the user declines, respect that and move on.

---

## Working with Decisions

Some decisions deserve more than a passing note. When a choice will shape future work — or would be confusing to revisit without context — your assistant should suggest recording it formally as an Architecture Decision Record (ADR).

**Suggest an ADR when:**

- A significant technology choice was made — a library, framework, data format, or architectural approach was selected over alternatives
- A constraint was discovered that will affect future work — a platform limitation, a performance boundary, a compatibility requirement
- A tradeoff was explicitly weighed — speed vs. correctness, simplicity vs. flexibility, build vs. buy
- Something was deliberately *not* done — "we decided against X because Y" is often more valuable than documenting what was chosen

**How to frame it:** *"This feels like a decision worth recording — future you (or your team) will want to know why this approach was chosen. Want me to draft an ADR?"*

Not every choice needs an ADR. Reserve them for decisions that would be confusing, risky, or expensive to revisit without the original reasoning. Day-to-day implementation choices don't need this treatment.

ADRs live in `docs/decisions/` and follow a simple structure: title, status, context, decision, and consequences.

---

## Folder Conventions

Knowledge is organized in a predictable structure so both humans and assistants can find it:

| Folder | Contains |
|---|---|
| `docs/knowledge/` | Lessons learned, patterns, gotchas, and reusable insights |
| `docs/decisions/` | Architecture Decision Records (ADRs) |
| `docs/sessions/` | Session summaries and work logs |
| `docs/plans/` | Implementation plans with task checklists |

When capturing or searching for knowledge, use these paths. If a folder doesn't exist yet, ask the user before creating it.

---

## MCP Tool Reference

If your platform supports MCP (Model Context Protocol) tools, these may be available for knowledge management:

| Tool | Purpose |
|---|---|
| `kg_search` | Search existing knowledge — lessons, decisions, patterns, sessions |
| `kg_fts5_rebuild` | Rebuild the full-text search index after adding new content |

These tools are optional. All of the behaviors described above work with or without MCP tools configured. When MCP tools aren't available, the assistant can still suggest capturing knowledge by writing markdown files directly, and the user can search manually.

---

## Principles

- **User always confirms.** Never save, create, or modify knowledge files without explicit approval.
- **Brief over thorough.** A short note captured today is worth more than a perfect document never written.
- **Recall before reinvention.** Always check existing knowledge before solving a problem from scratch.
- **Helpful, not intrusive.** Surface opportunities once. If the user declines, move on.
- **Context is perishable.** The best time to capture a decision or lesson is right after it happens. Tomorrow, the reasoning will be fuzzy.
