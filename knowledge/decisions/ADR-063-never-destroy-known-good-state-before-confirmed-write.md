---
title: "ADR-063: Never destroy known-good state before the replacement is confirmed written"
number: 063
status: Accepted
date: 2026-07-11
author: technomensch
email: mkitact@gmail.com
git:
  branch: v0.6.18-fix-extraction-regressions
  commit: null
  pr: null
  issue: null
implements: null
related:
  adrs: []
  lessons:
    - knowledge/issues/chat-extraction-reliability-saga/analysis/lessons-learned.md
  kg_entries:
    - knowledge/issues/chat-extraction-reliability-saga/README.md
    - knowledge/issues/chat-extraction-reliability-saga/attempts/ENH-043/specification.md
    - knowledge/issues/kg-config-silent-overwrite/README.md
tags: [write-safety, data-loss, cross-cutting, v0.6.18]
category: architecture
---

# ADR-063: Never destroy known-good state before the replacement is confirmed written

**Date:** 2026-07-11
**Status:** Accepted
**Implements:** `knowledge/plans/v0.6.18-fix-extraction-regressions.md` (Fix 1+2), and (by the same principle, different branch) `knowledge/plans/v0.6.19-fix-kg-config-silent-overwrite.md`

---

## Context

**Problem:** on 2026-07-10/11, this repo independently discovered the identical anti-pattern in two unrelated subsystems on the same day:

1. **Chat-extraction rebuild path** (`core/scripts/extract_claude.py` / `chat_extractor_base.py`): `--rebuild` mode called `shutil.rmtree` on a stale `{date}/` split subfolder *before* writing the fresh flat file, and the non-rebuild overwrite branch used a single fixed `.backup` filename that a second interrupted run could clobber. An interrupt between the delete and the completed write left a date with neither the old content nor a complete new file.
2. **`kg-config-silent-overwrite`** (`tests/test-hooks.sh` / `tests/test-stop-hook.sh`, a fully separate subsystem — bash test scripts, not Python extractors): sandboxed a hook under test by `cp`/`rm -f`-ing the user's **real** global `~/.claude/kg-config.json` in place, protected only by a `trap cleanup EXIT` restore. A non-graceful interruption left the real file permanently overwritten with test-fixture data. This actually happened to a real user's config.

Both bugs have the exact same shape: **destroy the existing, known-good state before the replacement is guaranteed to exist**, relying on best-effort cleanup (a trap, a "this should work" assumption) rather than an ordering guarantee. Two independent instances of the identical anti-pattern, in unrelated subsystems, discovered the same day, is a signal that this is a class of bug this codebase is prone to — not a coincidence to fix twice and move on from.

