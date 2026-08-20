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
    - knowledge/enhancements/ENH-061/ENH-061-specification.md
tags: [privacy, extraction, gemini, claude, worktree, trust-boundary, v0.6.17, v0.7.1.3]
category: architecture
---

# ADR-062: Gemini .pb / hash-named directory project-scoping fails closed, not open

**Date:** 2026-07-10
**Status:** Accepted
**Implements:** `knowledge/plans/v0.6.17-fix-extract-chat-multiday-bucketing.md` Task 5/6 ([[ENH-044]])

---

## Context

**Problem:** [[ENH-044]]'s `.json`/`.jsonl` Gemini project-scoping fix (`bf1cb51c`) is real and verified working, but it does not cover two structural gaps confirmed against real data on this machine:

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

- **[[ADR-046 through ADR-061]]** — no directly conflicting prior decision found on Gemini project-scoping specifically; [[ENH-044]]'s own spec (`bf1cb51c`) established the `.json`/`.jsonl` scoping pattern this ADR extends the *policy* of (fail-closed) to the paths that pattern couldn't reach.

---

**Decision Made:** 2026-07-10
**Last Updated:** 2026-08-12
**Status:** Accepted — implemented (`126d98ce`), tested (`faa393d6`), verified against real data; regression found and closed 2026-07-11; extended to the Claude extractor 2026-08-12 (see Amendments below)

---

## Amendment — v0.6.18 (2026-07-11)

**Regression found and closed, not a design flaw.** A post-merge review of the merged v0.6.17 diff found that `_filter_project_dirs`'s *implementation* did not actually achieve this ADR's fail-closed decision in one case: the substring match (`matched`) was computed **before** checking which directories were hash-named, so a hex-valued `--project` filter (e.g. `--project=26f8`) could substring-match a hash-named directory and sweep it into `matched` — **included**, the exact fail-*open* outcome this ADR decided against. Additionally, `_HASH_DIR_RE` was lowercase-only, so an uppercase-hex hash dir that didn't happen to substring-match the filter missed both the match check and the hash-exclusion check, and was dropped with **no skip notice** — contradicting this ADR's "never silent" requirement (§ Core Components, item 2).

This is a regression in *implementation ordering*, not a reconsideration of the decision itself — the intended policy (fail closed, never silent) is unchanged; the check order that implemented it was wrong. Fixed by reordering: hash-dir detection now runs first and unconditionally, before any substring match, so a hash dir can never land in `matched` regardless of the filter's value; `_HASH_DIR_RE` broadened to case-insensitive so uppercase-hex dirs are recognized and reported.

**No change to this ADR's Decision, Rationale, or Alternatives sections** — the fail-closed policy stands exactly as decided. This amendment records that a real deviation existed in the shipped code and has been closed, for anyone reading this ADR to understand why "fixed" doesn't mean "never had a bug."

Full detail: `knowledge/issues/chat-extraction-reliability-saga/README.md` § "Post-Merge Regression Findings", finding 3; `attempts/ENH-044/specification.md` item 7.

---

## Amendment — v0.7.1.3 (2026-08-12) — Extended to the Claude extractor

**This ADR's original Scope section explicitly excluded "any change to Claude or
Codex extractors,"** on the stated basis that `extract_claude.py:137-139` "already
scopes correctly" (fragment-matches `project_filter` against `~/.claude/projects/`
directory basenames before globbing). That statement was true for the bug [[ENH-044]]
tested — cross-*project* contamination — but nobody had tested the cross-*worktree*-
of-the-same-project case. A real session (2026-08-12) surfaced it directly.

**New findings (independently reviewed and evidence-verified against real data on
this machine, not assumed):**

1. **The unscoped default is worse than "mixes worktrees."** When `--project` is
   omitted entirely, `extract_claude_sessions()` has no cwd-derived fallback at
   all — it merges sessions from **every project directory on the entire
   machine** into whatever repo's `chat-history/` the command happens to be
   writing to. cwd controls only where output lands, never what gets read in.
2. **Worktree directory naming is not one convention.** Three coexist, confirmed
   live on this machine: `<repo>--claude-worktrees-<name>`, `<repo>--worktrees-
   <name>`, and plain unmarked sibling directories with no indicator at all. Any
   fix based on parsing directory-name conventions would be incomplete from day
   one and silently miss whichever convention it wasn't written for.
