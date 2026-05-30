# Solution Approach — Issue-5: `gh issue create` Missing from `start-issue-tracking`

## Strategy

Surgical edit to `commands/start-issue-tracking.md`. Add `gh issue create` as a distinct
sub-step in Step 5, capture the returned issue number, and write it back to the spec
frontmatter. No restructuring of other steps required.

## Implementation

### Step 5.1 (new): Create GitHub Issue

Insert between Step 4 (doc generation) and Step 5.1 (branch creation):

```bash
# Create GitHub issue and capture number
ISSUE_URL=$(gh issue create \
  --title "[Bug] start-issue-tracking: gh issue create never called" \
  --body-file {active_kg_path}/issues/issue-N/issue-N-description.md \
  --label bug \
  --repo {owner}/{repo})

GITHUB_ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oE '[0-9]+$')

# Write back to spec frontmatter
sed -i '' "s/github-issue: null/github-issue: \"#${GITHUB_ISSUE_NUM}\"/" \
  {active_kg_path}/issues/issue-N/issue-N-description.md
```

For enhancements, use `--label enhancement` instead of `--label bug`.

### Step 5 Ordering (revised)

1. Create GitHub issue → capture `#N`
2. Update spec frontmatter with `#N`
3. Create feature branch (existing 5.1)
4. Verify branch (existing 5.2)
5. Create draft PR linking to issue (existing `gh pr create --draft`, add `--body "Closes #N"`)

### Frontmatter write-back

The `github-issue` field must be populated immediately after issue creation, before any
branch or PR steps, so that if the workflow is interrupted the mapping is not lost.

## Files Changed

- `commands/start-issue-tracking.md` — Step 5 rewrite

## Acceptance Criteria

- [ ] `gh issue create` is called in Step 5 before branch creation
- [ ] Returned issue number is written to spec frontmatter `github-issue` field
- [ ] Draft PR (if created) includes `Closes #N` reference
- [ ] ENH path uses `--label enhancement`; Bug path uses `--label bug`
- [ ] Existing ENH-015 through ENH-019 have GitHub issues opened retroactively (out of scope for this fix — separate backlog item)
