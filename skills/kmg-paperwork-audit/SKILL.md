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

**Scope boundary (ENH-052):** this skill covers the two checks `scripts/pre-push-gate.sh` Gate 5 cannot do mechanically — issue/enhancement `status:` accuracy and session-summary currency — plus two exceptions, each a mechanical check with nowhere else to live because the package ships `scripts/` (hooks run them from `${CLAUDE_PLUGIN_ROOT}/scripts/`) but it is not copied into a user's project folder, and `CLAUDE_PLUGIN_ROOT` is not set in the Bash tool, so bash in a skill has to be written inline to work for every user — and this skill ships on the same trigger set every consumer repo gets: Step 5 (issue-45, meta-issue attempts drift) and Step 6 (ENH-052, CHANGELOG-entry currency). Step 7 (ENH-062, undeclared relationships) is a third inline scan for the same reason. It does **not** re-check index counts or backlink symmetry; Gate 5 already covers those cheaply in bash, and duplicating that work here would just be the same fact checked twice by two mechanisms.

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

If `DEFAULT_BRANCH` can't be determined (no `main`/`master` branch found), skip Steps 2-4 (they depend on this diff scope) and proceed to Step 5 — Step 5 scans every meta-issue in the repo directly and needs no diff scope. Step 6's condition (a) doesn't need it either, but condition (b) does (re-derives its own `MERGE_BASE` rather than reusing this step's, since each step typically runs as a separate bash invocation — see Step 6 for why) and is silently skipped without one — report the Steps 2-4 portion (and Step 6's condition (b), if applicable) as skipped with that reason at Step 8. Don't guess a fallback branch.

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

### Step 6 — CHANGELOG-Entry-Currency (ENH-052)

Unlike Steps 1-4, not diff-scoped to the issue/ENH doc paths — this checks `CHANGELOG.md` and
`package.json` directly. Mechanical trigger only, not a verdict: it raises a flag,
this step's own job is to confirm-or-dismiss it, not re-derive judgment from scratch (a checker
that's a flat, unchallengeable assertion just gets skimmed past and ignored — see ENH-052's own
"Design, concretely" section for why Gate 2's version-string check alone didn't stop this
recurring).

Two conditions, either true → flag:

```bash
CURRENT_VERSION=$(node -e "process.stdout.write(require('./package.json').version)" 2>/dev/null)
CHANGELOG_HAS_HEADER=false
if [ -n "$CURRENT_VERSION" ] && grep -qE "^## \[?${CURRENT_VERSION//./\\.}\]?" CHANGELOG.md 2>/dev/null; then
  CHANGELOG_HAS_HEADER=true
fi

# Condition (b) needs DEFAULT_BRANCH/MERGE_BASE. Corrected 2026-09-05 (Opus
# review): originally "any commit landed after CHANGELOG.md's last touch" --
# true on virtually every WIP branch (CHANGELOG is release-only per CLAUDE.md, so a
# mid-branch commit almost always postdates it), which made this condition fire
# on nearly every push regardless of whether anything release-relevant actually
# happened -- exactly the "checker that's a flat, unchallengeable assertion just
# gets skimmed past and ignored" failure mode this step's own design set out to
# avoid. Narrowed to only count once this branch has actually bumped its version
# away from the merge-base's -- the real "in flight toward a release" signal, and
# the actual shape of the incident this step was designed for (a fix landing
# after the version-promote commit but before push, per Gate 2's own header
# comment: "08-04 and 08-19 happened after Gate 2's version-string-presence
# check already existed").
#
# Re-derived here rather than reused from Step 1 (2nd Opus review, 2026-09-05):
# each step's bash block is typically its own invocation/fresh shell, so a bare
# `${MERGE_BASE:-}` left over from Step 1 would silently be empty here almost
# always -- turning condition (b) from "fires on nearly every push" into
# "never fires," the opposite failure mode. Self-contained instead.
DEFAULT_BRANCH=""
for candidate in main master; do
  if git show-ref --verify --quiet "refs/heads/${candidate}" 2>/dev/null; then
    DEFAULT_BRANCH="$candidate"
    break
  fi
done
MERGE_BASE=""
if [ -n "$DEFAULT_BRANCH" ]; then
  MERGE_BASE=$(git merge-base "$DEFAULT_BRANCH" HEAD 2>/dev/null)
fi

MERGE_BASE_VERSION=""
if [ -n "${MERGE_BASE:-}" ]; then
  MERGE_BASE_VERSION=$(git show "${MERGE_BASE}:package.json" 2>/dev/null \
    | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{process.stdout.write(JSON.parse(d).version||'')}catch(e){}})" 2>/dev/null)
fi

CHANGELOG_LAST_COMMIT=$(git log -1 --format=%H -- CHANGELOG.md 2>/dev/null)
COMMITS_AFTER_CHANGELOG=0
if [ -n "$CHANGELOG_LAST_COMMIT" ] && [ -n "$MERGE_BASE_VERSION" ] && [ "$CURRENT_VERSION" != "$MERGE_BASE_VERSION" ]; then
  COMMITS_AFTER_CHANGELOG=$(git log --format=%H "${CHANGELOG_LAST_COMMIT}..HEAD" 2>/dev/null | grep -c .)
fi
```

