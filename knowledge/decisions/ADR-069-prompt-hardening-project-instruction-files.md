---
title: "ADR-069: Prompt Hardening — Project Instruction Files"
number: 069
created: 2026-08-20T00:00:00Z
status: Accepted
author: technomensch
git:
  branch: v0.7.3-prompt-improvements
  commit: null
  pr: null
  issue: null
implements: v0.7.3
related:
  adrs: [2]
  lessons: []
  kg_entries: []
tags: [prompting, instruction-design, commands, skills, governance]
category: process
---

# ADR-069: Prompt Hardening — Project Instruction Files

**Date:** 2026-08-20
**Status:** Accepted
**Implements:** v0.7.3
**Related:** [[ADR-002-commands-vs-skills-architecture]]; also see `ADR-003-user-rules-behavioral-guidance-not-project-code` in the personal KG (`~/.kmgraph/decisions/`) — plain-text reference, not a wikilink, since this repo's own `ADR-003` is a different, unrelated decision ("Abandon Shadow Commands; Use File Prefix") and a wikilink would resolve to the wrong document

---

## Context

Companion decision to the personal KG's `ADR-015-prompt-hardening-by-updating-key-words-and-phrases` (2026-08-20), which audited `~/.kmgraph/` for bare rule-word absolutes ("always"/"never"/"must") that cause literal, instruction-following models to over-fit one rigid phrase at the expense of the rest of the prompt — the fix being an if-then rewrite that gives the model a conditional path instead of a wall.

This ADR applies the same audit, at project scope, to the instruction files this plugin ships to every downloader: `commands/` (PROTECTED, execution flows) and `skills/` (contextual guidance). The goal is the same benefit ADR-015 targets for the personal bundle, but for every user of the KMGraph plugin, not just this maintainer.

