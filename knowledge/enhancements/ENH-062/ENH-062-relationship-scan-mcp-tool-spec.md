---
id: ENH-062
file: relationship-scan-mcp-tool-spec
type: Enhancement
status: proposed
status_category: backlog
github_issue: "#241"
branch: v0.7.11.2-mcp-relationship-scan
created: 2026-10-18
related_adrs: ["[[ADR-059-no-hardcoded-derivable-counts-in-plans|ADR-059]]", "[[ADR-067-mutable-active-switch-vs-context-derived-kg-resolution|ADR-067]]"]
related_enhs: ["[[ENH-062-specification|ENH-062]]"]
related_issues: []
related_lessons: []
related_docs: []
---

# ENH-062 (part): `kg_relationship_scan` MCP tool

**Parent spec:** [[ENH-062-specification|ENH-062]], section "Relationship Scan: Where the Logic Lives". This file is a separate spec inside the same enhancement. It is not a new ENH.

**Status:** built in release v0.7.11 on branch `v0.7.11.2-mcp-relationship-scan` (a child of `v0.7.11-kg-frontmatter-links`). Like the parent, this document's own `status:` stays `proposed` until the maintainer decides the flip.

## Problem

The ENH-062 relationship scan lives in `skills/kmg-paperwork-audit/SKILL.md` Step 7 as a bash block. Platforms that do not run the skill get no scan. The user named Codex and Gemini; whether Codex runs skills was not verified (`.codex-plugin/plugin.json` ships a `skills` folder), so this spec says only "platforms that do not run the skill". The parent spec named an MCP tool as the cross-platform answer and left it as a follow-up; the user pulled it into v0.7.11.

## User decisions (2026-10-18)

| Question | Decision |
|---|---|
| Release | v0.7.11 |
| Branch | Child branch `v0.7.11.2-mcp-relationship-scan` of `v0.7.11-kg-frontmatter-links`, merged back into it by the user |
| Tool shape | Returns structured data (JSON), not the bash text lines |
| Skill | The skill's bash block stays as is; `SKILL.md` is not touched. The tool is for platforms that do not run the skill |
| No graph resolves | The tool returns an error (the `kg_resolve` message, with the `scope:"user"` hint removed); no git-top-level fallback |
| File paths | Each pair includes relative `fileA` / `fileB` paths |
| `hubMax` | Optional parameter, integer 2 to 100, default 4 |
| Bash SIGPIPE bug | Not ported; the tool is correct (see below) |
| `limit` parameter | None. The tool description warns that a large `hubMax` on a large graph can return a very large reply |

## Tool contract

Name `kg_relationship_scan`. Description for agents: "List pairs of issue/enhancement notes that mention the same file but declare no relationship in their frontmatter (ENH-062). Read-only: flags, never edits. Dismissing a pair is not remembered; declare the relationship in either note's frontmatter to silence it. Scans the project graph resolved from the current folder (never the personal graph)." The registered text also warns about large replies at a large `hubMax`.

Input: `{ hubMax?: integer 2..100 }`, default 4. No `scope` parameter; the personal graph is never scanned.

Reply on success (compact JSON in one text block):

```json
{
  "graph": { "name": "...", "path": "..." },
  "scanned": { "issues": 0, "enhancements": 0 },
  "pairCount": 0,
  "pairs": [
    { "a": "ENH-001", "b": "issue-12", "sharedPath": "mcp-server/src/x.ts",
      "fileA": "enhancements/ENH-001/ENH-001-specification.md",
      "fileB": "issues/issue-12/issue-12-description.md" }
  ],
  "warning": "relationship-scan: N pair(s) flagged. Dismissing a pair here does not save anything: ..."
}
```

- `warning` is present only when `pairCount > 0` (same text as the bash stderr line).
- `note` ("nothing to scan") is present instead when neither `issues/` nor `enhancements/` exists.
- `fileA` / `fileB` are paths relative to the graph folder.
- Error (`isError: true`): the `kg_resolve` messages, with the `scope:"user"` hint removed because this tool has no scope parameter.
- The tool never writes to the graph. (Reading the config can migrate a legacy config forward, exactly as `kg_resolve` does; that is existing shared behavior.)

## Behavior ported

The tool reproduces the bash block, including its quirks:

1. Scan every regular file under `<graph>/issues` or `<graph>/enhancements` (recursive, `find -type f` semantics: symlinked files and folders are not followed, hidden folders are scanned) whose name matches `issue-*-description.md` or `ENH-*-specification.md`, whichever of the two folders it sits in. A missing folder is fine; both missing gives an empty result plus the "nothing to scan" note, not an error.
2. Doc id is the leading `issue-<digits>` or `ENH-<digits>` of the file name; files without one are skipped. `ENH-062` and `ENH-62` are distinct ids.
3. Paths come from backtick-quoted tokens matching `[A-Za-z0-9_./-]+\.(md|ts|sh|json|ya?ml)`, deduplicated per doc and not normalized (`./b/y.ts` and `b/y.ts` differ).
4. Ignore list (exact full-token match): `README.md`, `CHANGELOG.md`, `package.json`, `CLAUDE.md`, `AGENTS.md`, `knowledge/rules.md`.
5. Bare filenames with no `/` never produce pairs.
6. A path is a hub when more than `hubMax` docs mention it; hubs and single-doc paths produce no pairs. The count is of table rows for the path.
7. Pairs are every two docs with different ids on one path, ordered by C-locale byte order, so a pair is (smaller, larger).
8. One pair is reported once even when it shares several paths; the reported path is the alphabetically first (C-locale) shared path.
9. A pair is dropped when either doc's frontmatter mentions the other's id, using `(^|[^A-Za-z0-9])<id>([^0-9]|$)`. Frontmatter is the lines between a first-line `---` and the next `---`; a file whose first line is not `---` (including CRLF files and files with a byte-order mark) has empty frontmatter; with no closing `---` frontmatter runs to the end of the file. The duplicate pair row is removed before this check.
10. Output is sorted by (a, b) in C-locale byte order.
11. `scanned.issues` / `scanned.enhancements` count files that matched a pattern and yielded a doc id, by the folder they sit in (bash prints no counts, so this is unit-tested, not parity-tested).

