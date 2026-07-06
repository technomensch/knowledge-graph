# ENH-035: Chat-history-to-KG backfill extractor (standalone)

**Status:** 🟡 Proposed
**Discovered:** 2026-07-03
**Governed by:** [ADR-058](../../decisions/ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings.md)
**Related:** [ADR-057](../../decisions/ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md) (the DETECT-layer / auto-capture pipeline this ENH is deliberately NOT coupled to), `commands/kmg-extract-chat.md`, `commands/kmg-update-graph.md`

---

## Problem

`kmg-extract-chat`'s own docstring claims it is **"ideal for backfilling knowledge graphs from large chat histories."** In reality it only **archives raw session transcripts** as markdown into `chat-history/`. It does not extract anything.

Confirmed via **direct code inspection** during the session:
- `commands/kmg-extract-chat.md` — archives raw transcripts only; performs no lesson/decision/KG-entry extraction.
- `commands/kmg-update-graph.md` — the only extractor in the command set, and it extracts **only from `lessons-learned/`**, never from `chat-history/`.

So there is a real, unmet capability: **nothing extracts lessons / decisions / KG-entries FROM `chat-history/`.** The docstring overclaims a feature that does not exist.

---

## Proposed Behavior

Build a **standalone** extractor and separately fix the misleading docstring. These are two independent deliverables; the docstring fix ships regardless of when the extractor lands.

1. **New standalone extractor command: `kmg-backfill-graph`** (name decided 2026-07-03, passed the ADR-058 check — see "Naming decision" below). It:
   - Reads files under `chat-history/` (single file, date folder, or range).
   - Drafts candidate lesson / decision / KG-entry artifacts from them.
   - **Before any write, prints the resolved target path(s) and destination KG** — reuses the confirmation-line pattern established in ENH-033 (step 3a): `Drafting from: {chat-history file(s)} → Writing to: {target KG path}`.
   - **Presents drafts for human confirmation before any write** — a simple present-for-confirmation flow, aligned with the project's reversibility/explicit values. It does **not** auto-write.

2. **Fix `kmg-extract-chat`'s docstring.** Stop claiming a backfill/extraction capability it does not have. Reword to describe what it actually does — archive raw session transcripts to `chat-history/`. Point users toward the new extractor for actual backfill. This fix is **independent** of the extractor's delivery timeline.

---

## Explicitly Out of Scope

- **Any dependency on `capture_mode`**, the parent auto-capture pipeline, or the DETECT-layer classifier ([ENH-036](../ENH-036/ENH-036-specification.md)). Per the second-opinion finding recorded in ADR-058's context: batch classification over raw, unbounded chat transcripts is harder than live-hook detection (no discrete trigger boundary, high noise), and coupling a simple extractor to the still-unresolved `capture_mode` keystone would recreate the exact piecemeal-coupling problem ADR-057 diagnosed.
- **Do not architect this as "pipeline slice 1."** It is a narrow, self-contained fix. Any classifier-design insight gained is a bonus, not an architectural commitment.
- Auto-writing without review (even absent `capture_mode`, use the simple confirmation flow).

---

## Options — DECIDED: Option A

### Option A: New dedicated command, `kmg-backfill-graph` (chosen)
A separate command so the archive step (`kmg-extract-chat`) and the extract step stay cleanly distinct.

**Why decided now (2026-07-03):** `kmg-update-graph` (Option B's target) is already flagged in ENH-034 as an actively-misleading name and a rename candidate. Extending a command that's already earmarked for its own rename would double the change surface on that file across two ENHs. A new standalone command also keeps each command's job narrow — consistent with the detection/routing separation already established in ADR-034 and ADR-057 — rather than mixing two source shapes (structured `lessons-learned/` vs. raw, noisy `chat-history/`) with different signal profiles into one command.

**Naming decision:** `kmg-backfill-graph` passes the ADR-058 check — audience: end users, not contributor-only; collision: none found against existing command names (`kmg-extract-chat`, `kmg-update-graph` checked directly); accuracy: name describes exactly what it does (backfills the graph from existing chat-history), and its docstring must be written to match that claim exactly — this ENH exists because a prior command's docstring didn't.

### Option B: Extend `kmg-update-graph` to also read `chat-history/` (rejected)
**Rejected because:** overloads a command already flagged for rename in ENH-034, and mixes two source shapes with different noise profiles into one command's responsibility.

---

## Affected Files

| File | Role |
|---|---|
| `commands/kmg-extract-chat.md` | Fix overclaiming docstring — describe actual archive behavior; point to the extractor |
| `commands/kmg-backfill-graph.md` (new) | New standalone extractor: `chat-history/` → drafted lesson/decision/KG entries with target-confirmation line + confirm-before-write |
| `docs/reference/commands.md` | Document the new extractor and corrected `kmg-extract-chat` description |

---

## Acceptance Criteria

- [ ] `kmg-extract-chat`'s docstring no longer claims backfill/extraction; it describes only its actual archive behavior.
- [ ] `kmg-backfill-graph` exists as a new standalone command that reads `chat-history/` and drafts lesson/decision/KG-entry candidates.
- [ ] Before any write, the command prints the resolved source file(s) and destination KG path (reused ENH-033 step-3a pattern).
- [ ] The extractor presents drafts for human confirmation and never auto-writes.
- [ ] The extractor has **no** code dependency on `capture_mode`, the auto-capture pipeline, or the ENH-036 classifier.
- [ ] `kmg-update-graph` is untouched by this ENH (Option B rejected).
</content>
