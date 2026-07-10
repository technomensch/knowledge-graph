---
title: "ADR-062: Gemini .pb / hash-named directory project-scoping fails closed, not open"
number: 062
status: Accepted
date: 2026-07-10
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
    - knowledge/issues/chat-extraction-reliability-saga/attempts/ENH-044/specification.md
    - knowledge/enhancements/ENH-038/ENH-038-specification.md
tags: [privacy, extraction, gemini, trust-boundary, v0.6.17]
category: architecture
---

# ADR-062: Gemini .pb / hash-named directory project-scoping fails closed, not open

**Date:** 2026-07-10
**Status:** Accepted
**Implements:** `knowledge/plans/v0.6.17-fix-extract-chat-multiday-bucketing.md` Task 5/6 (ENH-044)

---

## Context

**Problem:** ENH-044's `.json`/`.jsonl` Gemini project-scoping fix (`bf1cb51c`) is real and verified working, but it does not cover two structural gaps confirmed against real data on this machine:

1. **`.pb` files carry no per-project path.** `extract_gemini_pb_sessions()` (`core/scripts/extract_gemini.py:245-257`) globs `GEMINI_CONV_DIR/*.pb` flat — `GEMINI_CONV_DIR = ~/.gemini/antigravity/conversations`, with no per-project subdirectory structure the way `GEMINI_TMP_DIR` has for `.json`/`.jsonl`. The function accepts a `project_filter` parameter but does not apply it — its own docstring says so. 93 real `.pb` files exist on this machine; the leak is masked only by accident, because `blackboxprotobuf` is not installed here, so `.pb` extraction no-ops. On any machine with that optional dependency installed, `--project=knowledge-graph` would pull in all 93 foreign conversations.
2. **Hash-named `~/.gemini/tmp/` directories** (9 confirmed on this machine, e.g. `26f813b7…`) cannot fragment-match a human-readable `--project` string at all.

**Why this is a privacy/trust-boundary decision, not data hygiene:** the extractor writes conversation content into the project's knowledge graph — a git-committed, FTS-indexed, often-shared store. Cross-project contamination means *another project's private content* (potentially credentials, client names, private paths — the confirmed real case was a `career-prism` job-search tool's conversation merged into `knowledge-graph`'s output) crosses a trust boundary into this project's persisted, searchable, version-controlled store. Once committed, that leak is hard to fully undo (git history + FTS index both retain it). Excluding some of a project's *own* `.pb` content because it can't be positively attributed is benign and fully recoverable (a future fix can recover it later). **The two error directions are not symmetric** — leaking in is expensive to undo; leaving out is cheap to fix. That asymmetry is what this ADR decides.

**Scope:** In scope — `.pb` file scoping and hash-named directory scoping under `--project`, both currently in `core/scripts/extract_gemini.py`. Out of scope — the `.json`/`.jsonl` path (already correctly scoped by `bf1cb51c`), and any change to Claude or Codex extractors.

---

## Decision

**Fail closed.** When `--project`/`project_filter` is set, any `.pb` session or hash-named-directory session that cannot be **positively attributed** to the requested project is **excluded** from output, with a visible skip notice (e.g. "N `.pb` sessions skipped — not attributable to project X") — exclusion is never silent.

Since `.pb` files currently carry no reliable per-project signal at all, this means: with `--project` set, **all** `.pb` sessions are excluded (none can currently be positively attributed), and any hash-named `~/.gemini/tmp/` directory is excluded the same way.

### Core Components

1. **Fail-closed default:** unattributable content is excluded, not included, whenever a project filter is active.
2. **Visible skip notice:** every exclusion is reported to the user (count + reason), never silent — an unreported skip would recreate the same trust gap this ADR closes, just relocated from "included wrongly" to "dropped silently."
3. **No decoder built:** this decision does not require inventing a way to extract a project identifier from a decoded `.pb` payload. It accepts a coarser floor (exclude everything unattributable) in exchange for a guarantee (nothing foreign leaks in).

---

## Rationale

### Why This Approach

Given the asymmetry above, the fix must optimize for "never leak foreign content in," even at the cost of "may exclude some genuine own-project content that can't currently be attributed." A missing `.pb` session from your own project is a one-line complaint and a straightforward follow-up fix; a foreign project's private conversation committed into this project's history is a data-boundary incident that may require git history surgery to fully remove.

### Alternatives Considered