## Deliberate differences from the bash

Each was found or verified in the code review and is recorded here, not hidden.

- **No git-top-level fallback.** The skill falls back to the git top level plus `/knowledge` when `kg_resolve` fails. The tool returns the `kg_resolve` error instead: a tool scanning a guessed folder would break the "cwd-resolved graph only" rule.
- **`fileA` / `fileB` added** (relative to the graph folder) so an agent can open each note. The bash prints none.
- **`hubMax` is an input parameter**, integer 2 to 100, instead of the `REL_SCAN_HUB_MAX` environment variable. The bash treats 0 or 1 as "no pairs" and a non-numeric value as a string comparison; the schema rejects such values. The upper bound keeps one call from returning an unbounded list.
- **SIGPIPE bug not ported.** With `set -o pipefail`, `frontmatter | grep -q` can exit early and `awk` gets SIGPIPE once a note's frontmatter is very large, so a pair that is declared on line 2 is flagged anyway. The tool does not have this bug. A fixture records the known divergence. Fixing `SKILL.md` is a separate later change.
- **Notes containing a NUL byte.** The port finds their path tokens; BSD grep prints "Binary file matches", so the bash finds none (GNU grep differs again).
- **A newline or tab in a folder name.** The bash breaks the path; the port handles it correctly.
- **Unreadable note.** Skipped, as in the bash, but still counted in `scanned`.

## Reply size and `hubMax`

No `limit` parameter was added (decided 2026-10-18). Measured once on this repo's real graph, for sizing only (these numbers drift and are not asserted anywhere, ADR-059):

| `hubMax` | Pairs | Reply size (the `pairs` array; the whole reply is about 0.1 KB more) |
|---|---|---|
| 4 (default) | 140 | about 26 KB (about 7.4k tokens) |
| 6 | 288 | about 52 KB |
| 10 | 487 | about 91 KB |
| 20 | 619 | about 114 KB |

MCP hosts cap tool output (Claude Code's default is about 25k tokens), so raise `hubMax` only when needed.

## Tests

- Fixture tests for the library function and tool-level tests (reply shape, `warning` only when pairs exist, `note` when nothing to scan, the error text, schema bounds on `hubMax`). Totals: see the jest run; none are quoted here.
- Parity tests extract the marked block from `skills/kmg-paperwork-audit/SKILL.md`, run it with `bash -s` under both `/bin/bash` and the first `bash` on the PATH, and compare ordered (a, b, path) lists with the tool's output on the fixtures, on this repo's real graph (skipped when `knowledge/` is absent) and with a non-default hub limit. They compare the two outputs against each other and assert no fixed pair count (ADR-059). Of the documented differences, only the SIGPIPE case is asserted by a test (the port must not flag a pair that is declared on line 2 of a very large frontmatter; the bash result is only logged). The NUL-byte and newline/tab folder-name differences are documented, not tested. Out-of-range `hubMax` is rejected by the tool's schema (tool test); at the library level 0 and 1 behave exactly like the bash.

## Risks

- **Two copies of the logic can drift** (bash in the skill, TypeScript in the tool). The parity tests are the guard. The real graph exercises none of the quirks, so the fixtures do the guarding.
- A mismatch is a bug in the port; the tests are not weakened to hide it.
- The child merge changes the parent branch's HEAD, so the session that owns it must re-run its release checks.

## Decisions on the former open points (DECIDED 2026-10-18)

1. **DECIDED.** When no graph resolves the tool returns an error. No git-top-level fallback.
2. **DECIDED.** Each pair includes relative `fileA` / `fileB` paths.
3. **DECIDED.** `hubMax` is an optional parameter, default 4 (range 2 to 100).

## Acceptance criteria

- [x] `kg_relationship_scan` is registered, read-only, and returns the JSON contract above.
- [x] On every fixture and on this repo's real graph, tool output equals the bash block's output (same pairs, same order, same shared path), except the documented differences.
- [x] `SKILL.md`, `scripts/validate-plugin.sh`, `commands/`, `core/default-templates/` are unchanged against the parent branch.
- [x] Typecheck and the full jest run pass (the implementer's run; re-run before commit); `mcp-server/dist` rebuilt.
- [x] Parent spec, CHANGELOG and the non-protected pages that list `kg_*` tools updated.
- [ ] Commit, push, PR and merge: only with the user's explicit yes.

## Related

- [[ENH-062-specification|ENH-062]] parent spec, section "Relationship Scan: Where the Logic Lives" and Known Risks note (c).
