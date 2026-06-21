---
title: >-
  ENH-028: Mandatory STOP Gate for Existing-KG Branch in kmg-init and
  kmg-init-personal-kg — Prevent Upgrade-Inspector Bypass
---

# ENH-028: Mandatory STOP Gate for Existing-KG Branch in kmg-init

**Status:** ✅ Resolved in v0.6.6
**Priority:** High
**Version Target:** v0.6.6
**Created:** 2026-06-21
**Updated:** 2026-06-21

---

## Problem Statement

When `/kmgraph:kmg-init` (or `kmg-init-personal-kg`) detects an existing knowledge
graph at the target path, the LLM is supposed to:

1. Present a numbered menu (Options 1–4: See What's New, Check for Issues,
   Re-initialize, Cancel)
2. Wait for the user to select an option
3. Call `commands/kmg-init-shared/kmg-upgrade-inspector.md` for Options 1 and 2

In live testing of v0.6.5, LLMs skipped the menu entirely and jumped straight to
the FTS5 rebuild and wiki pass — the upgrade-inspector was never invoked. The user
saw init run as if it were a fresh install, with no upgrade check offered.

---

## Root Cause

The existing-KG branch in `kmg-init.md` is **prose-gated with no hard STOP**. The
flow reads as a conditional paragraph:

> "If a KG is already present at the target path → present the upgrade menu → then
> execute the shared module …"

Because the instruction is embedded in a flowing conditional block — not a hard
execution barrier — LLMs treat it as optional context and skip it when forward
momentum is high (i.e., the user said "init this project"). The line that reads:

> "→ Execute shared module: Read commands/kmg-init-shared/kmg-upgrade-inspector.md
> and follow it exactly"

appears inside the same optional branch, so both the menu and the inspector call
are lost together.

The same structural gap exists in `kmg-init-personal-kg.md`, which mirrors the
init flow for personal KGs.

**This is a protocol compliance failure, not a logic error.** The upgrade-inspector
exists and is correct; the problem is that nothing forces a STOP before setup steps
run.

---

## Proposed Fix

Add a **MANDATORY STOP gate** immediately after the existing-KG detection check in
both init commands. The gate must:

1. **Halt all setup steps** — no file creation, no FTS5 rebuild, no wiki pass, no
   directory scaffolding — until after menu selection.
2. **Use visually prominent framing** (warning callout + all-caps STOP) so the
   instruction is not skimmed as ambient prose.
3. **Name the exact next action** (present the menu) rather than leaving the
   conditional implicit.
4. **Block forward execution explicitly** — the gate text must state that
   initialization steps MUST NOT run until the user selects an option.

### Gate Text (reference wording)

Place this block immediately after the existing-KG detection condition, before any
setup or module calls:

```
⚠️ STOP — EXISTING KG DETECTED

A knowledge graph already exists at {kg_path}.

You MUST present the menu below before proceeding.
Do NOT run any initialization, scaffolding, FTS5, or wiki steps yet.
Wait for the user to select an option.

--- Existing KG Options ---
1. See What's New   — run upgrade inspector (recommended)
2. Check for Issues — run upgrade inspector
3. Re-initialize    — ⚠️ destructive; overwrites existing KG
4. Cancel           — exit without changes

Enter option (1/2/3/4):
```

After user input:
- Options 1 and 2 → Read and execute `commands/kmg-init-shared/kmg-upgrade-inspector.md`
- Option 3 → continue with re-initialization flow (existing behavior)
- Option 4 → exit immediately

### Pattern Precedent

This pattern is already used elsewhere in the KMGraph command set for destructive
or irreversible operations (e.g., archive-before-write gates in the
upgrade-inspector itself). The fix applies the same convention to the existing-KG
detection branch.

---

## Files Affected

| File | Change |
|------|--------|
| `commands/kmg-init.md` | Add STOP gate after existing-KG detection (~line 35–50); rewrite conditional prose as hard barrier |
| `commands/kmg-init-personal-kg.md` | Same change; must stay in parity with `kmg-init.md` per ADR-053 |

No other files require changes. The upgrade-inspector itself (`commands/kmg-init-shared/kmg-upgrade-inspector.md`) is correct and unchanged.

---

## Acceptance Criteria

**Gate presence**
- [x] `kmg-init.md` contains a visually distinct STOP block (warning callout + all-caps keyword) immediately after the existing-KG detection condition
- [x] `kmg-init-personal-kg.md` contains the identical gate (parity with `kmg-init.md`)
- [x] The gate text explicitly states that initialization steps MUST NOT run before menu selection

**Menu behavior**
- [x] Menu presents exactly 4 options: See What's New, Check for Issues, Re-initialize, Cancel
- [x] Options 1 and 2 invoke `commands/kmg-init-shared/kmg-upgrade-inspector.md`
- [x] Option 3 proceeds to re-initialization with appropriate destructive-action warning
- [x] Option 4 exits with no changes

**Upgrade-inspector invocation**
- [x] Smoke test: run `/kmgraph:kmg-init` on an existing KG → menu appears before any setup step runs
- [x] Smoke test: select Option 1 → upgrade-inspector is called and runs to completion
- [x] Smoke test: select Option 4 → no files created or modified
- [x] FTS5 rebuild does NOT run before menu selection on any code path

**Parity**
- [x] `kmg-init-personal-kg.md` gate wording is identical to `kmg-init.md` (no paraphrase drift)
- [x] Both files updated in the same PR; no partial fix ships

**No regressions**
- [x] Fresh-install path (no existing KG) is unaffected — STOP gate is not reached
- [x] Re-initialization path (Option 3) retains existing behavior

---

## Related

- **ENH-022** (v0.6.5 scope addition) — init ↔ kg_upgrade wiring; the upgrade-inspector
  was correctly wired in v0.6.5, but the STOP gate that forces its invocation was not added.
  ENH-028 closes that remaining gap.
- **ADR-053** — `kmg-init-personal-kg.md` must mirror `kmg-init.md`; parity is a
  governance constraint, not a suggestion.
- **v0.6.5 live testing** — revealed the bypass when an existing project KG was
  initialized and the upgrade-inspector was never reached.
- **`commands/kmg-init-shared/kmg-upgrade-inspector.md`** — the module being bypassed;
  no changes required to it.
