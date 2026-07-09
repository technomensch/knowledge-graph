---
title: "ADR-044: Split Oversized Daily Chat History Files for Obsidian Compatibility"
number: 44
created: 2026-04-23T00:00:00Z
status: Accepted
author: technomensch
email: 917847+technomensch@users.noreply.github.com
git:
  branch: v0.5.3-hotfix-extract-chat-history
  commit: a0f1625adaaa9c9f9adaaeec70c37282d5abbc28
  pr: null
  issue: null
implements: null
related:
  adrs: []
  lessons: []
  kg_entries: []
tags: [chat-history, obsidian, extraction, file-splitting]
category: architecture
---

# ADR-044: Split Oversized Daily Chat History Files for Obsidian Compatibility

**Date:** 2026-04-23
**Status:** Accepted
**Implements:** v0.5.3-hotfix-extract-chat-history

---

## Context

**Problem:**
- Obsidian crashes or becomes unresponsive when opening files larger than ~1 MB or ~34,000 lines
- Heavy workdays can produce a single `YYYY-MM-DD-claude.md` or `YYYY-MM-DD-gemini.md` that exceeds both thresholds
- When this happens, that day's chat history is inaccessible in Obsidian without manual intervention

**Scope:**
- In scope: daily output files from `extract_claude.py` and `extract_gemini.py`
- Out of scope: the knowledge graph index files, lesson files, or ADR files (those are short by design)
- Constraint: splitting must not break incremental append behavior or the `get_output_path` lookup contract

---

## Decision

When a daily output file exceeds **900 KB** or **30,000 lines**, automatically split it into numbered part files (`-part1.md`, `-part2.md`, …) inside a `YYYY-MM-DD/` subfolder at the root of `chat-history/`. The original file is deleted after parts are written.

### Core Components

1. **Thresholds:** 900 KB / 30,000 lines — headroom below Obsidian's hard limits (1 MB / 34,000) to prevent boundary oscillation
2. **Split directory:** `chat-history/YYYY-MM-DD/` — visually distinct from the normal `chat-history/YYYY-MM/` monthly folders
3. **Part naming:** `YYYY-MM-DD-claude-part1.md`, `YYYY-MM-DD-claude-part2.md`, etc.
4. **Split boundary:** `### Message N:` / `### Fragment N:` block headers — no message is cut mid-content
5. **`get_output_path` rerouting:** When a `YYYY-MM-DD/` subfolder exists with part files, `get_output_path` returns the last part path transparently — callers need no changes

### Implementation Approach

- `split_file_if_oversized(output_path)` added to `chat_extractor_base.py`
- Called after every write in `extract_claude.py` (both new-file and incremental-append paths) and `extract_gemini.py`
- `get_output_path()` updated with a priority-0 check for existing split subfolders
- Incremental appends target the last part; if the last part grows over the limit after appending, `split_file_if_oversized` creates the next part

---

## Rationale

### Why This Approach

1. **Post-write split:** Writing the full day's content first, then splitting, avoids changing the write logic in both extractors and keeps the split logic in one place (`chat_extractor_base.py`)
2. **Headroom thresholds:** Using 85% of Obsidian's limits (900 KB, 30 K lines) ensures a file that lands right at the boundary does not oscillate between split and unsplit on consecutive runs
3. **YYYY-MM-DD subfolder:** Naming the split folder after the date (rather than nesting inside `YYYY-MM/`) makes split days immediately recognizable in the directory tree and avoids ambiguity with the monthly folders

### Alternatives Considered

**Option A: Single flat file with truncation**
- Pros: Simpler output structure
- Cons: Silently discards messages; unacceptable for a history tool
- Rejected

**Option B: Pre-write splitting (accumulate messages into parts before writing)**
- Pros: Avoids creating an oversized file at all
- Cons: Requires restructuring both extractor's write loops; significantly more invasive
- Rejected in favor of post-write split for this hotfix scope

**Option C: YYYY-MM/YYYY-MM-DD/ nested subfolder**
- Pros: Keeps split days inside the monthly folder
- Cons: Harder to detect in `get_output_path` walk; nested structure less obvious
- Rejected in favor of top-level `YYYY-MM-DD/` naming

### Trade-offs

**Benefits:**
- ✅ Obsidian can open all chat history files on any workday
- ✅ Existing small-day files and directory structure are unaffected
- ✅ `get_output_path` rerouting is transparent to all callers
- ✅ Each part file is a valid standalone markdown document

**Costs:**
- ❌ Split days produce a subfolder instead of a flat file — slightly more complex directory tree
- ❌ "Part N of M" total is not written in headers (M is unknown until all chunks are accumulated)

**Mitigation:**
- Part headers annotated with `— Part N` suffix on the `# Complete Chat Session Export` line
- `get_output_path` handles split detection automatically; no change needed in recall/search integrations

---

## Consequences

### Positive

1. **Obsidian stability:** No crashes on heavy workdays
2. **Zero caller impact:** `get_output_path` reroutes transparently; `/kmgraph:recall` and session summaries require no changes
3. **Self-healing on append:** Incremental appends re-trigger split if the last part grows over the limit

### Negative

1. **Directory structure change on large days:** `YYYY-MM-DD/` subfolder appears instead of a flat file, which may surprise tooling that scans `chat-history/` expecting only files

### Neutral

1. **Part files are independently valid:** Each part carries a full header and can be read in isolation

---

## Implementation

**Timeline:** Implemented in v0.5.3-hotfix-extract-chat-history

**Affected Components:**
- `core/scripts/chat_extractor_base.py` — constants, `get_output_path`, `split_file_if_oversized`
- `core/scripts/extract_claude.py` — import + two call sites
- `core/scripts/extract_gemini.py` — import + one call site
- `commands/extract-chat.md` — Large File Splitting section added

---

## Validation

**Success Criteria:**
- A file exceeding 900 KB or 30,000 lines is split into parts and original is removed
- Normal days (under limits) are unaffected
- Incremental append targets the last part file
- Appending to a part that grows over the limit produces a new part

---

## Related Decisions

- **[[ADR-043-pretooluse-hook-injection-superpowers-rule-enforcement]]:** Hook enforcement context for same branch

## Related Work (Added Later)

- **[Chat-Extraction Reliability Saga](../issues/chat-extraction-reliability-saga/README.md)** (2026-07): this ADR's split-file mechanism (`get_output_path()`, `split_file_if_oversized()`) had to be made compatible with ENH-038's uuid-dedup fix (dedup was scanning only the last split part, not all of them). ENH-047 (multi-day date-bucketing, unfixed as of 2026-07-09) must also be verified against a split-day fixture for the same reason.

---

**Decision Made:** 2026-04-23
**Last Updated:** 2026-04-23
**Status:** Accepted
