---
id: issue-51
type: Bug
status: resolved
github-issue: pending
branch: v0.7.2-issues-46-51
created: 2026-08-17
related_enhs: ["ENH-052"]
related_issues: ["issue-50", "issue-48"]
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

The tool's actual Zod enum (`mcp-server/src/tools/upgrade.ts` line 1424, the `apply` field's
input schema) has 9:

```
["status-schema", "config-location", "directories", "config", "templates", "platform-split", "starter-relocation", "stray-knowledge-dir", "capture-corruption"]
```

`platform-split` is intentionally excluded from the wizard's apply-list by design — confirmed by
reading the file rather than assumed: Step 0 (line 65) routes `platform-split` findings through
`warnings[]` as an advisory note, not an actionable upgrade item, so the wizard's parse loop over
`upgrades[]` never encounters it in the first place. That exclusion is deliberate and structural.

**Correction (2026-08-18):** the apply-construction section (line 331) additionally states "Never
include `\"version-update\"` or `\"platform-split\"` — these will cause Zod validation to reject the
entire call." For `platform-split` that stated reason is **false**: it *is* a member of both the
`ApplyCategory` type (`upgrade.ts:1219`) and the apply Zod enum (`:1424`), so Zod accepts it fine.
Passing it today without `confirm_platform_split: true` silently no-ops with a warning string
(`:1392-1399`) — it does not reject the call. The exclusion is correct; only its justification is
wrong, and the fix restates it structurally rather than behaviorally.

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
in `upgrades[]` to `_mcp_apply[]`, except categories explicitly known not to be apply targets."

**Deny-list (revised 2026-08-18 after Opus review): `version-update` and `resolution` — two
entries, not one.** Both are pushed into `upgrades[]` yet are members of neither the
`ApplyCategory` type (`upgrade.ts:1219`) nor the apply Zod enum (`:1424`):

- `version-update` (`:1202`) — inspect-only version notice.
- `resolution` (`:1291`) — a resolution-failure marker, pushed whenever no KG graph resolves from
  cwd. The original one-item deny-list missed it. Without it, running `/kmgraph:kmg-init` from a
  directory with no resolved graph while `status-schema`/`config-location` findings are pending
  would build `apply: ["status-schema","config-location","resolution"]` — Zod rejects the whole
  call and even the legitimate fixes fail. The old 6-item allow-list filtered it out by omission,
  so the deny-list must now exclude it by name or this fix introduces that regression itself.

**`platform-split` is NOT on the deny-list.** It is excluded *by construction*, not by an explicit
entry: `kg_upgrade inspect` reports it under `warnings[]`, never `upgrades[]` (`:1314-1315`), so
the wizard's loop over `upgrades[]` never encounters it — there is nothing to deny. It is also a
valid apply-enum member, so it would **not** cause a Zod rejection if forced in (see the correction
under Evidence above); the durable reason to exclude it is structural, not behavioral.

This makes the wizard automatically pick up any future category `upgrade.ts` adds *to the apply
enum* — including whatever the other in-flight work for issue-47/48/49 introduces — with zero
additional wiring step required, removing the exact recurring failure mode issue-50 documents.

**Residual coupling to guard:** the deny-list is future-proof only for categories that *are*
apply-enum members. Any future category routed into `upgrades[]` that is *not* an apply-enum member
must be added to the deny-list too, or the wizard builds a call Zod rejects wholesale — issue-50's
drift in reverse. That invariant has already been violated twice (hence both current entries), so
the fix also adds a maintainer-facing comment upstream in `upgrade.ts` at the `resolution` push
site recording the coupling.

Ordering: this fix has **no** dependency on c2/c3/c6, but it must land **after c5** — Step 0's
inversion makes the currently-ungated destructive `capture-corruption` backfix reachable through
the wizard, which is precisely the hazard c5's consent gate closes.

## Impact

Any `kg_upgrade` category that isn't one of the original 6 is currently unusable through the only
user-facing entry point most people use (`/kmgraph:kmg-init`). This silently defeats the entire
point of building `capture-corruption` for issue-46 — the backfix exists in `upgrade.ts`, but
almost no real user can reach it through the supported wizard flow.

