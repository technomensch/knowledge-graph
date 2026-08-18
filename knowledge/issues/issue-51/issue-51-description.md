---
id: issue-51
type: Bug
status: tracked
github-issue: null
branch: none
created: 2026-08-17
related_enhs: ["ENH-052"]
related_issues: ["issue-50"]
---

# issue-51: kg_upgrade Wizard's Hardcoded Category Allow-List Has Drifted From the Tool's Real Schema — Two Categories Unreachable via /kmgraph:kmg-init

## Problem

`commands/kmg-init-shared/kmg-upgrade-inspector.md` — the wizard command that drives
`/kmgraph:kmg-init`'s upgrade flow — hardcodes its own "valid category" list in two places: Step
0's parsing instructions (line 54) and the `kg_upgrade apply` call-construction instructions
later in the file (line 331). Both currently list 6 entries:

```
["directories", "config", "templates", "starter-relocation", "stray-knowledge-dir", "status-schema"]
```

The tool's actual Zod enum (`mcp-server/src/tools/upgrade.ts` line 1392, the `apply` field's
input schema) has 9:

```
["status-schema", "config-location", "directories", "config", "templates", "platform-split", "starter-relocation", "stray-knowledge-dir", "capture-corruption"]
```

`platform-split` is intentionally excluded from the wizard's apply-list by design — confirmed by
reading the file rather than assumed: Step 0 (line 65) routes `platform-split` findings through
`warnings[]` as an advisory note, not an actionable upgrade item, and the apply-construction
section (line 331) explicitly states "Never include `\"version-update\"` or `\"platform-split\"`"
because they'd fail Zod validation on the tool side. That exclusion is documented and deliberate.

The other two missing entries have no such justification: `config-location` and
`capture-corruption` are absent from the wizard's allow-list with no accompanying note anywhere in
the file explaining why.

## Evidence

Step 0's parsing instruction (line 53) is unconditional: "For each entry: add its `description` to
the wizard's pending items display" runs regardless of category. So when a live inspection returns
a `capture-corruption` finding, the wizard displays it to the user as a pending item — e.g. "N
files need repair" — exactly as if it were actionable.

But the category-to-`_mcp_apply[]` mapping at line 54 only recognizes the 6-entry list. Because
`capture-corruption` isn't in it, the wizard can never place it into the
`kg_upgrade apply: [...]` call it builds. The user sees the finding, believes it's something the
wizard will fix, and has no way to act on it through the supported path — the only route today is
a raw, undocumented direct `kg_upgrade apply: ["capture-corruption"]` MCP tool call that bypasses
the wizard entirely.

`config-location` has the identical shape: displayed in the pending list, silently unreachable via
`_mcp_apply[]`. Unlike `capture-corruption`, this gap is not tied to the current issue-46/47/48
work — it predates this session's investigation and has been broken this way since
`config-location` was added to the tool's schema.

## Root Cause

The wizard doc's category list is maintained by hand, copied out of the tool's schema at the time
each was last edited, with nothing keeping the two in sync. This is the same class of drift
issue-50 names as its general pattern: a fix adds a category to `upgrade.ts`, and nobody is
prompted to also update the wizard doc's two hardcoded lists.

## Relationship to ENH-052 and issue-50

Same family as ENH-052's other named instances (issue-13, ENH-042, issue-26, issue-28, issue-49).
issue-50 is the general "nothing checks this needs to happen" gap — no check that a backfix gets a
`kg_upgrade` category, and no check that the category reaches users through the wizard. issue-51
is one concrete, already-live instance of that second half of the gap, independent of whether any
of the 46/47/48 work lands: `config-location` has been broken this way since before this session's
investigation started. See [[ENH-052]] and [[issue-50]] for the general pattern.

## Proposed Fix — Order-Independent By Design

Don't just add the 2 missing categories to the hardcoded list — that only fixes the drift until
the next new category is added, reproducing exactly the gap issue-50 documents. Instead, invert
the wizard's routing logic from an allow-list to a deny-list: change Step 0's instruction from
"only add category X to `_mcp_apply[]` if it's in this fixed set" to "add every category returned
in `upgrades[]` to `_mcp_apply[]`, except categories explicitly known to be inspect-only" —
currently just `version-update` (and `platform-split`, which is already routed separately via
`warnings[]` rather than `upgrades[]`).

