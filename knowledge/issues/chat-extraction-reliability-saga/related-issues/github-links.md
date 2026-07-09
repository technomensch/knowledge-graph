# Related Issues, ENHs & PRs

Links between this meta-issue and the enhancement specs / PRs it tracks.

**Last Updated:** 2026-07-09

---

## Tracking ENH

All six bugs below are tracked under one umbrella: [ENH-038](../../../enhancements/ENH-038/ENH-038-specification.md). Consolidated 2026-07-09 — this saga previously had six separate ENH numbers for one feature area, which the user flagged as working against the repo's own purpose of keeping related content findable in one place. Each bug's full original spec is preserved verbatim, not deleted — only the top-level ENH directory is retired.

## Per-Bug Specs (now under `attempts/`, not `enhancements/`)

### ENH-038: Subagent message loss + Gemini format-drift + Codex audit
- **File:** [../attempts/ENH-038/specification.md](../attempts/ENH-038/specification.md)
- **Relationship:** Origin of the saga. Fixed in v0.6.16.
- **Attempts Referenced:** Attempt 001.

### ENH-043: No rebuild mode; pre-fix files stay corrupted
- **File:** [../attempts/ENH-043/specification.md](../attempts/ENH-043/specification.md)
- **Relationship:** Second defect — incremental-append uuid-dedup permanence prevents re-flattening existing output. `--rebuild` added; real-data repair run (9 recovered / 42 unrecoverable). Same file/subsystem, different root cause from ENH-047.
- **Attempts Referenced:** Attempt 002.

### ENH-044: Gemini `--project` filter silently ignored
- **File:** [../attempts/ENH-044/specification.md](../attempts/ENH-044/specification.md)
- **Relationship:** Cross-project contamination — confirmed real (`career-prism` merged into `knowledge-graph` output). **Implemented & tested** (`bf1cb51c`/`1b2269cf`); spec status/ACs were left stale until 2026-07-09, closeout folded into the ENH-047 fix plan.
- **Attempts Referenced:** Attempt 005.

### ENH-045: Codex incremental mtime-skip bug
- **File:** [../attempts/ENH-045/specification.md](../attempts/ENH-045/specification.md)
- **Relationship:** Same anti-pattern already removed from Claude's extractor, never ported to Codex. Fixed in v0.6.17.
- **Attempts Referenced:** Attempt 006.

### ENH-046: Gemini `.pb` extractor dated sessions by file mtime
- **File:** [../attempts/ENH-046/specification.md](../attempts/ENH-046/specification.md)
- **Relationship:** Sibling — same failure *class* (date-derivation reliability) but in the Gemini extractor. Resolved in v0.6.17.
- **Attempts Referenced:** Attempt 007.

### ENH-047: Multi-day date-bucketing defect (Claude)
- **File:** [../attempts/ENH-047/specification.md](../attempts/ENH-047/specification.md)
- **Relationship:** Newest and most impactful defect in this saga — whole session file dated by its first message. **Unfixed.**
- **Attempts Referenced:** Attempt 004.

## Pre-Existing Specs (Predate This Saga)

### ADR-044: Split oversized daily chat-history files (2026-04-23)
- **File:** [../../../decisions/ADR-044-split-oversized-chat-history-files.md](../../../decisions/ADR-044-split-oversized-chat-history-files.md)
- **Relationship:** Original spec for when/how a daily output file gets split into `-part1.md`/`-part2.md`/… (900 KB / 30,000-line threshold). Not part of this saga's bug list, but every fix here that touches `chat_extractor_base.py`'s output-path/dedup logic must stay compatible with it. ENH-038 found and fixed an incompatibility (dedup scanning only the last split part); ENH-047 (still unfixed) must be verified against a split-day fixture for the same reason.

---

## Pull Requests

### PR #160: v0.6.16 subagent extraction fix
- **URL:** https://github.com/technomensch/knowledge-graph/pull/160 (verify org/repo)
- **ENH:** ENH-038
- **Outcome:** Merged.

---

## Branches

- `v0.6.16-update-claude-extract-chat-for-sub-agents` (merged) — ENH-038.
- `v0.6.17-fix-extract-chat-rebuild` (current) — ENH-043 / ENH-044 / ENH-045 / ENH-046 / ENH-047.

---

## Continuous Tracking

- Update this file when a PR opens for the ENH-047 fix (ENH-044 is already shipped, closeout only).
- Keep the per-bug status table in [ENH-038's spec](../../../enhancements/ENH-038/ENH-038-specification.md) in sync with these files.
