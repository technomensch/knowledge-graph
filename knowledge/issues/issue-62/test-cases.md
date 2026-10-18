# issue-62: Test Cases

Run in the `v0.7.11.1-fix-validate-plugin` worktree, with the rewritten `scripts/validate-plugin.sh`.

`git grep` only sees tracked files. A new scratch file must be added with `git add -N <file>` (intent to add) to be seen, and removed afterward with `git rm --cached <file>` and then deleting it. Use your real username where a case says "real username", not the literal text `$USER`.

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Clean tree passes | `bash scripts/validate-plugin.sh` | Exit 0, a pass line |
| 2 | Project name is caught | Create a scratch file containing "enforcement saga", `git add -N` it, run the script | Exit 1, file and line reported |
| 3 | "Shadow Sync:" is allowed | Scratch file with `Shadow Sync: example` | Not reported |
| 4 | "Shadow Sync" at end of line is caught | Scratch file whose line ends with `Shadow Sync` | Reported |
| 5 | Maintainer path is caught | Scratch file with `/Users/<real username>/x` | Exit 1, reported |
| 6 | Path at end of line is caught | Scratch file whose line ends with `/Users/<real username>` | Reported |
| 7 | Placeholder paths are allowed | Scratch file with `/Users/name/x` | Not reported |
| 8 | Untracked files are ignored | Scratch file with a project name, NOT added | Not reported |
| 9 | Stale rules gone | Scratch file (added with `git add -N`) with `#45` and an email | Not reported |
| 10 | Run from a subdirectory | `cd scripts && bash validate-plugin.sh` with a violation planted elsewhere | Violation still reported |
| 11 | `USER` unset | `env -u USER bash scripts/validate-plugin.sh` with the path case planted | Still reported (fallback to `id -un`) |
| 12 | Script ignores itself | Run on a clean tree | The script's own pattern list is not reported |
| 13 | Docs line corrected | Read `docs/reference/hooks.md` near line 76 | Not described as called by installers or commands |
| 14 | Docs build | `npm run build` | Succeeds |
| 15 | Scope decision applied | Per the decision on `knowledge/` | Matches the chosen scope |

Remove every scratch file afterward and confirm `git status --short` shows only intended changes.
