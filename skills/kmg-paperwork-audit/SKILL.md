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

**Scope boundary (ENH-052):** this skill covers the two checks `scripts/pre-push-gate.sh` Gate 5 cannot do mechanically — issue/enhancement `status:` accuracy and session-summary currency — plus one exception (Step 5, issue-45): a mechanical check with nowhere else to live, because `scripts/` is dev-only tooling for this source repo and is never distributed to consumer repos, while this skill ships on the same trigger set every consumer repo gets. It does **not** re-check index counts or backlink symmetry; Gate 5 already covers those cheaply in bash, and duplicating that work here would just be the same fact checked twice by two mechanisms.

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

If `DEFAULT_BRANCH` can't be determined (no `main`/`master` branch found), skip Steps 2-4 (they depend on this diff scope) and proceed to Step 5 — Step 5 scans every meta-issue in the repo directly and needs no diff scope — before reporting the Steps 2-4 portion as skipped with that reason at Step 6. Don't guess a fallback branch.

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

### Step 5 — Meta-issue Attempts paperwork drift (issue-45)

Unlike Steps 1-4, this step is **not diff-scoped** — it scans every meta-issue in
`knowledge/issues/` on every run, because the drift it looks for can predate the current branch
(confirmed: a real meta-issue in this repo had the drift for an unknown period before any audit
caught it). "Meta-issue" here means a directory that has an `attempts/` subdirectory, has `##
Attempt N` headers in its `implementation-log.md`, or both — either signal alone misses a real
failure mode (see the two checks below).

**5a — Folder ↔ log-header invariant.** The convention is: `attempts/NNN-slug/` folders and `##
Attempt NNN` headers in `implementation-log.md` come in matched pairs (this is what
`/kmgraph:kmg-meta-issue --add-attempt` creates atomically). Detect drift between them:

```bash
for issue_dir in knowledge/issues/*/; do
  log="${issue_dir}implementation-log.md"
  has_attempts_dir=false; has_headers=false
  [ -d "${issue_dir}attempts" ] && has_attempts_dir=true
  [ -f "$log" ] && grep -qE '^## Attempt [0-9]' "$log" && has_headers=true
  $has_attempts_dir || $has_headers || continue   # not a meta-issue, skip

  nonconforming=()   # always declared, regardless of which branch below runs

  if $has_attempts_dir && [ ! -f "$log" ]; then
    echo "⚠️ ${issue_dir}: has attempts/ but no implementation-log.md at all"
  fi

  if $has_headers && ! $has_attempts_dir; then
    echo "⚠️ ${issue_dir}: has '## Attempt' headers in implementation-log.md but no attempts/ directory at all"
  fi

  if $has_attempts_dir; then
    while IFS= read -r attempt_dir; do
      name=$(basename "$attempt_dir")
      num=$(echo "$name" | grep -oE '^[0-9]{1,3}')
      if [ -z "$num" ]; then nonconforming+=("$name"); continue; fi
      num_norm=$((10#$num))                       # strip leading zeros for numeric compare
      [ -f "$log" ] && grep -qE "^## Attempt 0*${num_norm}(:| |\$)" "$log" || \
        echo "⚠️ ${attempt_dir}/ has no matching '## Attempt ${num}' header in $log"
    done < <(find "${issue_dir}attempts" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort)
    if [ "${#nonconforming[@]}" -gt 0 ]; then
      echo "⚠️ ${issue_dir}: ${#nonconforming[@]} attempt folder(s) don't follow attempts/NNN-slug/ (${nonconforming[*]}) — folder↔header check skipped for these"
    fi
  fi

  # inverse: header exists, folder missing (skip entirely if this issue had nonconforming folders,
  # since we can't tell which header they'd map to)
  if $has_attempts_dir && [ -f "$log" ] && [ "${#nonconforming[@]}" -eq 0 ]; then
    grep -oE '^## Attempt [0-9]{1,3}' "$log" | grep -oE '[0-9]{1,3}' | while read -r num; do
      num_norm=$((10#$num))
      found=false
      while IFS= read -r candidate; do
        c_num=$(basename "$candidate" | grep -oE '^[0-9]{1,3}')
        [ -n "$c_num" ] && [ "$((10#$c_num))" -eq "$num_norm" ] && found=true
      done < <(find "${issue_dir}attempts" -mindepth 1 -maxdepth 1 -type d -name '*-*' 2>/dev/null)
      $found || echo "⚠️ '## Attempt ${num}' header in $log has no matching attempts/${num}-*/ folder"
    done
  fi
done
```

