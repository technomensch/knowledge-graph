---
id: issue-46
type: Bug
status: in-progress
github-issue: "#226"
branch: v0.7.2-issues-46-51
created: 2026-08-16
---

# Issue 46: Session-summary and ADR captures double-prepend filenames, duplicate frontmatter blocks, and use a filename algorithm the caller can't reproduce

## Summary

Three distinct manifestations of the same architectural flaw: **the MCP capture
layer and its caller agents both independently own something that should have a
single owner.** All three are now live-confirmed on disk in this repo, not
theoretical.

- **A — filename prefix double-prepend** (date/ADR-number)
- **B — duplicated YAML frontmatter block** (whole header, not just a prefix)
- **C — caller's own filename-prediction algorithm silently diverges from
  `deriveFileName()`'s** (`slugify()` strips characters the caller's naive
  template doesn't account for)

A and B independently confirmed via an Opus review pass (2026-08-16) that
validated this issue's original findings against current repo state; C was
found by that same review and was missed by the original investigation
entirely.

### Manifestation A — filename prefix double-prepend

`deriveFileName()` in `mcp-server/src/tools/capture.ts` unconditionally derives and
prepends a prefix onto `metadata.title` for two of four capture types — today's date
for `type: "session"`, an `ADR-{NNN}-` prefix for `type: "adr"`. Two callers already
bake that same prefix into the `title` field they pass to the capture tool, so the
prefix is applied twice. Output filenames land as
`2026-08-16-2026-08-16-main.md` instead of `2026-08-16-main.md`, and (for ADRs)
`ADR-069-adr-069-my-decision.md` instead of `ADR-069-my-decision.md`.

**This is not cosmetic for sessions.** `session-summary-agent.md:122` (`ls …
grep "^${today}-${branch_slug}"`) and `:290` (`find -name
"${today}-${branch_slug}.md"`) can never match an already-doubled filename, so
the agent always concludes no session file exists yet for today
(`{session_file_mode} = new`). But `checkExistingFile()`
(`capture.ts:249-265`) matches on the today's-date prefix alone and *does*
match the doubled file → `kg_capture` returns the `CONFLICT` error
(`capture.ts:447-455`). **The doubled prefix actively breaks the
one-file-per-day session flow**, it doesn't just produce an ugly filename.
Confirmed by 8 doubled-date session files already on disk, including two where
the filename date and title date disagree because capture ran after midnight
(`2026-07-12-2026-07-11-main.md`, `2026-07-18-2026-07-17-main.md`).

**Confirmed live for ADRs, via a broken index link rather than a surviving
filename:** no doubled-prefix ADR *filename* currently exists on disk, but
`knowledge/decisions/README.md` (line 196) links to
`ADR-046-adr-046-introduce-conceptsetup-hybrid-page-type-and-document-how-to-guide-pattern-separately-from-narrative-guides.md`
— the doubled-prefix filename `kg_capture` actually wrote at capture time. The
file was later renamed by hand to
`ADR-046-concept-setup-hybrid-page-type-and-how-to-guide-pattern.md`; the
README index entry was never updated. **A grep for surviving doubled-prefix
filenames will find nothing and wrongly report "clean" — check the README
index links too.**

### Manifestation B — duplicated YAML frontmatter block

`mcp-server/src/tools/capture.ts` does, at **two** separate write sites — the
new-file path (line 474) and the update-in-place path
(lines 429-433) — unconditionally:
```ts
fs.writeFileSync(filePath, generateFrontmatter(request.type, request.metadata) + request.content, "utf-8");
```
`generateFrontmatter()` always builds its own `---\ntitle: ...\n---` block from
`metadata`. If the caller's `content` string *also* already contains its own
hand-written frontmatter block, the result is two stacked `---...---` blocks
in the same file — most YAML parsers only read the first, so the second
becomes stray, unparsed body text carrying a stale/wrong title.

**Confirmed live**, 9 files total:

- **Session:** `knowledge/sessions/2026-08/2026-08-16-main.md` (this issue's
  own snapshot artifact) and `knowledge/sessions/2026-07/2026-07-14-main.md`,
  plus 5 more (see `solution-approach.md` for the full list and per-file field
  conflicts). Two independent content templates in
  `agents/session-summary-agent.md` embed their own frontmatter block: the S4
  snapshot template (lines 169-176) and the Step 6 full-summary template
  (lines 450-457) — both are sent as `content` to `kg_capture` (S5 line 198,
  Step 8 line 600), so both paths produce doubled blocks.
