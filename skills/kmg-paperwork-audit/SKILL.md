---
name: kmg-paperwork-audit
description: Fires on pre-ship signals to check issue/enhancement status accuracy and session-summary currency before push
---

## When This Applies

Fires on the same pre-ship signals as `kmg-docs-impact-scan` — the two are meant to run in the same conversational moment, not be invoked separately by name:
- "push to origin" / "push and merge" / "push and merge with admin"
- "open PR" / "create PR"
- "finishing up" / "ready to push"
- Named as the final task in an implementation plan
- Explicitly: "run the paperwork audit" / "check issue status"

Does **not** apply to:
- Mid-session status updates for a single, already-known issue — just edit its frontmatter directly
- Commits that touch no `knowledge/issues/` or `knowledge/enhancements/` files and don't need a session summary

**Scope boundary (ENH-052):** this skill covers only the two checks `scripts/pre-push-gate.sh` Gate 5 cannot do mechanically — issue/enhancement `status:` accuracy and session-summary currency. It does **not** re-check index counts or backlink symmetry; Gate 5 already covers those cheaply in bash, and duplicating that work here would just be the same fact checked twice by two mechanisms.

---

## Workflow

### Step 1 — Determine the branch's diff scope

Same method Gate 5 uses, so both mechanisms agree on what "this branch's changes" means:

```bash
DEFAULT_BRANCH=""
for candidate in main master; do
  if git show-ref --verify --quiet "refs/heads/${candidate}" 2>/dev/null; then
    DEFAULT_BRANCH="$candidate"
    break
  fi
done
MERGE_BASE=$(git merge-base "$DEFAULT_BRANCH" HEAD 2>/dev/null)
git diff --name-only "$MERGE_BASE" HEAD -- \
  'knowledge/issues/*/issue-*-description.md' \
  'knowledge/enhancements/*/ENH-*-specification.md'
```

If `DEFAULT_BRANCH` can't be determined (no `main`/`master` branch found), skip to Step 5 and report the scan as skipped with that reason — don't guess a fallback branch.

### Step 2 — Check `status: resolved` items for supporting evidence

For each changed/created issue or enhancement doc from Step 1 with `status: resolved` in its frontmatter: read the doc's own "Fix" or equivalent section. Check whether the same branch diff (`git diff "$MERGE_BASE" HEAD --stat`) contains a plausible supporting change — a commit touching the file(s) the doc names as fixed, a new or modified test, or an explicit verification note in the doc itself (test counts, a live-run confirmation, etc.).

This is advisory, not a verdict — the skill cannot know for certain a fix is correct, only whether the doc's own claim is *unsupported by anything visible in the diff*. Flag only the second case:

> ⚠️ `issue-N` claims `status: resolved` but nothing in this branch's diff obviously supports it — no matching file changes, no test reference. Worth a second look before pushing, or confirm the fix landed in an earlier, already-merged commit.

### Step 3 — Check `status: deferred` items for accidental implementation

For each changed/created doc with `status: deferred`: check whether the branch diff contains commits touching the exact file/line the doc names as the deferred fix. If so, the item may have been implemented without updating its own status — a "left stale" case in the opposite direction from Step 2.

> ⚠️ `issue-N` is marked `status: deferred`, but this branch's diff touches the file(s) it names as needing the fix. Confirm this is unrelated, or update the status if it was actually resolved along the way.

### Step 4 — Check session-summary currency

Find the most recent `knowledge/sessions/*.md` file whose name or `continues_from` frontmatter matches the current branch. Compare its last-updated marker (frontmatter `last_updated`/`as_of_commit`, or the most recent narrative entry's date) against the actual latest commit on the branch (`git log -1 --format=%H`).

If the summary's last-known commit is not the branch's actual latest commit, and there's no newer summary file that supersedes it:

> ⚠️ The latest session summary (`knowledge/sessions/<file>.md`) reflects an earlier commit than the branch's current HEAD. N commit(s) have landed since. Update it or confirm it's intentionally left as a mid-session snapshot.

If no session summary exists for this branch at all, do not flag this as an error — not every branch requires one. Note it only if the branch has been running long enough that its absence looks like an oversight (use judgment, don't hardcode a commit-count threshold).

### Step 5 — Report and write completion flag

Present findings the same way `kmg-docs-impact-scan` does — advisory notes for the user to review, never auto-corrections:

```
Paperwork audit:
⚠️  issue-30 claims resolved, no supporting diff evidence found
⚠️  session summary is 4 commits behind HEAD

Review these before pushing, or confirm they're expected.
```

If nothing was found, report that explicitly rather than staying silent — matching Gate 3/`kmg-docs-impact-scan`'s "ran vs. found nothing" distinction:

```
Paperwork audit: ran, no issues found.
```

Then write the completion flag — same naming convention as the docs-impact-scan flag, `docs-scan` swapped for `paperwork-audit`, so Gate 6 in `pre-push-gate.sh` can confirm this ran at the current commit:

```bash
BRANCH=$(git branch --show-current 2>/dev/null | tr '/' '-')
SHA=$(git rev-parse --short HEAD 2>/dev/null)
if [ -n "$BRANCH" ]; then
  touch "/tmp/kmgraph-paperwork-audit-${BRANCH}-${SHA}.flag"
else
  touch "/tmp/kmgraph-paperwork-audit-${SHA}.flag"
fi
```

Flag filename formula: `/tmp/kmgraph-paperwork-audit-<branch>-<sha>.flag`, detached-HEAD fallback SHA-only, same as Gate 3's pattern. Write the flag **regardless of whether findings were reported** — the flag means "the audit ran," not "the audit found nothing."

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| No `main`/`master` branch found | Skip Steps 1-4, report scan skipped with that reason, still write the completion flag (the audit "ran" — it just couldn't determine a diff scope) |
| No issue/ENH docs changed on this branch | Skip Steps 2-3 silently, still run Step 4, still write the flag |
| `status:` field missing or unrecognized value entirely | Skip that doc for Steps 2-3, don't guess an intended status; note it as a separate, smaller finding ("`issue-N` has no recognized `status:` value") |
| Multiple session summaries exist for the same branch | Use the most recently modified one; don't flag older ones as stale duplicates — that's a different concern, not this skill's job |
| Diff is very large (many issue/ENH docs changed) | No cap — unlike `kmg-docs-impact-scan`'s 20-identifier cap, this scope is already narrow (only issue/ENH docs, only this branch) and unlikely to be large enough to need one; if it ever is, note the volume to the user rather than silently truncating |