Selection bar (reused from ADR-015): an absolute is only converted when it has a demonstrated conflict (contradicts a real situation), dead end (no path forward for a legitimate case), or overbroad scope (applies where it plausibly shouldn't). Destructive/irreversible-action gates are deliberately excluded — those absolutes exist specifically to force a stop, and softening them would remove the safety property the video's own argument doesn't target.

### Audit findings

Three patterns were found and rewritten:

1. **Bash/shell output suppression** — `commands/kmg-init-personal-kg.md:4`, `commands/kmg-init.md:4`, `commands/kmg-migration.md:4` all state "Never show bash commands, shell code, or raw command output to the user," unconditionally, inside a line that also says "Present **only** plain-English results" — a second absolute reinforcing the first. Conflict: a user debugging a failed step has no path to ask for the raw output.
2. **Agent-mechanics / internal-file disclosure** — `skills/kmg-session-wrap/SKILL.md` (two spots), `skills/kmg-lesson-capture/SKILL.md`, and `skills/kmg-rules-capture/SKILL.md:336` say "never mention agent mechanics" / "never expose internal tool or agent names" / "Never mention `triggers.md`, `rules.md`, or any file name in the prompt" with no exception. Inconsistency found: sibling skills `skills/kmg-doc-update-router/SKILL.md` and `skills/kmg-capture-router/SKILL.md` already qualify the identical rule with "...unprompted" — the three outliers were harmonized to match.
3. **Narrative-block immutability** — `commands/kmg-session-summary.md:123` states the Accumulated Narrative zone's blocks are "never overwritten," and the same absolute is independently stated in `agents/session-summary-agent.md:315` and `:664` — the agent that actually performs the writes. Both the command (user-facing description) and the agent (operative instruction) need the same fix, or the command's promised escape hatch would have no effect because the agent doing the writing still has an unconditional wall.

Category 2 (fuzzy words) and Category 3 (think-harder phrases) were not audited at project scope in this pass.

## Decision

1. **`commands/kmg-init-personal-kg.md:4`, `commands/kmg-init.md:4`, `commands/kmg-migration.md:4`** — full line replacement (not a substring edit, to avoid restating "silently"/"plain-English" twice and leaving the trailing "only" absolute standing)
   - Before: "All bash/shell checks in this command are **implementation guidance only** — run them silently as internal steps. Never show bash commands, shell code, or raw command output to the user. Present only plain-English results, prompts, and status messages."
   - After: "All bash/shell checks in this command are **implementation guidance only** — run them silently as internal steps, presenting plain-English results, prompts, and status messages. If the user asks to see the actual command or its raw output, show it."
   - Why: preserves the default (don't clutter the user-facing flow with shell noise) while giving the model a path for the legitimate debugging-request case the old absolute had none for. Replacing the whole line (not just the middle sentence) avoids the redundant/contradictory result a partial substitution would produce.

2. **`skills/kmg-session-wrap/SKILL.md`** (behavior line + user-facing-language bullet)
   - Before: "...directly dispatch to `session-summary-agent` with conversational language that addresses the user, never exposing internal mechanics." / "Address the user directly (never expose internal tool names or agent names)"
   - After: "...directly dispatch to `session-summary-agent` with conversational language that addresses the user — don't volunteer internal mechanics unprompted." / "Address the user directly — don't volunteer internal tool or agent names unprompted; if asked what ran, say so plainly."
   - Why: harmonizes with `kmg-doc-update-router` and `kmg-capture-router`, which already carry the "unprompted" qualifier for the identical rule — the bare absolute here was an inconsistency, not a deliberate stricter choice.

3. **`skills/kmg-lesson-capture/SKILL.md`**
   - Before: "Use friendly, user-addressed language — never mention agent mechanics:"
   - After: "Use friendly, user-addressed language — don't volunteer agent mechanics unprompted:"
   - Why: same harmonization as item 2.

3b. **`skills/kmg-rules-capture/SKILL.md:336`**
   - Before: "**User-facing language rule:** Never mention `triggers.md`, `rules.md`, or any file name in the prompt. Describe behavior and situations only."
   - After: "**User-facing language rule:** Don't volunteer `triggers.md`, `rules.md`, or other internal file names unprompted — describe behavior and situations instead. If the user asks which file something lives in, name it."
   - Why: same disclosure-family harmonization as items 2-3 — added to scope after the independent review flagged it as a close relative; folded into the same fix pattern.

4. **`commands/kmg-session-summary.md:123`, `agents/session-summary-agent.md:315`, `agents/session-summary-agent.md:664`**
   - Before (`commands/kmg-session-summary.md:123`): "The Accumulated Narrative zone is append-only — narrative blocks are never overwritten."
   - After: "The Accumulated Narrative zone is append-only by default — new blocks are added, not merged into old ones. If the user explicitly asks to correct or redact a specific past block, edit that block directly rather than only appending a correction below it."
   - Before (`agents/session-summary-agent.md:315`): "- Accumulated Narrative blocks will be appended only — never overwritten"
   - After: "- Accumulated Narrative blocks are appended by default. If the user explicitly asks to correct or redact a specific past block, edit it directly instead."
   - Before (`agents/session-summary-agent.md:664`, table cell): "Append-only, timestamped; never overwrite"
   - After: "Append-only by default, timestamped; edit a block directly only on explicit user request to correct/redact"
   - Why: the old absolute had no path forward for a legitimate correction/redaction request — it would either be silently violated or leave the agent stuck with no way to honor a direct user ask. Both the command doc and the agent that actually performs the write need the fix — the command alone would only change the description, not the operative behavior.

## Consequences

- Positive: all items remove a rigid failure mode (no path for a legitimate edge case) without touching any destructive-action safety gate — every such gate elsewhere in `commands/`/`skills/`/`agents/` (never auto-delete, never auto-merge, never silently overwrite an existing file, archive-before-write, etc.) is untouched by this ADR.
- Positive: items 2/3/3b's harmonization also fixes a latent inconsistency between five sibling "route to the right place" skills that should have shared identical user-facing-language wording and didn't.
- Positive: item 4 fixes both the user-facing description (command doc) and the operative instruction (agent file) — a partial fix to only one would have left the actual write behavior unchanged.
- Neutral: this ADR covers Category 1 (rule words) only, at project scope. Category 2 (fuzzy words) and Category 3 (think-harder phrases) were not audited here.
- Open: Category 2 project-scope audit (candidates like "detailed," "thorough," "professional," if any exist in `commands/`/`skills/`) is deferred to a follow-up pass.

## Future Considerations

- Run the Category 2 (fuzzy words) and Category 3 (think-harder phrases) audits at project scope as a follow-up, mirroring what ADR-015 flagged as open for the personal bundle.
- Re-run this three-category audit periodically as new commands/skills are added.
