---
title: 'Lesson: git log origin/* Shows Stale Data Without git fetch'
category:
  uri: uri-that-does-not-map-to-process
---

# Lesson Learned: git log origin/* Shows Stale Data Without git fetch

**Date:** 2026-06-11
**Category:** process
**Version:** 1.0

---

## Problem

When diagnosing whether a PR or branch has been merged to main, running `git log origin/main` or `git log --oneline origin/main` may display stale commit history even after a successful merge. This leads to false conclusions about the state of the remote repository.

**Example:** User ran `git log origin/main` and saw v0.5.10.2 as the latest commit, leading to concern that the v0.5.10.3 PR (#135) had not merged. In reality, both PRs (#134 and #135) were already merged; the local remote-tracking branch was simply out of date.

---

## Root Cause

Git's remote-tracking branches (`origin/main`, `origin/develop`, etc.) are **local caches** of the remote state. They are NOT automatically updated when the remote repository changes. They are only refreshed when:

1. `git fetch` is run
2. `git fetch <remote> <branch>` is run
3. `git pull` is run (which includes `fetch`)

Without an explicit fetch, the local remote-tracking branch reflects the state of the remote at the **last fetch time**, not the current state.

---

## Diagnosis Pattern

**Symptom:** `git log origin/main` shows a different history than expected, or shows outdated commits.

**Verification Steps:**

```bash
# Step 1: Check current remote-tracking state (stale)
git log --oneline origin/main | head -5

# Step 2: Fetch latest from remote
git fetch origin main

# Step 3: Recheck (now current)
git log --oneline origin/main | head -5
```

If Step 1 and Step 3 produce different results, the remote-tracking branch was stale.

---

## Solution

**Always run `git fetch origin <branch>` before diagnosing remote state.**

### For Checking Merge Status

```bash
# WRONG (may show stale data)
git log origin/main

# CORRECT
git fetch origin main
git log origin/main
```

### For Checking Whether a PR is Merged

```bash
# WRONG
git log origin/main | grep "PR title or commit message"

# CORRECT
git fetch origin main
git log origin/main | grep "PR title or commit message"

# BEST (use GitHub API to avoid confusion)
gh pr status
# or
gh pr view <PR_number> --json state
```

---

## Prevention & Best Practices

### For Daily Git Work

1. **Make `git fetch origin` a habit** before running any diagnostic commands
2. **Use `git pull` when appropriate** to fetch + merge in one step
3. **Use GitHub CLI for PR status** (`gh pr view`, `gh pr status`) to avoid confusion with local git state
4. **Document the fetch step** in runbooks and troubleshooting guides

### For Teams

1. **Include `git fetch` in CI/CD before state checks**
2. **Document this in contribution guidelines**
3. **Train new contributors** on the distinction between local and remote-tracking branches
4. **Use GitHub CLI in scripts** instead of parsing `git log` for remote state

---

## Related Concepts

### Local vs Remote-Tracking Branches

- **Local branch** (`main`): Your checked-out copy on disk
- **Remote-tracking branch** (`origin/main`): Local cache of what was on `origin` at last fetch
- **Remote branch** (`upstream/main` on GitHub): The actual current state on the server

### When remote-tracking branches refresh

| Command | Refreshes | Notes |
|---------|-----------|-------|
| `git fetch` | All | Fetches all remotes and all branches |
| `git fetch origin` | `origin/*` | Fetches all branches from origin |
| `git fetch origin main` | `origin/main` | Fetches only main |
| `git pull` | Current branch | Fetches + merges current branch |
| `git status` | ❌ NO | Shows local vs remote-tracking (cached) state |
| `git log origin/main` | ❌ NO | Reads remote-tracking branch (may be stale) |

---

## Test Plan

To verify the stale data behavior:

1. Have a colleague merge a PR to main
2. On your machine, run `git log origin/main` before fetching
3. Note the latest commit
4. Run `git fetch origin main`
5. Run `git log origin/main` again
6. Verify the histories differ (if they merged a PR between steps 2 and 5)

---

## Real-World Impact

In the v0.5.10.3 release cycle, this issue caused:
- Unnecessary concern about PR #135 not merging
- False belief that the release was incomplete
- Time spent investigating false hypothesis

Adding `git fetch` before diagnosing would have immediately clarified the state.

---

## Related Git Concepts

- **Fetch vs Pull:** `fetch` updates remote-tracking branches; `pull` fetches + merges
- **`git status` vs `git fetch`:** `status` shows comparison with cached remote-tracking state, not actual remote
- **GitHub API alternative:** Use `gh pr view` or `gh api repos/.../pulls` for definitive state

---

## See Also

- Git Documentation: [git-fetch(1)](https://git-scm.com/docs/git-fetch)
- Git Documentation: [git-pull(1)](https://git-scm.com/docs/git-pull)
- GitHub CLI: [gh pr view](https://cli.github.com/manual/gh_pr_view)

---

**Version:** 1.0
**Created:** 2026-06-11
**Last Updated:** 2026-06-11