- **ADR:** `knowledge/decisions/ADR-046-concept-setup-hybrid-page-type-and-how-to-guide-pattern.md`
  has two stacked blocks — block 1 is `generateFrontmatter()`'s `adr` branch
  output (`title / status: Proposed / date / deciders / tags`), block 2 is
  `agents/create-adr-agent.md` Phase 5's template (lines 255-274:
  `number / created / status: Accepted / author / email / git / implements /
  related / tags / category`). **This has a real data-integrity consequence:**
  `generateFrontmatter()` hardcodes `status: Proposed` (capture.ts:196)
  regardless of the actual decision status, and since parsers read only block
  1, **ADR-046 currently reads as `Proposed` when its real status is
  `Accepted`.**
  **Correction (found during implementation, 2026-08-17):** `commands/kmg-create-adr.md`
  was originally flagged here as a fourth affected site. Direct inspection
  during implementation found this **incorrect** — that command never calls
  `kg_capture` (confirmed: zero matches for an actual call in the file); it
  computes its own filename and frontmatter+body directly and writes
  standalone, bypassing the MCP capture pipeline entirely. It has neither
  Manifestation A nor B. No fix needed there for this issue. Separately, this
  means two independent, un-synced implementations of ADR creation exist in
  this repo — tracked as its own issue, see [[issue-48]] (or the actual
  number assigned).
- **Lesson (partial):** the `lesson-capture-agent.md` *agent template* itself
  is clean — its Phase 4 content is body-only, confirmed against this
  session's own two lesson captures, which had no embedded frontmatter block.
  But the corpus is not entirely clean: at least one lesson file,
  `knowledge/lessons-learned/debugging/Lessons_Learned_Debugging_Anchor_Path_...md`,
  has two stacked blocks — produced by some other caller (a hand-composed
  direct `kg_capture` call, not this agent). The fix must not assume "the
  agent is clean" implies "the corpus is clean."

### Manifestation C — caller's filename prediction diverges from `deriveFileName()`'s algorithm

`session-summary-agent.md:114-118` computes its own expected filename as
`target_filename="${today}-${branch_slug}.md"` and uses that string to check
whether today's session file already exists (`:122`, and again at `:290`).
But the *actual* filename `kg_capture` will write is computed independently by
`slugify()` (`capture.ts:108-115`), which strips characters (e.g. `.`) that
the agent's naive template does not account for.