Non-`NNN-slug` attempt folder names (e.g. an enhancement ID used as the folder name instead of a
zero-padded sequence number) are drift, not an alternate convention — `/kmgraph:kmg-meta-issue
--add-attempt`'s own behavior is the source of truth for the canonical `attempts/[NNN]-[slug]/`
form. Report them once per issue rather than pairing them positionally against headers — a
positional match is not reliable once the sequence is out of order.

**5b — README `## Attempts` entry size guardrail.** The index entries under a meta-issue's `##
Attempts` heading should stay terse — one line pointing at `attempts/NNN-slug/` and
`implementation-log.md` for detail, not the detail itself. Flag any single entry that's grown past
a size that suggests detail leaked into the index:

```bash
THRESHOLD="${THRESHOLD:-2000}"
case "$THRESHOLD" in
  ''|*[!0-9]*) echo "error: THRESHOLD must be a non-negative integer, got '$THRESHOLD'" >&2; exit 1 ;;
esac

for issue_dir in knowledge/issues/*/; do
  readme="${issue_dir}README.md"
  [ -f "$readme" ] || continue

  has_attempts_dir=false; has_headers=false
  [ -d "${issue_dir}attempts" ] && has_attempts_dir=true
  [ -f "${issue_dir}implementation-log.md" ] && grep -qE '^## Attempt [0-9]' "${issue_dir}implementation-log.md" && has_headers=true
  $has_attempts_dir || $has_headers || continue   # meta-issues only, same detection as 5a

  awk -v threshold="$THRESHOLD" -v readme="$readme" '
    { sub(/\r$/, "") }
    function flush_item() {
      if (item_num != "") {
        len = length(item_text)
        if (len > threshold) {
          printf "⚠️ %s: Attempts item %s is %d chars (over %d) — starts near line %d\n", readme, item_num, len, threshold, item_start_line
        }
      }
      item_num = ""; item_text = ""
    }
    /^## Attempts[ \t]*$/ { flush_item(); in_attempts = 1; next }
    in_attempts && /^## / { flush_item(); in_attempts = 0; next }
    in_attempts && /^---[ \t]*$/ { flush_item(); in_attempts = 0; next }
    in_attempts && /^[0-9]+\. / {
      flush_item()
      match($0, /^[0-9]+/)
      item_num = substr($0, RSTART, RLENGTH)
      item_start_line = NR
      item_text = $0
      next
    }
    in_attempts && item_num != "" { item_text = item_text "\n" $0; next }
    END { if (in_attempts) flush_item() }
  ' "$readme"
done
```

`THRESHOLD` is env-overridable; 2,000 chars is a deliberately round default — real bloated entries
run an order of magnitude past any threshold in dispute, so precision here isn't worth
re-litigating case by case. This is advisory, same as every other check in this skill — surface
it, don't auto-trim it; the fix belongs in the same `--add-attempt`/`implementation-log.md`
workflow 5a checks, not in an automated edit to someone's README.

### Step 6 — Report and write completion flag

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
| No `main`/`master` branch found | Skip Steps 2-4 (need the diff scope), still run Step 5 (no diff scope needed) and Step 6, report the Steps 2-4 portion as skipped with that reason, still write the completion flag (the audit "ran" — it just couldn't determine a diff scope for that portion) |
| No issue/ENH docs changed on this branch | Skip Steps 2-3 silently, still run Steps 4-5, still write the flag |
| `status:` field missing or unrecognized value entirely | Skip that doc for Steps 2-3, don't guess an intended status; note it as a separate, smaller finding ("`issue-N` has no recognized `status:` value") |
| Multiple session summaries exist for the same branch | Use the most recently modified one; don't flag older ones as stale duplicates — that's a different concern, not this skill's job |
| Diff is very large (many issue/ENH docs changed, Steps 1-4) | No cap — unlike `kmg-docs-impact-scan`'s 20-identifier cap, this scope is already narrow (only issue/ENH docs, only this branch) and unlikely to be large enough to need one; if it ever is, note the volume to the user rather than silently truncating |
| Many meta-issues exist repo-wide (Step 5) | No cap here either, but a different cost shape than the row above — Step 5 is a full repo-wide scan every run, not diff-scoped, because the drift it looks for can predate the current branch. Cheap at this repo's current meta-issue count; if that stops being true, note the volume rather than silently truncating, same policy as the diff-scoped steps |
| Attempt folder name doesn't start with a zero-padded number (e.g. an enhancement-ID-named folder) | Not paired against a header positionally — reported once per issue as its own finding, folder↔header check skipped for just those folders (see Step 5a) |
