# Solution Approach — issue-46

## Contract decision

**Manifestation A (filename prefix):** callers stop baking the prefix in.
`deriveFileName()` keeps sole ownership of prefix generation; caller agents
pass the bare semantic title only (branch-slug for session, decision title for
ADR). Regex-detecting "did the caller already prefix this" in
`deriveFileName()` was considered and rejected — fragile, has to keep pace
with any future prefix-format change, and a title that happens to start with
something date-shaped for unrelated reasons would falsely suppress the real
prefix.

This is already field-validated: while running the mandatory session-summary
snapshot for this issue (2026-08-16), the session-summary-agent subagent
independently chose to pass `metadata.title: "main"` instead of the templated
`"2026-08-16-main"` — explicitly reasoning that the dated form would reproduce
this exact bug — and the resulting file landed correctly as `2026-08-16-main.md`.
This fix makes that structural so every future invocation doesn't depend on
the agent noticing.

**Manifestation B (frontmatter block):** hybrid. Callers stop embedding their
own frontmatter block (primary fix, matches Manifestation A's principle) —
**and** `capture.ts` additionally gets a defensive strip at both write sites:
if `request.content` already starts with a `---`-delimited block, drop it
before concatenating with `generateFrontmatter()`'s output. This is a
deliberate partial departure from "pure callers-only ownership": a
caller-only fix leaves the contract advisory (nothing stops a *future* or
hand-composed `kg_capture` call from reintroducing the bug — which is exactly
how the corpus already has an affected lesson file that no agent template
produced). The defensive strip makes the contract enforced, not just
documented, and retroactively repairs any caller this fix doesn't (or can't)
reach. It does **not** replace fixing the two known agent templates —
`content` should still be sent body-only going forward; the strip is a safety
net, not a substitute.

## Changes required — Manifestation A (filename prefix)

1. **`agents/session-summary-agent.md`** — lines 201, 603 (`metadata.title` passed
   to `kg_capture`): change from `"[YYYY-MM-DD]-[branch-slug]"` to
   `"[branch-slug]"`. Lines 170, 451 (the generated file's own YAML frontmatter
   `title:` field, inside the content templates removed in Manifestation B's
   fix below) go away along with those templates — no separate action needed.
   Line 594's comment is false and must be corrected to describe the real
   mechanism (filename comes from `{today}-{branch_slug}.md` computed
   independently at S1, not from `metadata.title`) — see also Manifestation C
   below, which means even that corrected comment is describing a
   caller-side prediction that can diverge from the real filename.
2. **`agents/create-adr-agent.md`** — lines 256, 286: change `metadata.title` from
   `"ADR-{NNN}: {title}"` to the bare `"{title}"`. Line 256 is inside the
   frontmatter block removed in Manifestation B's fix below (Phase 5,
   lines 255-274) — no separate action needed once that block is removed and
   its fields moved to `metadata`. Line 286 (the `kg_capture` JSON payload) is
   the one that must change directly.
3. ~~`commands/kmg-create-adr.md`~~ — **ruled out during implementation
   (2026-08-17):** this command never calls `kg_capture`; it's a fully
   standalone implementation (own filename generation, own frontmatter/body
   assembly, direct write). It has neither Manifestation A nor B — no fix
   needed here. The resemblance to `create-adr-agent.md`'s template is
   real but irrelevant, since there's no second layer (`capture.ts`) for it
   to double-generate against. See issue-48 (or actual number) for the
   separate finding that these are two un-synced implementations.
