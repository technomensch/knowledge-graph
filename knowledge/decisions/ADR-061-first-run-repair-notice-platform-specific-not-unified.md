---
title: "ADR-061: First-run repair notice must be platform-specific, not one unified mechanism"
number: 061
status: Accepted
date: 2026-07-08
author: technomensch
email: mkitact@gmail.com
git:
  branch: v0.6.17-fix-extract-chat-rebuild
  commit: null
  pr: null
  issue: null
implements: null
related:
  adrs: []
  lessons: []
  kg_entries:
    - knowledge/enhancements/ENH-043/ENH-043-specification.md
    - knowledge/enhancements/ENH-044/ENH-044-specification.md
    - knowledge/enhancements/ENH-045/ENH-045-specification.md
tags: [ux-design, extraction, backup-recovery, error-recovery, v0.6.17]
category: architecture
---

# ADR-061: First-run repair notice must be platform-specific, not one unified mechanism

**Date:** 2026-07-08
**Status:** Accepted
**Implements:** Task 11/11a of `knowledge/plans/v0.6.17-fix-extract-chat-rebuild.md` (ENH-043)
**Related:** ENH-043 (Claude message-loss + `--rebuild`), ENH-044 (Gemini cross-project contamination), ENH-045 (Codex incremental-staleness, filed as a consequence of this ADR)

---

## Context

While implementing v0.6.17's `--rebuild` feature (ENH-043 — a bug where the Claude extractor's incremental dedup could silently drop subagent messages, and once a file was corrupted, no normal re-run could self-heal it), the repair was run against real chat-history data: 68 dates were flagged, but only 9 were repairable from data still present on disk. Claude Code's own session logs (`~/.claude/projects/`) had rotated/deleted anything older than 2026-05-30. The user separately recovered a Backblaze cloud backup covering part of the gap and manually pointed the tool at it via a temporary `HOME` environment-variable override — a working but fragile, undocumented hack.

This raised the question: once v0.6.17 ships, how does a user discover their own chat-history might be affected, and what do they do about it?

**First design pass (rejected):** an Opus-designed first-run notice proposing a short, uniform prompt — "N days look affected, want me to fix them? [y/N]" — shown identically regardless of platform. The user explicitly rejected this: it doesn't explain *why* dates are unrecoverable (risking the user assuming it's their fault or the tool is broken), and it was scoped to possibly cover Claude, Gemini, and Codex with the same mechanism without checking whether their underlying problems are actually the same shape.

Investigating that question found they are not:
- **Claude (ENH-043):** genuine data loss. Messages were dropped at extraction time; recovery requires either source `.jsonl` logs still on disk or a backup of them.
- **Gemini (ENH-044):** cross-project contamination, not loss. All the data exists; it's just merged into the wrong project's output file. The fix (`--project` scoping) is fully forward-looking — there's nothing to "recover" from a backup.
- **Codex:** discovered mid-design, previously unaudited for this class of bug — `extract_codex.py` still has the exact "skip if output file's mtime is under an hour old" pattern that was identified as broken and removed from Claude's extractor in v0.6.16 (commit `22c7559d`), never ported. A staleness bug, not data loss, and not previously scoped into any plan.

---

## Decision

Do not build one unified "some of your data might be incomplete" notice. Instead:

1. **Claude gets the full backup-recovery flow**: a layered notice (short default + on-request "tell me more" explaining that Claude Code itself rotates old session logs — not user error), concrete backup-folder guidance per platform, and first-class CLI flags (`--claude-projects-dir` on the extraction script, `--source-root` on the discovery script) so a user can point the tool at a restored backup as a supported operation, replacing the manual `HOME`-override hack.
2. **Gemini gets a different, corrective (not recovery) notice**: fires when `--source gemini`/`all` is used without `--project`, pointing the user at the scoping flag. No backup guidance — nothing is lost, so recovery framing would be misleading.
3. **Codex is explicitly out of scope for this notice.** The staleness bug is real but unrelated in shape (no data loss, no recovery angle); folding it in would conflate three different problems under one mechanism. Filed separately as ENH-045.