**Scope:** this ADR records the *general principle* both fixes now follow. It does not mandate a single shared code implementation across the two subsystems (Python extraction scripts vs. bash hook/test scripts are different enough that a literal shared helper isn't practical), but it does mandate the same ordering guarantee in both, and in any future code that overwrites, deletes, or clears existing state as part of a "repair," "rebuild," or "sandbox" operation.

---

## Decision

**Never destroy existing state until the replacement exists and is confirmed complete.** Concretely, for any operation that would overwrite, delete, or clear something that currently holds real (possibly irreplaceable) data:

1. **Write the new state to a temporary/separate location first**, not in place over the old state.
2. **Confirm the new state is complete** (write succeeded, no exception, atomic swap done) before the old state is touched at all.
3. **When the old state must eventually be removed, rename it aside instead of deleting it outright** — a rename is cheap, atomic, and reversible; a delete is not. Give the aside-copy a name that can't collide with a concurrent/repeated run (unique per-run, e.g. pid + timestamp + collision counter) and that's invisible to normal routing/discovery logic, so it never gets mistaken for live output.
4. **Prefer this over "backup then overwrite in place."** Backing up before overwriting is better than nothing, but still has a window where neither the backup nor the final state is guaranteed complete if the process dies mid-copy. Atomic write (temp file + rename/replace) closes that window entirely.

### Core Components

1. **Atomic write:** write to a temp path, then an atomic filesystem rename/replace into the final path. A crash before the swap leaves the original untouched; a crash after leaves the complete new file. Never a truncated target.
2. **Rename-aside, not delete:** when old state must be cleared, move it to a uniquely-named, hidden/ignorable sibling rather than removing it. Recoverable by definition until an explicit retention policy prunes it.
3. **Sandbox by construction, not by convention:** when a test needs to safely exercise code that touches a real, shared resource (a config file, a data directory), the resource path itself must be overridable (an env var, a parameter) so the test can point at a throwaway location — not rely on the test script backing up and restoring the real resource around the call.

---

## Rationale

### Why This Approach

A `trap cleanup EXIT` or a single-slot `.backup` file both work in the common case — a clean exit. Neither works under a genuinely adversarial-but-realistic condition: `Ctrl-C`, a killed process, a closed terminal, a second consecutive run before the first's cleanup logic runs. Both discovered incidents in this repo were exactly that condition. An atomic-write-plus-rename-aside design has no such window: there is no state in which the old data is gone and the new data doesn't yet exist, because the old data is never touched until the new data is confirmed.

### Alternatives Considered

**Option A — Keep per-subsystem ad hoc fixes, no shared principle recorded.**
- Pros: less overhead; each fix already works.
- Cons: the whole reason this ADR exists is that the same mistake was made twice in one day in unrelated code, by (in effect) not having this principle written down anywhere to check against. Not recording it risks a third instance.
- Rejected: a KMGraph repo's decision record is a primary output, not overhead — a pattern recurring across subsystems is exactly what an ADR is for.

**Option B — Build one shared "safe write" library and force both subsystems to use it.**
- Pros: single source of truth, zero drift between implementations.
- Cons: the two subsystems are different enough (Python data-writing scripts vs. bash hook/test scripts sandboxing a config file) that a literal shared implementation would be awkward and wouldn't actually reduce the real risk (the ordering discipline, not the specific code, is what matters). Forcing a shared library where the natural implementations differ risks a worse abstraction than two well-reasoned, principle-aligned implementations.
- Rejected for this pass; not precluded later if a third instance of this pattern appears in a context genuinely similar enough to share code.

**Option C — Record the principle as an ADR, implement per-subsystem consistent with it (chosen).**
- Pros: gives future contributors and future-self a named principle to check new code against, without forcing a premature shared abstraction.
- Cons: relies on the principle actually being checked, not just written down — mitigated by cross-linking it from both incident write-ups and the relevant lessons-learned entries.
- **Accepted.**

### Trade-offs

**Benefits:**
- ✅ Closes an entire class of data-loss bug, not just the two instances found so far.
- ✅ Gives a concrete, checkable rule ("does this code delete/overwrite something before its replacement is confirmed?") for future code review.
- ✅ Both discovered incidents are fixed in a way that matches this principle, not just patched individually.

**Costs:**
- ❌ Slightly more code per write path (temp file + rename, vs. a direct `open('w')`) — justified given the data-loss severity of the alternative.
- ❌ Rename-aside backups accumulate disk usage without a retention policy — mitigated by capping retention (e.g. 3 most recent) per write path.

**Mitigation:**
- Retention caps on rename-aside backups, applied per-subsystem (e.g. `chat_extractor_base.py`'s `backup_aside()` keeps 3 most recent).

---

## Consequences

### Positive
1. Both the 2026-07-10/11 incidents (chat-extraction rebuild, kg-config-silent-overwrite) are fixed in a way that matches one named, checkable principle rather than two unrelated patches.
2. Future code review has a concrete question to ask of any destructive-looking operation: "is the old state ever gone before the new state is confirmed?"

### Negative
1. Slightly more implementation complexity per write path than a direct overwrite — accepted, since the alternative is unbounded data loss on interruption.

### Neutral
1. Does not mandate a single shared library across subsystems — implementations differ by context, the ordering guarantee does not.

---

## Implementation

**Timeline:** Chat-extraction side implemented 2026-07-11 (`knowledge/plans/v0.6.18-fix-extraction-regressions.md`, this branch). kg-config side implemented on the sibling `v0.6.19-fix-kg-config-silent-overwrite` branch (later merged onto this same branch as one combined release, per explicit user decision — see `knowledge/issues/kg-config-silent-overwrite/README.md`).

**Affected Components:**
- `core/scripts/chat_extractor_base.py` — `write_atomic()`, `backup_aside()` (this branch).
- `core/scripts/extract_claude.py` — rebuild/overwrite branches rerouted through both helpers (this branch).
- `scripts/hooks-master.sh`, `scripts/session-end-prompt.sh`, `scripts/post-tool-lesson-check.sh`, `scripts/plan-mirror.sh`, `scripts/notification-dispatch.sh` — `KG_CONFIG_PATH` env override, so tests sandbox by pointing elsewhere instead of backing up and restoring the real file (kg-config-silent-overwrite fix, merged onto this branch).
- `tests/test-hooks.sh`, `tests/test-stop-hook.sh` — rewritten to sandbox via `KG_CONFIG_PATH`, no longer touching the real config file at all (kg-config-silent-overwrite fix).

---

## Validation

**Success Criteria:**
- Chat-extraction: a live behavioral test (seed a stale split dir, run `--rebuild` twice) confirms the old split content is backed up (not deleted) on run 1, and a **second, distinct** backup of run 1's own output is created on run 2 — neither destroyed. Verified.
- kg-config: the real `~/.claude/kg-config.json` is never referenced by either rewritten test script — verified by grep (zero `REAL_CONFIG`/`~/.claude/kg-config` references remain) plus a graceful full-suite run confirming its sha256 is unchanged.

---

## Related Decisions

- **[[ADR-012]]** (hook security model, kg-config's governing decision) — this ADR's principle is a generalization of what ADR-012 already required for hooks specifically ("no writes outside the active KG path," idempotency); this ADR extends the same spirit to any destructive operation, not just hooks.
- **[[ADR-044]]** (split oversized chat-history files) — this ADR's chat-extraction implementation must and does stay compatible with ADR-044's split-file mechanics; `backup_aside()`'s dot-hidden naming was specifically chosen so backups never collide with ADR-044's `^\d{4}-\d{2}-\d{2}$` split-folder contract.
- **[[ADR-062]]** (Gemini fail-closed scoping) — a sibling v0.6.18 finding (Finding 3) fixed a related-but-distinct class of bug (a fail-closed control failing open due to check ordering) in the same branch; not the same principle as this ADR, but discovered and fixed in the same review pass.

---

**Decision Made:** 2026-07-11
**Last Updated:** 2026-07-11
**Status:** Accepted — implemented on this branch (chat-extraction side) and the merged sibling branch (kg-config side)
