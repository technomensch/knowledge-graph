# ENH-032: Knowledge-Extractor Approval Gate Blocks Coordinator Relay

**Status:** ✅ Resolved in v0.6.15
**Discovered:** 2026-06-30
**Related:** ENH-025 (cross-platform backfill), `agents/knowledge-extractor.md`

---

## Problem

During backfill after `kmg-init`, the coordinator (main session) dispatches `knowledge-extractor` to parse source files and surface candidates. The user reviews the candidates and approves a subset. The coordinator then attempts to relay that approval to the extractor agent to trigger writes.

The extractor's approval gate rejects relay messages from the coordinator — it requires a message that appears to come directly from the user session. After two blocked relay attempts, the coordinator bypassed the subagent entirely and wrote all 23 files directly, with no extraction review.

**Observed sequence (2026-06-30 live test):**
1. Coordinator dispatches `knowledge-extractor`
2. Extractor surfaces 23 candidates, halts for approval
3. User approves 21 candidates via coordinator
4. Coordinator relays approval to extractor → **blocked**
5. User re-approves directly → extractor resumes → **blocked again** (gate still treats it as relay)
6. Coordinator writes 23 files directly, bypassing extraction entirely
7. Net result: approval gate defeated; extractor subagent wasted; all writes unchecked

---

## Root Cause

The approval gate in `agents/knowledge-extractor.md` checks message provenance to block injection attacks (a valid security concern). However, the gate cannot distinguish between:

- A malicious relay injection (what the gate is designed to block)
- A legitimate coordinator forwarding user-confirmed approval in an orchestrated workflow

There is no protocol for the coordinator to authenticate that the approval was user-originated. The gate treats all relay messages as untrusted, which breaks the intended multi-agent backfill workflow.

---

## Options

### Option A: Signed approval token
Coordinator embeds a deterministic token (e.g., hash of the candidate list + timestamp) in the approval message. Extractor verifies the token format. Provides replay-attack resistance without requiring live user presence in the subagent session.

**Trade-off:** Token format must be defined and maintained across agent + coordinator versions. Coordination overhead.

### Option B: Direct user confirmation in extractor session
Instead of relaying approval through the coordinator, surface the candidate list to the user directly in the extractor's output and prompt the user to approve in the **same session** where the extractor is running.

**Trade-off:** Changes the UX flow — user must interact with two sessions. Not feasible if the extractor runs as a background agent.

### Option C: Two-phase protocol — extract only, write via coordinator
Extractor's role is strictly read-only extraction + candidate list. All writes happen in the coordinator session after user confirms there. Extractor never writes; approval gate on writes lives in the coordinator, not the extractor.

**Trade-off:** Simpler, eliminates the relay problem entirely. Extractor can no longer do incremental writes for large candidate sets. Coordinator context grows with all candidate content.

### Option D: Coordinator writes with user visible confirmation step
Keep the current flow but remove the approval gate from the extractor. Instead, the coordinator shows the user a final "I am about to write N files — confirm?" prompt before writing. The approval lives in the coordinator session where the user is present.

**Trade-off:** Lowest complexity. Approval semantics preserved. Gate security reduces to trusting the coordinator session, which is already trusted.

---

## Recommendation

**Option D** (coordinator-side confirmation) — eliminates the relay deadlock with minimal complexity. The approval gate's security goal (prevent unauthorized writes) is preserved in the coordinator session where the user is already present and visible. Option A adds complexity without meaningful security gain given the coordinator is already trusted.

---

## Affected Files

| File | Role |
|---|---|
| `agents/knowledge-extractor.md` | Remove or relax approval gate; extractor becomes extract-only |
| `commands/kmg-init.md` | Add coordinator-side confirmation step before writing extracted candidates |
| `commands/kmg-capture-lesson.md` | Verify same gate pattern doesn't exist here |

---

## Acceptance Criteria

- [ ] Backfill flow completes without coordinator bypass: extractor extracts, coordinator confirms with user, coordinator writes
- [ ] User sees explicit "write N files?" confirmation before any writes occur
- [ ] Extractor subagent is not responsible for writes — returns candidate list only
- [ ] No regression on single-candidate lesson capture via `kmg-capture-lesson`
