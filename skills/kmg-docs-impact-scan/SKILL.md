---
name: kmg-docs-impact-scan
description: Fires on pre-ship signals to scan for docs affected by code changes
---

## When This Applies

Fires on pre-ship signals:
- "push to origin" / "push and merge" / "push and merge with admin"
- "open PR" / "create PR"
- "finishing up" / "ready to push"
- Named as the final task in an implementation plan

Does **not** apply to:
- Mid-session updates for a specific, already-known doc file — use `doc-update-router` for those
- Commits that touch no user-facing code or content

---

## Workflow

### Step 1 — Read git diff

`git diff main...HEAD` is silently empty when `HEAD` equals the default branch (e.g. a pre-branch session, before any commits diverge) — merge-base is `HEAD` itself in that case, and a diff terminating at `HEAD` structurally cannot see the working tree. Resolve the default branch dynamically instead of assuming `main`, and fall back to uncommitted/staged changes on that exact case:

1. Resolve the default branch: try local `main`, then local `master`. If neither resolves, skip identifier extraction and report "docs-impact scan skipped: no local main/master branch found" — do not error.
2. Compute `MERGE_BASE=$(git merge-base "$DEFAULT_BRANCH" HEAD)`. If empty (shallow clone, no common ancestor), skip identifier extraction and report "docs-impact scan skipped: shallow clone, no common ancestor with $DEFAULT_BRANCH" — a distinct message from case 1, since the branch does exist here.
3. If `$MERGE_BASE` equals `$(git rev-parse HEAD)` (HEAD is still on the default branch — no feature branch yet): extract identifiers from `git diff HEAD` (full patch of the actual uncommitted/staged changes, not an empty diff), plus `git status --porcelain` to catch brand-new untracked files the diff cannot see.
4. Otherwise (real feature branch): run `git diff "$MERGE_BASE" HEAD` as before.

Use the **full patch**, not `--name-only` or `--stat`: flag names, feature names, and command names live inside the changed lines, not in the filenames, so a name-only listing cannot yield them. Extract changed identifiers from whichever source above applies: command names, feature names, flag names, skill names. If the diff is very large, cap at 20 identifiers and note the cap to the user.

### Step 2 — Grep scan

Scan the following scope for references to each extracted identifier:
- All `.md` files in project root
- All `.md` files in `docs/` — **excluding** `docs/plans/`, `docs/superpowers/`, `docs/design/`

### Step 3 — Add obvious files

Always add these to the candidate list regardless of grep results (only if the file exists in the project):
- `README.md`
- `INSTALL.md`
- `CHANGELOG.md`
- `COMMAND-GUIDE.md`

### Step 4 — Check KG patterns

Query the active KG for any learned correction patterns matching the changed identifiers (stored as "when [identifier] changes, also check [file]"). Add any matched files to the candidate list.

### Step 5 — Present validation prompt

Show the combined list with source labels before running any updates:

```
Docs likely affected by this change:
✓ README.md (obvious file)
✓ COMMAND-GUIDE.md (matched: "docs-impact-scan")
✓ INSTALL.md (obvious file)
? docs/reference/skills.md (matched: "skills")
+ CONFIGURATION.md (KG pattern: learned from prior release)

Add any missing files, remove any that don't apply, then confirm.
```

Wait for user confirmation before proceeding.

### Step 6 — KG correction capture

For each file the user manually added that the grep scan did not find, offer to save a learned pattern:

> "Should I save a pattern — when [identifier] changes, also check [file]?"

If yes, save to the active KG patterns file:

```
When [identifier] changes, also check [file].
Source: docs-impact-scan correction (YYYY-MM-DD)
```

### Step 7 — Dispatch updates

Call `/kmgraph:kmg-update-doc --user-facing [file]` for each file in the confirmed list, one at a time in sequence.

### Step 8 — Write completion flag and summarize

Write the per-commit docs-impact-scan completion flag before reporting. The pre-push gate (`pre-push-gate.sh` Gate 3) checks this flag to confirm the scan ran at the current commit.

Run these commands (or instruct the user to run `! <cmd>` if Bash is unavailable):

```bash
BRANCH=$(git branch --show-current 2>/dev/null | tr '/' '-')
SHA=$(git rev-parse --short HEAD 2>/dev/null)
if [ -n "$BRANCH" ]; then
  touch "/tmp/kmgraph-docs-scan-${BRANCH}-${SHA}.flag"
else
  touch "/tmp/kmgraph-docs-scan-${SHA}.flag"
fi
```

Flag filename formula: `/tmp/kmgraph-docs-scan-<branch>-<sha>.flag` where `<branch>` is the sanitized branch name (slashes replaced with `-`) and `<sha>` is the short HEAD commit hash. Detached-HEAD fallback: SHA-only flag name. The flag auto-invalidates on every new commit and across branches.

Then report the completed docs:

```
Docs updated (N files):
✓ README.md
✓ COMMAND-GUIDE.md
✓ docs/reference/skills.md

Completion flag written: /tmp/kmgraph-docs-scan-<branch>-<sha>.flag
(Pre-push gate cleared for this commit.)
```

---

## Edge Cases

| Situation | Behavior |
|-----------|----------|
| Diff has no identifiable identifiers | Skip grep scan; present obvious files only; note "no identifiers extracted from diff" |
| No docs reference changed identifiers | Present obvious files only; note "no additional matches found" |
| User removes all files from list | Confirm intentional skip; log "no doc updates made for this release" |
| KG pattern references a file that no longer exists | Skip the file silently; offer to remove the stale pattern from KG |
| Very large diff (>20 identifiers) | Cap extraction at 20; note cap to user before presenting list |
