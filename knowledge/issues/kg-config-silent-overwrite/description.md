# Problem Description (Living Document)

**Created:** 2026-07-10
**Last Updated:** 2026-07-10
**Current Status:** Investigating

---

## Current Understanding

**Root Cause (Current Belief):** Unknown. No hypothesis confirmed yet.

**Confidence Level:** None — pure discovery stage, no root cause investigation performed yet.

**Evidence:** See `README.md`'s "Evidence Gathered So Far" section (kept in one place to avoid duplication while this issue is young).

---

## Problem Statement

**Symptom:**
`~/.claude/kg-config.json` — the single global file every kmgraph MCP tool reads to resolve which knowledge graph is "active" — was found on 2026-07-10 to contain only one registered graph (`test-kg`, a temp scratch path with placeholder timestamps), when the user reports multiple real graphs (including this project) were previously registered and working.

**Impact:**
- Silent: no error, warning, or user-facing signal that registrations were lost.
- Every `kg_search`/`kg_recall`/`kg_capture` call defaults to whatever `active` points to — with the real registrations gone, these calls were silently operating against a nonexistent/irrelevant temp-path graph instead of the intended one, with no indication of the mismatch.
- Severity is amplified if this is caused by shipped plugin/MCP-server code (not a one-off local event): every user with this plugin installed could be silently affected the same way, with no way to know unless they happen to notice search results are empty/wrong and investigate as deeply as this session did.

**Scope:**
- **Included:** `~/.claude/kg-config.json`'s write paths — anything in the kmgraph plugin, its MCP server, or its test suites that can write to this file.
- **Excluded:** Recovering this user's specific lost registrations (low priority, locally recreatable). The chat-extraction-reliability-saga issue (different subsystem entirely).

---

## Initial Hypothesis

Unconfirmed hypothesis: an MCP kmgraph tool call this session (`kg_fts5_status` or `kg_fts5_rebuild`) triggered the overwrite via a test/fixture code path that fails to sandbox its target file path.

**Tested in:** Not yet tested — this is the first hypothesis to investigate, not yet confirmed or refuted against actual source code.

**Result:** Pending.

---

## Evolution of Understanding

No belief shifts recorded yet — issue just opened.

---

## Current Investigation Focus

**Active Hypotheses:**
1. A test harness (in this repo, the kmgraph plugin repo, or its MCP server) writes a `test-kg`-named fixture to the real `~/.claude/kg-config.json` path instead of an isolated temp config — primary hypothesis to check first, since the surviving entry is literally named `test-kg`.
2. An MCP tool call made during real usage (not a test) has an undocumented side effect of resetting/overwriting the config.
3. Something unrelated to kmgraph entirely.

**Unanswered Questions:**
- Exactly when did the overwrite happen — is there any log narrowing the window earlier than "before 13:14:45 today"?
- Is `test-kg` a name used anywhere in the kmgraph MCP server's own test suite? (If yes, that's strong evidence for hypothesis 1.)
- Does this reproduce on a clean machine / fresh install, or is it specific to this machine's state?

**Blocked Items:**
- None yet — investigation has not started in earnest, this is the initial capture.

---

## Success Criteria

1. Root cause identified and confirmed against actual source code (not inferred from tool descriptions).
2. Determination made: is this a shipped-code bug (affects other users) or a local one-off?
3. If shipped-code bug: a fix landed (proper test isolation / write-guard / backup-before-overwrite) and a determination of whether past users need a remediation notice.
4. This project's KG re-registered via `/kmgraph:kmg-init` only after the above is understood — not before, to avoid destroying evidence or compounding the problem.

**Validation:**
Reproduce the overwrite deliberately in a controlled way (e.g., re-run whatever code path is suspected) and confirm it writes to the real config path; confirm the fix prevents that reproduction.

---

**Update History:**
- 2026-07-10: Issue opened. Discovery documented, no root-cause investigation performed yet.