3. **A stale worktree project-directory already exists on this machine right
   now** — a since-deleted worktree's `~/.claude/projects/` log directory still
   substring-matches this repo's `--project` filter today. Not a hypothetical
   edge case.
4. **A reliable attribution signal exists that sidesteps all three naming
   conventions: every session `.jsonl` record carries a `cwd` field** (plus a
   richer one-off `worktree-state` record type with explicit
   `worktreePath`/`worktreeName`/`worktreeBranch`). Confirmed present even in the
   *oldest* available session logs for two different projects, not just recent
   sessions — a durable signal, not a going-forward-only fix. Cross-referencing
   `cwd` against a freshly-run `git worktree list --porcelain` (never cached —
   this codebase has already paid down two bugs from trusting a stale pointer
   over live git state: ADR-067/issue-41's `.active`-pointer removal, and
   issue-43/44's `REPO_ROOT` drift in `handoff-file-tracing-gate.sh`) gives
   unambiguous attribution with no directory-name parsing at all.

**Extended decision — the same fail-closed, never-silent principle, applied to
the case this ADR's original scope excluded:**

1. **Fully-unscoped invocation now fails closed, not open — for all three
   sources (`claude`, `gemini`, `codex`, `all`), not just Claude.** The
   "merges everyone's sessions" failure mode is structural to every extractor's
   unscoped path, not unique to Claude's directory layout — Gemini globs all of
   `~/.gemini/tmp/*` unscoped the same way Claude globs all of
   `~/.claude/projects/*`. This supersedes this ADR's original Neutral
   consequence ("Unscoped extraction is unaffected by this decision — it
   already includes everything, as today") for the *gating* question — that
   line was true when written (this ADR's original scope was `.pb`/hash-dir
   exclusion only, not the unscoped path at all) but the new gate applies to
   the shared `run_extraction.py` CLI entry point regardless of `--source`.
   When `--project` is not given, the extractor stops before reading anything,
   states plainly what it's about to do (merge sessions from every project on
   the machine, not just this repo), asks for explicit confirmation to proceed
   anyway, and advises using `--project=<name>` instead. This mirrors this
   ADR's original Option-B rejection (`fails open — a warning is easy to
   miss` — § Alternatives Considered): a notice the user can only see *after*
   the fact was rejected for `.pb`/hash-dirs for the same reason it's rejected
   here — a confirmation gate *before* the read is the fail-closed shape, not a
   warning after.
2. **`--project=<name>` matching 2+ directories (a worktree, or any
   substring-coincidental sibling) does not hard-stop** — the user did explicitly
   scope something, so this is Option-B's "include with a visible notice," not
   full fail-closed exclusion. The extractor proceeds but reports a composition
   breakdown (source attribution, via the `cwd`-field mechanism above) before
   writing, so a silent multi-directory merge is never possible even when
   `--project` is set.
3. **Explicitly deferred, not decided here:** (a) proactive prompts offering to
   also extract a detected-but-uncaptured sibling worktree, or confirming intent
   when cwd is a worktree but the given scope looks like it meant the main repo
   — a real, wanted feature, sequenced as a fast-follow once the attribution
   mechanism above is live and trusted; (b) a persistent extraction-state ledger
   to answer "has this worktree already been captured" — likely unnecessary,
   since existing uuid-dedup (`parse_seen_uuids`, `extract_claude.py:80-117`)
   may already answer this without new state; (c) whether the unscoped-by-default
   *policy* itself should change to repo-scoped-by-default globally, beyond just
   gating the read — a larger behavior change breaking existing bare-invocation
   habits, requiring its own version bump and deliberation if pursued.

**Rationale for extending here rather than a new ADR:** the risk asymmetry this
ADR already established — leaking foreign content into a project's committed,
searchable store is expensive to undo; refusing to run until scope is confirmed
is cheap and reversible (just re-run with the flag) — applies identically to the
Claude case. This is the same decision, not a new one; documenting it as an
amendment keeps the fail-closed philosophy visibly single-sourced across both
extractors rather than two independent-looking decisions that happen to agree.

**Tracked:** [ENH-061](../enhancements/ENH-061/ENH-061-specification.md).

Full evidence trail (real directory listing, real `.jsonl` field confirmation,
full scenario table, rejected design directions): see [[ENH-061]]'s specification.