4. **`mcp-server/src/tools/capture.ts`** — no prefix-generation code change
   required; `deriveFileName()`'s existing behavior becomes correct once
   callers stop duplicating it. Add a one-line comment above lines 151-153 and
   155-158 stating the contract explicitly ("caller must pass a bare title —
   this function owns all filename prefixing").
5. **Repair the broken README index link:** `knowledge/decisions/README.md:196`
   currently links to the doubled-prefix filename `kg_capture` originally
   wrote for ADR-046 (the file itself was already renamed by hand; the index
   entry wasn't updated). Retarget it to
   `ADR-046-concept-setup-hybrid-page-type-and-how-to-guide-pattern.md`.
6. **Audit README indexes, not just filenames**, for lingering doubled-prefix
   *link targets* — a grep for surviving doubled-prefix filenames on disk
   (as originally planned) would have reported "clean" and missed ADR-046's
   broken link entirely. Check `knowledge/decisions/README.md`,
   `knowledge/sessions/README.md`, and `knowledge/lessons-learned/README.md`.

## Changes required — Manifestation B (duplicated frontmatter block)

Same ownership principle as Manifestation A, applied to the whole frontmatter
block instead of a prefix substring, plus the defensive strip from the
Contract decision above.

7. **`mcp-server/src/tools/capture.ts`** — add the defensive content-strip at
   **both** write sites: the new-file path (~line 474) and the
   update-in-place path (~lines 429-433). Strip a leading `---`-delimited
   block from `request.content` before concatenating with
   `generateFrontmatter()`'s output, regardless of type.
8. **`agents/session-summary-agent.md`** — remove the embedded frontmatter
   block from **both** content templates that get sent to `kg_capture` as
   `content`: the S4 snapshot template (lines ~169-176, sent at S5 line 198)
   and the **Step 6 full-summary template** (lines ~450-457, sent at Step 8
   line 600) — the original pass at this fix named only the S4 template; both
   are independently reachable and both have produced doubled-block files on
   disk (`2026-08-16-main.md` via S4/snapshot, `2026-07-14-main.md` via
   Step 6/full-summary). Content sent to `kg_capture` should start directly at
   the first body heading in both cases.
9. **Metadata plumbing required for the update-in-place path** (this is not
   optional polish — the update path is currently non-functional and this
   fix touches the exact code involved):
   - The update-in-place branch requires `metadata.existingFile`
     (`capture.ts:419`), which `session-summary-agent.md` never sets — it
     instead sends `"version": "append"`
     (S5 line ~211, Step 8 lines ~623-627), a field `generateFrontmatter()`
     only emits for `type: "lesson"` (`capture.ts:185`) and that
     `handleCapture` otherwise ignores. Today, any second same-day session
     capture hits the `CONFLICT` branch (`capture.ts:447-455`) and fails.
   - Add `existingFile: {existing_session_path}` (already computed and stored
     at `session-summary-agent.md:125` / `:297`) to the S5 and Step 8
     `kg_capture` payloads; delete the inert `"version": "append"` line.
   - The update-in-place path is a **full overwrite**
     (`generateFrontmatter() + content`), not an append — so once the
     embedded frontmatter block is removed per item 8, `as_of_commit` and
     `last_updated` are dropped entirely, because `generateFrontmatter()`'s
     `session` branch (capture.ts ~186-193) emits only
     `title/date/branch/commit/tags`. Add `as_of_commit` and `last_updated`
     to `CaptureRequest["metadata"]` (capture.ts:25-38), to the zod schema in
     `registerCaptureTool` (capture.ts:528-551), and emit them from
     `generateFrontmatter()`'s `session` branch.
   - Update the zone table at `session-summary-agent.md:613-621` (the row
     describing the header zone as "overwrite every run") to match the new
     mechanism.
10. **`agents/create-adr-agent.md`** Phase 5 (lines 255-274): remove the
    frontmatter block from the "Full populated ADR markdown" content; pass
    `status`, `number`, `git` (branch/commit/pr/issue), `implements`,
    `related`, `category` through `metadata` instead. Extend
    `generateFrontmatter()`'s `adr` branch (capture.ts 194-201) to emit these
    additional fields, and **fix the `status: Proposed` hardcode to read from
    `metadata.status`** — this is not a cosmetic nice-to-have, it is actively
    producing wrong status metadata on `ADR-046-...md` right now (see
    issue-46-description.md Manifestation B). Add the same fields to the zod
    schema. Confirm with a live ADR capture that no metadata is lost.
11. ~~`commands/kmg-create-adr.md`~~ — ruled out, see item 3 above.
12. **README index display-text regression:** `updateReadmeIndex()`
    (`capture.ts:490`) uses `request.metadata.title` verbatim as the link
    text. After items 1-2/10-11 strip the prefix from `metadata.title`, index
    entries lose their ADR number / date in the display text (e.g.
    `- [My Decision](ADR-069-...)` instead of
    `- [ADR-069: My Decision](...)`). Either accept this and note it as an
    intentional tradeoff, or have `updateReadmeIndex` reconstruct a display
    title from `type` + `adrNumber`/date rather than from raw `metadata.title`.
    Decide before implementing.
13. **Repair the malformed live artifacts** (do this *after* item 9's metadata
    plumbing lands — a hand-merged file is only durable once
    `generateFrontmatter()` can actually emit the fields being preserved;
    otherwise the next capture to that file silently wipes the hand-merge):
    - `knowledge/sessions/2026-08/2026-08-16-main.md` — merge into one block
      using block 1's shape (it matches what `generateFrontmatter()`
      produces, including the fuller tag list) plus `last_updated` from
      block 2. Keep `commit` (block 1) as canonical over `as_of_commit`
      (block 2) since they hold the same value here — but note
      `kmg-paperwork-audit/SKILL.md:61` reads `last_updated`/`as_of_commit`
      for its session-currency check, so whichever name is dropped, confirm
      that skill still has what it needs.
    - `knowledge/sessions/2026-07/2026-07-14-main.md` — same merge, but this
      file has a genuine field *conflict*, not just a superset/subset: block 1
      says `date: 2026-07-15`, block 2 says `date: 2026-07-14` (midnight
      rollover — `generateFrontmatter()` stamps write time via `todayIso()`,
      the agent's own template stamped session time). **Conflict rule: prefer
      the caller-authored value** (block 2's date) since it reflects when the
      session happened, not when the byte write occurred.
    - `knowledge/decisions/ADR-046-concept-setup-hybrid-page-type-and-how-to-guide-pattern.md`
      — merge, preferring block 2's real `status: Accepted` over block 1's
      hardcoded `status: Proposed`, and block 2's richer field set generally
      (`number`, `git`, `implements`, `related`, `category`).
    - Remaining files per the full list in `test-cases.md` / plan Step 4's
      audit — apply the same block-1-shape-plus-caller-authored-conflicts
      rule, one at a time, confirm with user before each edit (existing
      captured knowledge, treat as irreversible-adjacent).
14. **Audit for other pre-existing malformed files** — a naive
    `grep -c '^---$'` over the first N lines over-counts (it also matches body
    horizontal rules); use a precise check instead — file starts with `---`,
    and the line immediately following the first closing `---` is another
    `---`. Scope: `knowledge/sessions/*/*.md`, `knowledge/decisions/*.md`,
    **and `knowledge/lessons-learned/*/*.md`** (the corpus is not fully clean
    — see below).

## Changes required — Manifestation C (filename-prediction algorithm divergence)

15. **`agents/session-summary-agent.md`** (lines 114-118, 122, 290): stop
    predicting the filename with a naive `"${today}-${branch_slug}.md"`
    string concatenation — it silently diverges from `slugify()`
    (capture.ts:108-115) for any branch name containing characters
    `slugify()` strips (confirmed for dots: `v0.7.0-adr-067-c1` →
    `v070-adr-067-c1`). Preferred fix: stop deriving the filename client-side
    entirely; rely on `kg_capture`'s response (`relativePath`) for the
    just-written file, and for the "does today's file already exist" check,
    query by date-prefix pattern match against directory contents rather than
    building an exact expected filename string. If a client-side prediction
    is still needed for some reason, it must call the same `slugify()` rules
    (duplicate the regex exactly, with a comment noting the two must stay in
    sync — acceptable only as a fallback, not the primary approach).

## Backfix for existing users (required before this branch ships)

Fixing `capture.ts` and the agent templates only stops *new* corruption —
every existing install (this repo included, until repaired by hand during
implementation) already has files corrupted by these bugs, and stays broken
forever without a migration. This is not optional polish: shipping the
prospective fix alone silently abandons every user who already hit the bug.

16. **`mcp-server/src/tools/upgrade.ts`** — add a new `kg_upgrade` category,
    `"capture-corruption"`, following this file's existing check/apply
    pattern (`checkStrayKnowledgeDir`/`applyStrayKnowledgeDir` is the closest
    precedent). Scans `sessions/*/*.md`, `decisions/*.md`,
    `lessons-learned/*/*.md` for:
    - Doubled frontmatter blocks (same detection as the manual audit —
      zero-gap `---`/`---`, distinct from a single block followed by a body
      horizontal-rule divider, a real and common false-positive pattern
      found in this repo's own history).
    - Exact-duplicate date/ADR-number filename prefixes.
    - Conservative by construction, matching this file's established
      never-guess-on-a-real-conflict rule (ADR-063/ADR-040): frontmatter
      blocks are merged only when the two blocks don't disagree on any
      field (union merge); a field present in both with different values is
      reported for manual review, never auto-resolved. Same for filenames —
      exact duplicates are stripped automatically; a near-duplicate (two
      different adjacent dates, e.g. a midnight-rollover case) is reported,
      never guessed at.
17. Add regression tests covering: clean merge, clean rename, a genuine
    field conflict (must NOT be touched), a near-doubled filename (must NOT
    be renamed), the false-positive single-block-plus-divider case (must NOT
    be flagged), and idempotency (running apply twice is a no-op the second
    time).

## Test coverage note

No existing test in `capture.test.ts` asserts on the *number* of frontmatter
blocks written, on `content` containing a pre-existing frontmatter block, or
on filename-algorithm agreement between a caller's prediction and
`deriveFileName()`'s actual output — three independent test-coverage gaps.
See `test-cases.md`.

## Linked Knowledge

- Lesson: `knowledge/lessons-learned/patterns/Lessons_Learned_Patterns_Ownership_Of_Derivation_Contract_Violation_Causes_Double_Prefixed_Filenames.md`

## Out of scope

- `scaffold.ts` / `kg_scaffold` — confirmed unaffected, no change needed.
- The `lesson-capture-agent.md` *template* — confirmed clean (body-only
  content). The lesson *corpus* is not fully clean (item 14's audit scope
  includes `lessons-learned/`) but the fix for any found files is the same
  generic repair in item 13/14, not a lesson-agent code change.
