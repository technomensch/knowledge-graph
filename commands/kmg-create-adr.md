
# Create Architecture Decision Record

**Purpose:** Create a new Architecture Decision Record (ADR) using the knowledge graph resolved from the current directory. Auto-fills git metadata, auto-increments the ADR number, prompts for decision content, and updates the decisions index.

**Version:** 1.0 (Created: 2026-02-20)

**Note:** This command creates Architecture Decision Records. For Lessons Learned, use `/kmgraph:kmg-capture-lesson`. For general documentation, use `/kmgraph:kmg-create-doc`.

---

## Syntax Detection

```
/kmgraph:kmg-create-adr
/kmgraph:kmg-create-adr <title>
```

**Examples:**
- `/kmgraph:kmg-create-adr` → Interactive wizard (all prompts)
- `/kmgraph:kmg-create-adr Use PostgreSQL for primary database` → Pre-fills title from argument

---

## Level Routing Detection

Before any other steps, detect the user's intent for WHERE this ADR should be captured,
directly from their message or an explicit flag — no separate routing skill needed
(`gov-capture-routing`, formerly invoked here, has been retired — see issue-18 — this
detection is now native to how `kg_capture`/`create-adr-agent` already resolve scope):

- Personal/global-KG language ("my personal", "global ADR"), or an explicit `--user`
  flag → `--user` (`create-adr-agent` passes `scope: "user"` to `kg_capture`)
- This-project language, or an explicit `--project` flag → `--project`
- A specific KG named by the user, or `--named=<kg>` → `--named=<kg>` (resolves to
  `targetKg` at the `kg_capture` call)
- Nothing specified, or `--active` → `--active` (default, cwd-derived resolution)
- No `$restore_kg` to resolve — knowledge graphs resolve from context per call, not a
  mutable "active" pointer, so there is nothing to restore after (ADR-067 Phase 6).
- Handle prompts if genuinely needed (named KG not found, no project KG configured) —
  the conflict-resolution flow the retired skill supported for two ambiguous signals in
  one message is not reproduced here; see issue-18's decision record for why this is an
  accepted scope narrowing.

#### Tier resolution

Set `$requested_tier` = `standard-tier`. Invoke `ai-model-tier-resolver` module (`commands/init-shared/ai-model-tier-resolver.md`) with `$requested_tier` and `{KG_PATH}`. On success: pass `--model [$resolved_model]` to the subagent.

---

## Step 0: Resolve Target KG Path

Resolve `{active_kg_path}` according to the flag Level Routing above resolved (issue-41:
this step previously read `.active` directly and ignored routing entirely — a
pre-ADR-067 pattern that also predates Level Routing's own resolution; both are fixed
together here since Step 0's resolution feeds every direct file operation later in this
command, not just the `create-adr-agent` dispatch):

- **`--active` (default):** call `kg_resolve` (no scope — cwd-derived). Take the returned
  `path` as `{active_kg_path}`.
- **`--project`:** same as `--active` — call `kg_resolve` (cwd-derived). `--project` and
  `--active` resolve to the same project graph from this command's cwd-derived context;
  the distinction matters at the `create-adr-agent` dispatch (Phase -1), which targets
  `kg_capture` differently per flag even when the resolved path is identical.
- **`--user`:** call `kg_resolve` with `scope: "user"`. Take the returned `path` as
  `{active_kg_path}`.
- **`--named=<kg>`:** look up `graphs["<kg>"].path` directly from
  `~/.kmgraph/kg-config.json` (a keyed lookup by the name the user gave — not the
  retired mutable-pointer pattern). Take that as `{active_kg_path}`.

If resolution errors (no graph registered for this directory, or the named graph doesn't
exist), stop and report the error rather than falling through to an undefined path.

**Decisions directory:** `{active_kg_path}/decisions/`

If the decisions directory does not exist, create it:
```bash
mkdir -p {active_kg_path}/decisions/
```

---

## Project KG Guardrail

There is no separate guard needed here (issue-41: this section previously compared a
stale `.active`-derived pointer against the project's own KG and prompted on mismatch —
a pre-ADR-067 pattern). In the default (`--active`) case, Step 0 above already resolves
`{active_kg_path}` via cwd-derived resolution, which by construction finds this
project's own KG — there is nothing left to disagree with. When `--user`/`--named=<kg>`
is explicitly passed, the user has already stated their intended target; no guard
applies.

---

## Snapshot Gate

*Runs before Step 1 — context preservation before the ADR dialog.*

Ask:

> "Before creating the ADR — want to run a session summary first?
> This saves the current session state as a persistent summary and makes the 'why' behind this decision available for the ADR's Context section.
>
> [y] Run session summary   [u] Update existing   [n] Skip   [?] What does this do?"

If `?`: explain that this runs `/kmgraph:kmg-session-summary` in snapshot mode — a lightweight variant that records what was worked on, open plan items, and file changes without requiring a full wrap-up. The result is written to disk and used to enrich the ADR's Context section.

If `y`:
> "Include git history in the session summary? (adds ~5-15 sec)
>
> [y] Yes — include commits   [n] No — conversation + files only"

