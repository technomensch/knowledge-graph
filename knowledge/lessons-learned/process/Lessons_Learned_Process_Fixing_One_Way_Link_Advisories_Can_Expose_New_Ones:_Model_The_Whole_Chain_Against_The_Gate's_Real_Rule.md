---
title: "Fixing One-Way-Link Advisories Can Expose New Ones: Model the Whole Chain Against the Gate's Real Rule"
created: 2026-10-18T21:09:24.552Z
updated: 2026-10-18T21:09:24.552Z
author: technomensch
git:
  branch: v0.7.11-kg-frontmatter-links
  commit: 85a9d2af63c27794716b4632db64283372c59f28
tags: [pre-push-gate, backlinks, advisory, closure, measurement, v0.7.11]
category: process
---
## Problem

`scripts/pre-push-gate.sh` has a backlink check (about lines 280-305). For every issue or ENH note changed on the branch, it takes each `issue-N` / `ENH-NNN` ID mentioned anywhere in that note and requires the mentioned note to mention the first note's ID somewhere in its text. A miss prints "BACKLINK MISSING: <doc> references <ref>, but <ref>'s own doc doesn't reference back." The changed set comes from the COMMITTED diff against the merge-base with main.

The v0.7.11 branch had 9 such advisories (the ENH-059 and ENH-062 specs mention ENH-010, ENH-042, ENH-052, issue-24, issue-39, issue-46, ENH-025, ENH-035). The obvious fix was one honest "see also" line in each of the eight target notes. That fix created more advisories:

- Editing issue-24 and issue-39 put them in the "changed on this branch" set, so their own references were checked. 4 new advisories (issue-24 to issue-46; issue-39 to issue-18, issue-36, issue-38).
- Fixing those by editing issue-46, issue-18, issue-36 and issue-38 exposed 5 more once committed (issue-18 to ENH-008; issue-38 to ENH-026, ENH-035, issue-31, issue-35).
- Fixing those 5 ended the chain. The gate then reported no backlink advisories. In total 18 older notes got a one-line "see also".

A measurement trap nearly shipped a false "clean". The gate reads only the committed diff, so running it before committing the edits reported 0 advisories, even though the 5 above appeared right after the commit.

## Solution

Model the gate's exact rule in a small script: start from the changed set, add every note that needs a new mention to the set, and repeat until nothing new is needed. That script reproduced the 5 live advisories and predicted the chain would end after exactly 5 more lines and 0 further notes, before anything was committed. Commits: 876e6ecb, 0db2517a, and a rebuilt commit 2d6685f1 (the earlier version of that commit had accidentally included untracked files and was rebuilt before any push).

Takeaways:

1. When a gate checks only changed files, editing a file widens the gate's scope to that file's own references.
2. Measure against the same input the gate uses (the committed diff), not the working tree.
3. Model the closure of required edits first, so you know the size of the job before starting. If it balloons, stop and ask.
4. Each fix should be a truthful one-line relationship, not just an ID dropped in to satisfy the check.
5. Do not trust a first "zero advisories" run done before committing.

## When to apply

- A pre-push or CI check is advisory-only and reads the diff, and fixing its findings means editing other files.
- You are about to bulk-add cross-references, "see also" lines, or backlinks across many notes.
- A check reports 0 findings but you have uncommitted edits it cannot see.

The check is known to be noisy: `knowledge/issues/issue-61/issue-61-description.md` proposes making it read typed relationship fields instead of grepping whole notes.

## Related

- [issue-61 description](../../issues/issue-61/issue-61-description.md)
- [Bulk Frontmatter Strip Over-Reached Into Knowledge Dir](Lessons_Learned_Process_Bulk_Frontmatter_Strip_Over_Reached_Into_Knowledge_Dir_—_Restore_Via_Git_Checkout_Pre_Strip.md) (another bulk-edit lesson on this branch family)

## Context

- Branch: v0.7.11-kg-frontmatter-links
- Commit: 85a9d2af
- Category: process