- (a) `CHANGELOG_HAS_HEADER` is false — no header in `CHANGELOG.md` matches `package.json`'s
  current version. Independent of diff scope, always evaluable.
- (b) `COMMITS_AFTER_CHANGELOG` is greater than 0 — this branch has bumped `package.json`'s
  version away from its merge-base's, **and** commits have landed after `CHANGELOG.md` was
  last touched. Re-derives its own `DEFAULT_BRANCH`/`MERGE_BASE` (doesn't reuse Step 1's —
  see the code comment above); silently skipped if no `main`/`master` branch is found,
  same as Steps 2-4.

If either is true:

> ⚠️ `CHANGELOG.md` may be out of date for v`$CURRENT_VERSION` — no matching version header, or N
> commit(s) landed since it was last touched. Confirm the entry is current before pushing, or
> dismiss if this branch genuinely doesn't need one yet (e.g. mid-branch, not the release commit).

This is advisory and confirm-or-dismiss, same as every other step here — don't auto-write a
CHANGELOG entry. No new skill, no new top-level gate — extends the existing Gate 6
(`pre-push-gate.sh`) completion-flag pattern via Step 8 below, same as Steps 2-5.

### Step 7 — Undeclared relationships (ENH-062)

Flags pairs of issue/ENH docs that reference the same file but declare no relationship in frontmatter. Full-graph scan, not diff-scoped: an undeclared relationship can exist between two docs neither of which changed on this branch.

**1. Find the graph.** Call `kg_resolve` with no arguments; its `path` is the graph folder itself (use it as `KG`). Never pass `scope: "user"` here — this step scans the project's graph, not the personal one. If `kg_resolve` returns an error, or the MCP server is not available, fall back to `$(git rev-parse --show-toplevel)/knowledge`. If that folder does not exist either, skip Step 7 with the reason "no knowledge graph resolved" and report it at Step 8.

**2. Run the scan.** The block below is inline on purpose: `scripts/` is not in the user's project folder and `CLAUDE_PLUGIN_ROOT` is not set in the Bash tool, so a path into `scripts/` would silently skip for every user. Run it as a child shell, so its `exit` cannot end the shell you are working in, with the graph folder in `KG`: `KG="<resolved path>" bash -s <<'SCAN'`, then the block, then `SCAN` on its own line. Optional: `REL_SCAN_HUB_MAX` (default 4).

<!-- relationship-scan:begin -->
```bash
# relationship-scan (ENH-062): flag issue/ENH doc pairs that reference the same file but
# declare no relationship in their frontmatter. Flags only: never edits anything and
# always exits 0 ("trigger, not verdict", ENH-052). Needs KG = the graph folder.
set -uo pipefail
export LC_ALL=C

KG="${KG:-}"
if [ -z "$KG" ] || { [ ! -d "$KG/issues" ] && [ ! -d "$KG/enhancements" ]; }; then
  echo "relationship-scan: the graph at '${KG:-<unset>}' has no issues/ or enhancements/ folder, so there is nothing to scan" >&2
  exit 0
fi
IGNORE_RE='^(README\.md|CHANGELOG\.md|package\.json|CLAUDE\.md|AGENTS\.md|knowledge/rules\.md)$'

id_of() { basename "$1" | grep -oE '^(issue-[0-9]+|ENH-[0-9]+)' | head -1; }

frontmatter() {
  awk 'NR==1 && $0!="---"{exit} NR>1 && $0=="---"{exit} NR>1{print}' "$1"
}

# declared FILE OTHER_ID: true when FILE's frontmatter mentions OTHER_ID
declared() {
  frontmatter "$1" | grep -qE "(^|[^A-Za-z0-9])$2([^0-9]|$)"
}

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

find "$KG/issues" "$KG/enhancements" -type f \( -name 'issue-*-description.md' -o -name 'ENH-*-specification.md' \) 2>/dev/null \
  | sort | while read -r f; do
    id="$(id_of "$f")"
    [ -n "$id" ] || continue
    grep -oE '`[A-Za-z0-9_./-]+\.(md|ts|sh|json|ya?ml)`' "$f" 2>/dev/null | tr -d '`' | sort -u | while read -r p; do
      if [[ "$p" =~ $IGNORE_RE ]]; then continue; fi
      printf '%s\t%s\t%s\n' "$p" "$id" "$f"
    done
  done > "$TMP"

