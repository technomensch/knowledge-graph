# Handoff — knowledge-graph — 2026-04-21

## State

| Field | Value |
|---|---|
| Branch | `v0.5.2-beta-phase3-tier-resolver` |
| HEAD | `80e95c34` |
| Plan file | `docs/plans/v0.5.2-beta-phase3-tier-resolver.md` |
| Parent | `main` (post v0.5.1-beta merge) |

---

## What Was Completed This Session

1. **Opus review of Phase 1/2** — found C1/C2/C3/N1/N2/S3 issues
2. **C2 fix:** Removed `model:` from all 8 agent frontmatter files — hardcoded model names override tier resolution (ADR-034/041)
3. **C1 fix:** Replaced Haiku/Sonnet/Opus with tier labels in rules template and AGENTS-template
4. **N1 fix:** Same tier label replacement in AGENTS-template
5. **S3 fix:** Corrected `tier_map[required-tier]` copy-paste error in dispatchers
6. **C3 fix:** Added `profile_schema` version gate to upgrade-inspector section j
7. **N2 fix:** Added Gemini Ultra alias to ADR-041 alias table
8. **Remediation commit:** `49a9b9ec fix(tiers): remediate phase1+2 review findings`
9. **Merged:** PR #98 (phase 2 → v0.5.0-beta), PR #99 (v0.5.0-beta → main)
10. **Phase 3 branch created** from main
11. **Phase 3 plan written** at `~/.claude/plans/v0.5.2-beta-phase3-tier-resolver.md`, copied to `docs/plans/`
12. **User added ADR-042 scope** to plan + `[[hash]]` wiki-link format for `implements` field + backfill task
13. **ADR-042 committed on branch** — Tasks 2.1 and 2.2 done (commits `e0ccfe41` + `80e95c34`)

---

## Phase 3 Remaining Work (in order)

| # | Task | Status | Notes |
|---|---|---|---|
| Task 1 | S2 — add `platforms[]` example to project `me.md` template | Not started | `core/templates/knowledge/templates/project/me.md` |
| Task 2 Steps 2.3–2.7 | Update `create-adr-agent.md` — add question 9 (implements), wire `{$implements_ref}` into Phase 5 frontmatter, back-fill reminder in Phase 6 | Not started | `agents/create-adr-agent.md` |
| Task 2b | Backfill `implements` on ADRs 001–041 with `[[hash]]` wiki-link format | Not started | Run as subagent; approval-gated writes |
| Task 3 | Create `commands/init-shared/ai-model-tier-resolver.md` — alias map (S4) + validation gate (S5) | Not started | New file, full spec in plan |
| Task 4 | Update 4 dispatchers to reference tier-resolver (remove inline duplication) | Not started | `session-summary`, `create-adr`, `capture-lesson`, `sync-all` |
| Task 5 | Amend ADR-041 — mark alias map + validation gate implemented | Not started | Append under Amendments section |
| Task 6 | Push branch + open PR | Not started | Base: `main` |

---

## Key Architectural Rules

- **No `model:` in agent frontmatter** (ADR-034 + ADR-041): Agent files (`agents/*.md`) must NOT have a `model:` field. Dispatchers pass `--model [resolved]` at invocation; frontmatter `model:` silently overrides that, bypassing tier resolution.
- **`implements` uses `[[hash]]` wiki-link format** (ADR-042): Every ADR `implements` field must contain the commit hash in `[[<short-hash>]]` format, e.g., `implements: "[[e0ccfe41]] — docs(adr): create ADR-042"`. Design-first ADRs set `null` and back-fill after the implementation commit lands.

---

## Active PRs

- **Stale PRs to clean up separately:** #95 (dependabot), #90 (v0.3.8), #76 (docs), #73 (v0.3.2), #71 (v0.2.4.1) — pre-v0.5.x, do not merge
- **Open issues:** #47, #46, #41, #39 — not blocking Phase 3