---

## Rationale

- **Surface-similar problems can have different failure shapes.** "Some of the user's data across platforms A/B/and C might be incomplete" sounds like one problem from a distance. Here it was three: loss-recoverable-from-backup (Claude), misplacement-fixable-going-forward (Gemini), staleness-unrelated-to-either (Codex). Designing one mechanism before verifying this would have produced a notice that was accurate for one platform and misleading for the other two.
- **Wrong remedy is worse than no remedy.** Offering "check your backups" for Gemini's contamination bug would send users hunting for something that was never lost. Offering a `--rebuild`-style fix for Codex's staleness bug would imply data loss that isn't happening.
- **Concrete guidance requires concrete failure-mode knowledge.** The backup-folder paths (`~/.claude/projects/<project-dir>/`, `~/.gemini/tmp/<project>/chats/` + `~/.gemini/antigravity/conversations/`, `~/.codex/sessions/YYYY/MM/DD/`) only make sense to show for the platform where recovery from an external backup is actually the remedy — Claude.
- **A real CLI mechanism beats a documented hack.** The `HOME`-override trick worked once, manually, in-session. `--claude-projects-dir`/`--source-root` make the same capability a supported, testable feature any user can follow instructions for.

---

## Consequences

- `commands/kmg-extract-chat.md` gains a new "Step 0.5: First-run repair check" — command-level (assistant-driven conversational logic), not a Python script change, since it requires reading plugin version, running discovery, and interpreting free-text responses.
- `core/scripts/extract_claude.py` and `run_extraction.py` gain an optional `claude_projects_dir` override, additive and backward-compatible.
- `core/scripts/check_extraction_health.py` gains `--source-root` and a per-date repairability check (`has_source_for_date`), so the notice can honestly report "N repairable now" vs. "M need a backup" instead of a single undifferentiated count.
- A version-stamp file (`{chat_history}/.kmg-extract-state.json`) is introduced as the "have we shown this notice yet" mechanism — the first durable per-KG state file of this kind in the extraction pipeline.
- ENH-045 (Codex staleness) exists as a direct consequence of this ADR's scoping discussion, not as independently-discovered work.

---

## Alternatives Considered

- **One unified short prompt for all three platforms** (the rejected first pass). Rejected: conflates three different failure modes into one remedy, risking misleading guidance for Gemini and Codex.
- **Silent auto-repair with no prompt.** Rejected: `--rebuild` is slow at scale (68 dates took real time in this session) and modifies files (creates `.backup` siblings) — both disqualify a silent, uninterruptible operation per the existing `--today` interactive-confirmation precedent already in this codebase.
- **Keep the manual `HOME`-override hack as the supported recovery path** (i.e., document it instead of building real flags). Rejected: not reasonably followable by a typical user; a first-class flag is the same capability without the fragility.

---

## Prior Discussion / Evidence Sources

- Two Opus design consults this session (2026-07-08): first pass produced the rejected unified-prompt design; second pass, after explicit user feedback, produced the accepted platform-specific design this ADR records.
- Real-data grounding: this session's own `--rebuild` run against `knowledge/chat-history/` (68 dates flagged, 9 recoverable from a user-supplied Backblaze backup, 42 permanently unrecoverable) is the concrete case that motivated the backup-guidance requirement.
- Direct code read confirming Codex's unported staleness bug: `core/scripts/extract_codex.py:195-201`, contrasted against its removal from `core/scripts/extract_claude.py` in commit `22c7559d`.

---

## Related Decisions

None yet — this is the first ADR governing the extraction pipeline's user-facing notification design specifically (distinct from ADR-044, which governs file-splitting mechanics, and ADR-060, which governs `kg_search` indexing scope).