# A path shared by more than HUB_MAX docs is a hub (many docs legitimately touch it),
# and a bare filename with no directory is too generic to identify one file: neither
# says anything about two specific docs being related, so neither produces pairs.
HUB_MAX="${REL_SCAN_HUB_MAX:-4}"

sort -t "$(printf '\t')" -k1,1 -k2,2 "$TMP" | awk -F '\t' -v hub="$HUB_MAX" '
  function flush(   i, j) {
    if (n >= 2 && n <= hub && index(cur, "/") > 0)
      for (i = 1; i <= n; i++) for (j = i + 1; j <= n; j++)
        if (id[i] != id[j]) print id[i] "\t" id[j] "\t" cur "\t" file[i] "\t" file[j]
  }
  { if ($1 != cur) { flush(); n = 0; cur = $1 }
    n++; id[n] = $2; file[n] = $3 }
  END { flush() }
' | sort -u -t "$(printf '\t')" -k1,2 | while IFS="$(printf '\t')" read -r a b p fa fb; do
  if declared "$fa" "$b" || declared "$fb" "$a"; then continue; fi
  echo "UNDECLARED: $a <-> $b (shared: $p)"
done

exit 0
```
<!-- relationship-scan:end -->

It prints one `UNDECLARED: <idA> <-> <idB> (shared: <path>)` line per pair. It ignores bare filenames with no directory and hub paths shared by more than 4 docs, since neither says anything about two specific docs. A graph with no `issues/` and no `enhancements/` folder prints nothing and says so on stderr: skip with that reason.

**3. Present the results.** This step flags; it never edits on its own.

- **About 20 lines or fewer:** present each pair and let the user confirm or dismiss it.
- **More than about 20 lines:** group the lines by the text after `shared:`. Show each group (the file, how many pairs, which docs), and ask one question per group: dismiss the whole group, walk through its pairs, or record the group as backlog. Going through a long list one pair at a time is too much.
- **On confirm:** add the other doc's ID as a quoted wikilink (for example `"[[ENH-042-specification|ENH-042]]"`) to the most fitting list in both docs (`related_to`, `depends_on`, `blocked_by` or `blocking`; create the key if the doc lacks it).
- Report dismissed pairs as dismissed, not as failures. Say plainly that a dismissal is not stored: the same pairs come back on the next audit unless a relationship is declared in either doc's frontmatter.

### Step 8 — Report and write completion flag

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
| No `main`/`master` branch found | Skip Steps 2-4 (need the diff scope), still run Step 5 (no diff scope needed), Step 6 (condition (a) still runs; condition (b) is silently skipped — needs `MERGE_BASE`), Step 7 (relationship scan, no diff scope needed), and Step 8, report the skipped portions with that reason, still write the completion flag (the audit "ran" — it just couldn't determine a diff scope for those portions) |
| `kg_resolve` returns an error and the `$(git rev-parse --show-toplevel)/knowledge` fallback does not exist | Skip Step 7 with "no knowledge graph resolved"; do not fail the audit. |
| The graph has no `issues/` and no `enhancements/` folder | Skip Step 7 with "nothing to scan"; do not fail the audit. |
| More than about 20 flagged pairs (Step 7) | Group by shared file and offer a whole-group dismissal instead of walking through every pair. |
| No issue/ENH docs changed on this branch | Skip Steps 2-3 silently, still run Steps 4-6, still write the flag |
| `status:` field missing or unrecognized value entirely | Skip that doc for Steps 2-3, don't guess an intended status; note it as a separate, smaller finding ("`issue-N` has no recognized `status:` value") |
| Multiple session summaries exist for the same branch | Use the most recently modified one; don't flag older ones as stale duplicates — that's a different concern, not this skill's job |
| Diff is very large (many issue/ENH docs changed, Steps 1-4) | No cap — unlike `kmg-docs-impact-scan`'s 20-identifier cap, this scope is already narrow (only issue/ENH docs, only this branch) and unlikely to be large enough to need one; if it ever is, note the volume to the user rather than silently truncating |
| Many meta-issues exist repo-wide (Step 5) | No cap here either, but a different cost shape than the row above — Step 5 is a full repo-wide scan every run, not diff-scoped, because the drift it looks for can predate the current branch. Cheap at this repo's current meta-issue count; if that stops being true, note the volume rather than silently truncating, same policy as the diff-scoped steps |
| Attempt folder name doesn't start with a zero-padded number (e.g. an enhancement-ID-named folder) | Not paired against a header positionally — reported once per issue as its own finding, folder↔header check skipped for just those folders (see Step 5a) |
| `CHANGELOG.md` missing entirely, or `package.json` version unreadable (Step 6) | Skip the corresponding condition check rather than guessing; if both are unreadable, skip Step 6 silently and note it wasn't checkable rather than flagging a false positive |
