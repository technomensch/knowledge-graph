---
title: "A Post-Commit Cache-Sync Hook Must Handle Merge Commits and Every Folder It Syncs"
created: 2026-10-18T21:10:36.217Z
updated: 2026-10-18T21:10:36.217Z
author: technomensch
git:
  branch: v0.7.11-kg-frontmatter-links
  commit: 85a9d2af63c27794716b4632db64283372c59f28
tags: [debugging, git-hooks, post-commit, plugin-cache, merge-commits, worktrees, issue-28]
category: debugging
---
## Problem

The project has a local, unversioned git hook, `.git/hooks/post-commit` (see `knowledge/issues/issue-28/issue-28-description.md`). After a commit it runs `scripts/sync-plugin-cache.sh`, which copies `mcp-server/dist`, `scripts`, `skills`, `commands`, `agents` and `hooks/hooks.json` from the working tree into the installed plugin cache (`~/.claude/plugins/cache/<marketplace>/kmgraph/<version>/`). Live sessions load skills, commands and hooks from that cache, not from the repo.

The hook decided whether to sync with:

```bash
git diff-tree --no-commit-id --name-only -r HEAD | grep -qE '^(mcp-server/src/|scripts/|hooks/hooks\.json$)'
```

It failed silently in two ways.

**Gap one, merge commits.** For a merge commit, `git diff-tree` without `-m` prints nothing, so the grep never matched. After two branches were merged (merge commits 8f3aeede and c3231a58), the cache still held an older `scripts/validate-plugin.sh`; `diff -rq scripts <cache>/scripts` showed the difference. On merge commit c3231a58 the old command found 0 matching files; with `-m` it found 4.

**Gap two, folders the sync copies but the trigger ignored.** The trigger list named only `mcp-server/src`, `scripts` and `hooks.json`, although the sync script also copies `skills`, `commands` and `agents`. A commit that changed only `skills/kmg-paperwork-audit/SKILL.md` (commit 04f81906) never synced. The cache copy of that skill differed from the repo until `scripts/sync-plugin-cache.sh` was run by hand. The script's own header comment (from an earlier Opus review) says skills, commands and agents are loaded live from the cache.

## Solution

Two changes to the local hook:

1. Add `-m` to the `git diff-tree` call so merge commits report their changed files.
2. Widen the pattern to `^(mcp-server/src/|mcp-server/dist/|scripts/|skills/|commands/|agents/|hooks/hooks\.json$)`.

Both changes were tested against real commits before and after: detection counts 0 vs 4 on the merge commit, and 1 on the skills-only commit. A backup of the old hook was kept. Afterward, `diff -rq` on all six synced paths came back clean.

## When to apply

- Any hook or script that triggers on "which paths changed in the last commit". Test it against merge commits (`git diff-tree` needs `-m`, or diff against a parent) and against every folder its action touches.
- Keep the trigger list and the action's list in one place, or add a check that they match. Here the sync script knew six paths and the trigger knew three.
- After any merge, verify the synced target with `diff -rq` instead of trusting the hook.
- A silent non-sync gives no warning. The only symptom is a stale copy running in live sessions, so when a live session behaves like old code, compare the cache to the repo first.
- Local unversioned hooks are not in the repo. Note the fix and the backup location so it can be re-applied on another machine. The widened pattern above is the one to re-apply.
- With several git worktrees, the same hook runs from whichever worktree committed and copies THAT worktree into the single shared cache, so the last commit wins. This is safe only if that branch contains everything the others do.

## Related

- `knowledge/issues/issue-28/issue-28-description.md`
- [Plugin Cache Not Synced From Local Repo](Lessons_Learned_Debugging_Plugin_Cache_Not_Synced_From_Local_Repo.md): the manual-copy version of the same two-copies problem
- [Anchor Path-Comparison Scripts to Session cwd ... Git Worktrees Break the Assumption](Lessons_Learned_Debugging_Anchor_Path_Comparison_Scripts_To_Session_Cwd,_Not_A_Fixed_Project_Root_Env_Var_—_Git_Worktrees_Break_The_Assumption.md): other worktree-related breakage

## Context

- Branch: v0.7.11-kg-frontmatter-links
- Commit: 85a9d2af
- Category: debugging