**Confirmed live:** for branch `v0.7.0-adr-067-c1`, the agent's own arithmetic
predicts `2026-08-02-v0.7.0-adr-067-c1.md`, but the file `kg_capture` actually
wrote is `knowledge/sessions/2026-08/2026-08-02-2026-08-02-v070-adr-067-c1.md`
— dots stripped, and (compounding with Manifestation A) doubled. Every
version branch in this repo has a dotted name, including this issue's own
branch (`v0.7.2-issues-46-51` — no dots, so not itself
affected, but the pattern generalizes to any dotted branch name, which is most
of this repo's history per `git branch -a`). Same root cause as A and B: two
places compute a filename-relevant value from the same input, using different
algorithms, with nothing enforcing agreement.

## Root Cause

`deriveFileName()` (`mcp-server/src/tools/capture.ts:131-161`):

```ts
if (type === "session") {
  return `${todayIso()}-${slugify(metadata.title)}.md`;   // line 152
}

if (type === "adr") {
  const num = String(adrNumber ?? 1).padStart(3, "0");
  return `ADR-${num}-${slugify(metadata.title)}.md`;       // lines 156-157
}
```

Both branches assume `metadata.title` is the *bare* title, with no prefix. Two
caller agents violate that assumption:

- `agents/session-summary-agent.md` constructs `title` as
  `"[YYYY-MM-DD]-[branch-slug]"` at lines 170, 201, 451, and 603. Line 594
  states the (incorrect) intent explicitly: *"Use `{session_filename}` … as
  the `title` — this ensures the MCP server creates or updates the file as
  `YYYY-MM-DD-{branch-slug}.md`"* — the doc assumes `title` becomes the
  filename verbatim, when `deriveFileName()` re-derives and re-prepends the
  date on top of it.
- `agents/create-adr-agent.md` constructs `title` as `"ADR-{NNN}: {title}"` at
  lines 256 and 286, which `slugify()` turns into `adr-nnn-{title}` — then
  `deriveFileName()` prepends `ADR-{NNN}-` again on top.

The `lesson` type (`capture.ts:136-149`, prefix `Lessons_Learned_`) is **not**
affected by Manifestation A — `agents/lesson-capture-agent.md` passes a bare
topic with no prefix. `scaffold.ts` is also unaffected — `kg_scaffold` takes
an explicit `outputPath` and derives no filename of its own.

## Confirmed Scope

**Manifestation A — filename prefix:**

| Capture type | MCP-side prefix (capture.ts) | Caller bakes same prefix into `title`? | Affected caller sites | Status |
|---|---|---|---|---|
| `session` | `todayIso()` (L152) | Yes | `session-summary-agent.md:170,201,451,594,603` | Confirmed live, 8 doubled-date files, breaks one-file-per-day flow (not cosmetic) |
| `adr` | `ADR-{NNN}-` (L156-157) | Yes | `create-adr-agent.md:256,286` (`commands/kmg-create-adr.md` ruled out — see correction below) | Confirmed live via broken README link, no surviving doubled filename |
| `lesson` | `Lessons_Learned_` (L136-149) | No | clean | Clean |
| default/fallback (L160) | none | n/a | clean | Clean |

**Manifestation B — frontmatter block:**

| Capture type | MCP always prepends `generateFrontmatter()` output? | Caller's `content` also embeds its own frontmatter block? | Status |
|---|---|---|---|
| `session` | Yes, at both write sites (L429-433, L474) | Yes — S4 template (L169-176) and Step 6 template (L450-457), both in `session-summary-agent.md` | Confirmed live, 7 files |
| `adr` | Yes | Yes — `create-adr-agent.md` Phase 5 (L255-274) only (`commands/kmg-create-adr.md` ruled out) | Confirmed live (`ADR-046-...md`), includes wrong `status: Proposed` vs. real `Accepted` |
| `lesson` | Yes | Agent template: No. Corpus: at least 1 file affected via a different (non-agent) caller | Agent clean; corpus not fully clean |

**Manifestation C:**

| Site | Caller's algorithm | MCP's actual algorithm | Status |
|---|---|---|---|
| `session-summary-agent.md:114-118,122,290` | `"${today}-${branch_slug}.md"` (string concat) | `slugify()` (capture.ts:108-115), strips dots and other chars | Confirmed live for dotted branch names, e.g. `2026-08-02-2026-08-02-v070-adr-067-c1.md` |

Confirmed present, unchanged, in every cached plugin version checked
(0.6.20 → 0.7.1.4) — long-standing, not a regression from recent work.

## Backfix Requirement

The fix in `capture.ts` and the agent templates only prevents *new*
corruption. Every existing kmgraph install already has files corrupted by
these bugs (this repo had 16 — 7 doubled-frontmatter merges, 8 filename
de-duplications with one file needing both, 1 broken README link, repaired
by hand during implementation before this could be verified as generally
fixable). **This branch does not ship without a `kg_upgrade` migration that
backfixes other users' already-corrupted files** — see
`solution-approach.md` items 16-17. Without it, only this repo's data gets
fixed; every other install stays silently broken forever.

**Satisfied (2026-08-17, plan Step 15.5):** `kg_upgrade`'s
`"capture-corruption"` category does this. An Opus review of the initial
implementation found the merge/rename logic itself had a live false-positive
data-loss bug (would delete real body content in some files); a follow-up
Fable review found the first fix still had a narrower version of the same
gap. Both fixed — see `implementation-log.md`'s 2026-08-17 entries.

## Test Coverage Gap

`mcp-server/tests/capture.test.ts` exercises `type: "session"` (line ~450-455) and
`type: "adr"` (line ~458-463) only with clean, unprefixed titles
(`"Feature Work"`, `"Use TypeScript"`). No existing test passes a title that
already contains a date or `ADR-NNN` prefix, and no test asserts on frontmatter
block count or filename-algorithm agreement, so the current suite cannot catch
any of the three manifestations. See `knowledge/issues/issue-46/test-cases.md`.

**Closed (2026-08-17, plan Step 11):** all three manifestations now have
regression coverage in `capture.test.ts`, plus `upgrade.test.ts` coverage for
the `capture-corruption` backfix category. Full mcp-server suite: 440/440.

## Related

- `knowledge/decisions/ADR-031-lessons-learned-plural-prefix-naming.md` — governs
  the `lesson` type's prefix; confirms prefixing is intentionally
  `deriveFileName()`'s job, but does not address caller-side duplication. A fix
  here is complementary, not contradictory.
- `commands/kmg-update-issue-plan.md` is **PROTECTED** per `CLAUDE.md` /
  `knowledge/rules.md` — needed for [[issue-47]]'s fix, not this one.
  `commands/kmg-create-adr.md` was originally flagged as PROTECTED-and-needed
  here too; ruled out during implementation (see Manifestation B correction
  above) — it does not call `kg_capture` and has neither manifestation.
- See [[issue-47]] for the related (but separately-scoped) diff-on-main bug found
  in the same investigation session.
- See [[issue-48]] (or actual assigned number) for the dual-ADR-implementation
  drift-risk finding, discovered while ruling out `commands/kmg-create-adr.md`
  above — tracked as its own issue, not part of this one's scope.

## Discovery Context

Found 2026-08-16 while reviewing a session-summary output filename
(`2026-08-16-2026-08-16-main.md`) during spec-drafting, before any feature branch
existed. Confirmed and scoped via an Opus deep-dive subagent
(`agentId: ae187d4f06180abd7`) before filing. Manifestation B initially found via
this issue's own session-summary snapshot; expanded and fully validated (citations,
Manifestation A's ADR-side live confirmation, Manifestation C, and several plan
defects) via a second Opus review pass (`agentId: ab2c94344860e5824`) before
implementation. Full snapshot of the session:
`knowledge/sessions/2026-08/2026-08-16-main.md` (itself one of the affected
artifacts — see Manifestation B).
