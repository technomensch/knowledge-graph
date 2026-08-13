# Test Cases — Issue-45

1. **Missing header, folder exists.** `attempts/015-foo/` exists, no `## Attempt 015` header in
   `implementation-log.md` → check flags it (reproduces the real Attempt-15 case).
2. **Missing folder, header exists.** `## Attempt 009` header exists, no `attempts/009-*/` folder
   → check flags the inverse drift (reproduces the Attempts 002–007 / 009–012 retroactive-scaffold
   pattern before it was fixed).
3. **Matched pair.** Folder and header both exist, numbers agree → no flag.
4. **Oversized README entry.** A `## Attempts` list item exceeds the calibrated threshold →
   flagged with its char count.
5. **Legitimate-size README entry.** An entry at or under ~1,708 chars (prior largest legitimate
   entry) → not flagged.
6. **Non-meta issue.** A plain `knowledge/issues/issue-N/` with no `attempts/` folder → check
   skips it without error (this convention doesn't apply outside meta-issues).
7. **Consumer repo without `pre-push-gate.sh`.** Check still runs and produces correct results in
   a repo that only has the distributed plugin surface (no `scripts/` dir) — the original failure
   mode this issue exists to close.