## Blast Radius

**Two files, five locations:** `commands/kmg-init-shared/kmg-upgrade-inspector.md` (line 54's
category-mapping instruction; a new `resolution`-exclusion bullet inserted after line 61; line
329's `capture-corruption` consent-bypass wiring, gated on `v0.7.2-c5-update-patch` landing first;
line 331's apply-construction instruction), plus — per Spec item 2b — a comment-only addition in
`mcp-server/src/tools/upgrade.ts` (~line 1290). No behavior or schema changes anywhere, no other
command/skill files. This command is listed PROTECTED in this repo's `CLAUDE.md` (`commands/` — do
not modify without explicit permission), so the fix needs that gate cleared before editing, same as
any other `commands/*.md` change.

Nothing else in the repo reads or depends on the wizard's category list — it's prose consumed only
by an LLM agent executing `/kmgraph:kmg-init` at runtime, not parsed by any script or test. No
`mcp-server/tests/` coverage exists for this doc (it's not code); verification is manual: dry-run
the wizard's Step 0 against a KG that has both a `capture-corruption` and a `config-location`
finding pending, confirm both land in the constructed `apply: [...]` call.

Explicitly **not** affected: c1 (issue-46, in progress), c2/c3 (issue-47/48, not started), c6
(issue-49, not started) — none of them touch this file. **Revised 2026-08-18:** c5 (consent gate)
*is* related on both counts — this fix must land after it (see Proposed Fix, Ordering), and Spec
item 2b adds a comment to `upgrade.ts`, which c5 also edits (textual overlap only, resolved by the
after-c5 ordering).

## Spec

1. **Step 0, line 54** — replace the category-in-fixed-list check with: for each entry in
   `upgrades[]`, add its `category` to `_mcp_apply[]` (dedup as today) *unless* `category` is
   `"version-update"` or `"resolution"` (neither is an apply-enum member) — remove the fixed 6-item
   membership test entirely. `"resolution"` also needs an explicit display-only handling note next
   to line 61's `version-update` note, since the old allow-list excluded it only by omission.
   Per-category tracking flags (`_mcp_covered_directories`, etc.) stay as-is for the
   categories that already have one; categories without an existing flag (e.g. `capture-corruption`,
   `config-location`) simply don't set one — downstream sections that gate on a specific flag are
   unaffected, since they only check the flags for categories they already know how to skip
   locally.
2. **Line 331 (apply-construction)** — remove the explicit enum note ("`_mcp_apply[]` may only
   contain values from the valid apply enum: ...") and replace with: "`_mcp_apply[]` may contain any
   category returned by `kg_upgrade inspect` except `version-update` and `resolution` — neither is
   an apply-enum member, and including either causes Zod to reject the entire call." Note separately
   that `platform-split` IS a valid apply-enum member but is never a candidate here because inspect
   reports it under `warnings[]`, not `upgrades[]`. Do **not** restate the old (false) "platform-split
   causes Zod rejection" reason. This is a prose-only change, no logic beyond what Step 0 already
   computed.
2b. **`mcp-server/src/tools/upgrade.ts` (~line 1290, the `resolution` push)** — add a comment-only
   drift guard telling future maintainers that any new `upgrades[]`-routed category which is not an
   apply-enum member must also be added to the wizard's deny-list. No code, schema, or behavior
   change; commit it with the wizard edits so the invariant and its documentation stay together.
3. No `confirmMigration: true` special-casing changes — that gate is orthogonal (keyed on
   `status-schema` specifically, per line 60's note) and untouched by this fix. Separately, once c5
   lands, `capture-corruption` will require its own consent-bypass flag in the same `apply` call;
   that wiring must be authored against c5's landed parameter name, never against a guess.
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

## Related

- [issue-48](../issue-48/issue-48-description.md) — cites this issue as a case study whose
  backfix (`capture-corruption`) only reached the wizard because this issue's own fix landed;
  without it, `capture-corruption` would join `config-location` on the unreachable side of the
  allow-list drift this issue describes. Backlinked 2026-08-19.