**Option A — Payload-decoded project signal.** Investigate whether the decoded `.pb` payload (via `blackboxprotobuf`) reliably contains a project/workspace identifier, and scope by that instead of excluding everything.
- Pros: higher fidelity — could recover currently-excluded own-project `.pb` sessions.
- Cons: adds a fragile heuristic (undocumented protobuf schema, decoded structurally without a `.proto` file) and a hard dependency on an optional package not installed on this machine. A wrong heuristic guess reopens exactly the leak this ADR closes.
- **Rejected as the sole gate; explicitly deferred as a future recovery layer that can only sit *on top of* the fail-closed floor** (Task 5 note), never replace it — because a heuristic that's wrong even occasionally reintroduces silent contamination, and this is a trust-boundary decision where "occasionally wrong" is not an acceptable failure mode.

**Option B — Include unattributable content with a warning.** Include `.pb`/hash-dir sessions but print a warning that they couldn't be scoped.
- Pros: no data loss for the user's own content.
- Cons: fails open — a warning is easy to miss, and the actual contamination (foreign content written into this project's committed, indexed store) still happens. This is the status quo's actual failure mode; a warning does not change the outcome, only the visibility of it.
- Rejected: does not close the trust-boundary gap, only documents it.

**Option C — Fail closed (chosen).** See Decision above.
- Pros: guarantees no cross-boundary leak without inventing a decoder; simple to implement and reason about; matches the risk asymmetry.
- Cons: some genuine own-project `.pb` content becomes invisible to `--project`-scoped extraction until a future payload-signal layer (Option A, deferred) recovers it.
- **Accepted.**

### Trade-offs

**Benefits:**
- ✅ No foreign project content can enter a project-scoped extraction via `.pb` or hash-named directories.
- ✅ Exclusions are visible, not silent — a user can tell their own content was excluded and investigate.
- ✅ No new dependency, no schema-guessing required to ship this.

**Costs:**
- ❌ A user's own `.pb` conversations are excluded from `--project`-scoped output entirely, until a future payload-signal layer recovers them.
- ❌ Hash-named directories remain permanently unscopable by human-readable `--project` strings under this decision alone.

**Mitigation:**
- Users who need their own `.pb`/hash-dir content in scoped output can still run an unscoped extraction (no `--project` set) and manually curate, or wait for a future Option-A recovery layer.

---

## Consequences

### Positive
1. Closes the confirmed real contamination vector (93 unfiltered `.pb` files; the `career-prism` leak pattern).
2. Establishes a reusable principle for this codebase: when scoping fails ambiguously, prefer excluding foreign risk over including it, on any future extractor path — not just this one.

### Negative
1. Some of a project's own `.pb` content becomes temporarily invisible to scoped extraction (recoverable in a later, explicitly deferred layer — not a permanent loss of the source data itself, only of that data's visibility to `--project`-scoped runs).

### Neutral
1. Unscoped (`--project` not set) extraction is unaffected by this decision — it already includes everything, as today.

---

## Implementation

**Timeline:** Task 6 of `knowledge/plans/v0.6.17-fix-extract-chat-multiday-bucketing.md`, v0.6.17.

**Affected Components:**
- `core/scripts/extract_gemini.py` — `extract_gemini_pb_sessions()` (currently accepts-but-ignores `project_filter`, `:245-254`); hash-named-dir handling on the `.json`/`.jsonl` paths made explicit rather than incidental.
- `tests/test-extraction-gemini-project-filter.sh` — new assertions for foreign-`.pb` exclusion and hash-dir exclusion, with a visible SKIP (not a silent pass) when `blackboxprotobuf` is unavailable.
- `commands/kmg-extract-chat.md` — documents the resulting `--project` behavior for `.pb` and hash-named directories.
- `knowledge/issues/chat-extraction-reliability-saga/attempts/ENH-044/specification.md` — `.pb` scoping moves from Explicitly-Out-of-Scope into Proposed Behavior.

---

## Validation

**Success Criteria:**
- With `--project=X` set, no `.pb` session that cannot be positively attributed to X appears in output.
- With `--project=X` set, no hash-named-directory session appears in output.
- Every exclusion is accompanied by a visible, counted skip notice — never silent.
- Unscoped extraction (no `--project`) is unaffected.

---

## Related Decisions

- **[[ADR-046 through ADR-061]]** — no directly conflicting prior decision found on Gemini project-scoping specifically; ENH-044's own spec (`bf1cb51c`) established the `.json`/`.jsonl` scoping pattern this ADR extends the *policy* of (fail-closed) to the paths that pattern couldn't reach.

---

**Decision Made:** 2026-07-10
**Last Updated:** 2026-07-10
**Status:** Accepted — implemented (`126d98ce`), tested (`faa393d6`), verified against real data