This makes the wizard automatically pick up any future category `upgrade.ts` adds — including
whatever the other in-flight work for issue-47/48/49 introduces — with zero additional wiring
step required. It removes the exact recurring failure mode issue-50 documents, and it removes any
ordering dependency between this fix and the other session's in-flight c2/c3/c5/c6 work: whichever
lands first, the deny-list approach keeps working without a follow-up edit to the wizard doc.

## Impact

Any `kg_upgrade` category that isn't one of the original 6 is currently unusable through the only
user-facing entry point most people use (`/kmgraph:kmg-init`). This silently defeats the entire
point of building `capture-corruption` for issue-46 — the backfix exists in `upgrade.ts`, but
almost no real user can reach it through the supported wizard flow.

## Blast Radius

**Single file, two locations:** `commands/kmg-init-shared/kmg-upgrade-inspector.md` only (line 54's
category-mapping instruction, line 331's apply-construction instruction). No changes to
`mcp-server/src/tools/upgrade.ts`, no schema changes, no other command/skill files. This command is
listed PROTECTED in this repo's `CLAUDE.md` (`commands/` — do not modify without explicit
permission), so the fix needs that gate cleared before editing, same as any other `commands/*.md`
change.

Nothing else in the repo reads or depends on the wizard's category list — it's prose consumed only
by an LLM agent executing `/kmgraph:kmg-init` at runtime, not parsed by any script or test. No
`mcp-server/tests/` coverage exists for this doc (it's not code); verification is manual: dry-run
the wizard's Step 0 against a KG that has both a `capture-corruption` and a `config-location`
finding pending, confirm both land in the constructed `apply: [...]` call.

Explicitly **not** affected: c1 (issue-46, in progress), c2/c3 (issue-47/48, not started), c5
(consent gate, not started), c6 (issue-49, not started) — none of them touch this file, and this
fix doesn't touch any file they touch. Genuinely parallel-safe with all of them.

## Spec

1. **Step 0, line 54** — replace the category-in-fixed-list check with: for each entry in
   `upgrades[]`, add its `category` to `_mcp_apply[]` (dedup as today) *unless* `category` is
   `"version-update"` (already excluded, inspect-only) — remove the fixed 6-item membership test
   entirely. Per-category tracking flags (`_mcp_covered_directories`, etc.) stay as-is for the
   categories that already have one; categories without an existing flag (e.g. `capture-corruption`,
   `config-location`) simply don't set one — downstream sections that gate on a specific flag are
   unaffected, since they only check the flags for categories they already know how to skip
   locally.
2. **Line 331 (apply-construction)** — remove the explicit enum note ("`_mcp_apply[]` may only
   contain values from the valid apply enum: ...") and replace with: "`_mcp_apply[]` may contain any
   category returned by `kg_upgrade inspect` except `version-update` and `platform-split` (both
   routed separately, never through `apply`)." This is a prose-only change, no logic beyond what
   Step 0 already computed.
3. No `confirmMigration: true` special-casing changes — that gate is orthogonal (keyed on
   `status-schema` specifically, per line 60's note) and untouched by this fix.
4. Manual verification: run `/kmgraph:kmg-init` against a KG seeded with a doubled-frontmatter file
   (triggers `capture-corruption`) and a legacy `~/.claude/kg-config.json` (triggers
   `config-location`); confirm both appear in the pending list AND both end up in the constructed
   `kg_upgrade apply: [...]` call, without needing this doc's author to have hand-listed either
   category name anywhere.

**Effort:** Small — a same-day, single-file prose edit with a mechanical, well-understood change
(invert allow-list to deny-list). No design decision required; the fix shape is fully specified
above. **Risk:** Low — isolated file, no shared-state contention with any other in-flight
commit-group, manual-only verification but the verification procedure is simple and repeatable.
Fits cleanly inside 7.1.5; does not need its own 7.1.6.

## Reported By

Found live 2026-08-17 while investigating issue-50's root-cause question ("is a fix's
`kg_upgrade` coverage checked/wired anywhere"), by directly reading
`kmg-upgrade-inspector.md`'s routing logic against `upgrade.ts`'s real schema.