Invoke `session-summary-agent --snapshot` (with `--git` if yes). When the agent returns, say:

> "Session summary saved — I'll use that to fill in the ADR's context and background."

Then continue to Step 1.

If `u`:
> "Include git history in the updated session summary? (adds ~5-15 sec)
>
> [y] Yes — include commits   [n] No — conversation + files only"

Invoke `session-summary-agent --snapshot --update` (with `--git` if yes). This refreshes the most recent session summary for the current session rather than creating a new one. When the agent returns, say:

> "Session summary updated — I'll use that to fill in the ADR's context and background."

Then continue to Step 1.

If `n`: proceed to Step 1.

---

## Step 1: Auto-Increment ADR Number

**Scan for existing ADRs:**

```bash
ls {active_kg_path}/decisions/ | grep -E '^ADR-[0-9]+'
```

**Parse existing numbers:**
- Extract the numeric portion from each `ADR-NNN-*.md` filename
- Find the highest number (handle gaps in numbering — use highest found, not count)
- Next ADR number = highest + 1
- If no ADRs exist, start at 001

**Format:** Zero-padded to 3 digits: `001`, `002`, `042`, `100`

**Edge cases:**
- Gap in numbering (e.g., 001, 003 exist → next is 004, not 002)
- Single ADR exists → next is its number + 1
- No ADRs exist → start at 001

Do not announce this number to the user — `create-adr-agent` (Phase 1)
independently re-derives it with a cross-branch collision check that can
bump it, and is the number that actually gets used. Announcing here risks
showing the user two different ADR numbers in one run.

---

## Step 2: Auto-Collect Git Metadata

**Collect the following automatically:**

```bash
git config user.name        # author
git config user.email       # email
git rev-parse --abbrev-ref HEAD  # branch
git rev-parse HEAD          # commit (full SHA)
```

**Parse PR and issue numbers from branch name:**
- Branch `feature/123-add-caching` → pr candidate: `123`
- Branch `issue/456-fix-auth` → issue: `456`
- Branch with no numeric prefix → `null`
- Verify PR with: `gh pr list --head $(git rev-parse --abbrev-ref HEAD) --json number --jq '.[0].number'` (if gh CLI available)

**If git is not available:**
- Skip all git metadata fields
- Create frontmatter with title, number, created, status, category only

**Current timestamp:** Use ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`

---

## Step 3: Dispatch to create-adr-agent

Dispatch `create-adr-agent`, passing:
- The level-routing flag resolved above (`--user`, `--project`, `--named=<kg>`, or `--active`)
- `--model [$resolved_model]` (from Tier resolution above)
- The title argument, if one was given on the command line (the agent's
  Phase 3 pre-fills its first wizard question from it and confirms rather
  than prompting fresh — see `agents/create-adr-agent.md:150`)

Do not pass a context payload (no `context_provided`). The agent runs its own
full interactive wizard (Phase 3, 9 questions including "Implementation
Commit") directly with the user, resolves its own ADR numbering (Phase 1,
with cross-branch collision check) and git metadata (Phase 2), writes the
file via `kg_capture` (Phase 5), updates the decisions index (Phase 6), and
commits (Phase 7). All user interaction — wizard questions and the
pre-write confirmation summary (Phase 4) — happens directly through the
agent.

This command's role ends at dispatch. Do not re-implement the wizard,
filename generation, file write, index update, or commit here.

---

## Example Invocation

**User types:** `/kmgraph:kmg-create-adr`

**Assistant responds:**

```
Creating new Architecture Decision Record...

Collecting git metadata...
  Author:  Jane Smith <jane@example.com>
  Branch:  feature/add-caching
  Commit:  a1b2c3d

Dispatching to create-adr-agent...
```

Then `create-adr-agent` takes over: it runs its own wizard directly with the
user ("What is the title of this decision?" and on, starting with its own
ADR-number announcement per its cross-branch collision check), shows a
summary for confirmation, writes the file, updates the index, and commits.

---

## Checklist Before Creating ADR

- [ ] Target KG path resolved (via `kg_resolve` or named lookup, per Step 0)
- [ ] Decisions directory exists (created if missing, per Step 0)
- [ ] ADR number auto-incremented correctly (highest existing + 1, per Step 1
      — `create-adr-agent` independently re-verifies this with its own
      cross-branch collision check before writing)
- [ ] Git metadata collected (author, email, branch, commit, per Step 2)
- [ ] `create-adr-agent` dispatched with the resolved level-routing flag and
      `$resolved_model` — no context payload
- [ ] Agent's wizard, draft confirmation, file write, index update, and
      commit completed (verify via the agent's own output, not this command)

---

## Related Commands

- `/kmgraph:kmg-capture-lesson` — Document lessons learned (ADR link offered after capture)
- `/kmgraph:kmg-create-doc` — Scaffold general documentation files
- `/kmgraph:kmg-recall` — Search existing ADRs and lessons
- `/kmgraph:kmg-link-issue` — Link an existing ADR to a GitHub issue

---

**Created:** 2026-02-20
**Version:** 1.0
**Usage:** Type `/kmgraph:kmg-create-adr` to create a new Architecture Decision Record
