---
name: knowledge:link-issue
description: Manually link existing lesson or ADR to a GitHub issue with bidirectional references
---

# /knowledge:link-issue — Link Lesson to GitHub Issue

Manually link an existing lesson-learned or ADR to a GitHub issue, creating bidirectional references.

## Syntax

```bash
/knowledge:link-issue docs/lessons-learned/process/my-lesson.md --issue 42
/knowledge:link-issue docs/decisions/ADR-005.md --issue 38 --pr 40
```

## What This Does

1. Reads existing lesson/ADR file
2. Updates YAML frontmatter with issue/PR metadata
3. Posts comment to GitHub issue with lesson link (if `gh` CLI available)
4. Updates related KG entry with issue reference
5. Verifies bidirectional link created

## Implementation

### Step 1: Validate Inputs

```bash
file_path="$1"
issue_num="$2"
pr_num="${3:-null}"

# Check file exists
if [ ! -f "$file_path" ]; then
  echo "Error: File not found: $file_path"
  exit 1
fi

# Check issue number provided
if [ -z "$issue_num" ]; then
  echo "Error: Missing issue number"
  echo "Usage: /knowledge:link-issue <file> --issue <num> [--pr <num>]"
  exit 1
fi
```

### Step 2: Update YAML Frontmatter

```bash
# Read current frontmatter
frontmatter=$(sed -n '/^---$/,/^---$/p' "$file_path")

# Check if git metadata exists
if echo "$frontmatter" | grep -q "^git:"; then
  # Update existing git section
  sed -i.bak "/^git:/a\  issue: $issue_num" "$file_path"
  if [ "$pr_num" != "null" ]; then
    sed -i.bak "/^git:/a\  pr: $pr_num" "$file_path"
  fi
else
  # Add new git section
  sed -i.bak "/^---$/i\git:\n  issue: $issue_num\n  pr: $pr_num" "$file_path"
fi

rm "$file_path.bak"
```

### Step 3: Post GitHub Comment (if gh CLI available)

```bash
if command -v gh &> /dev/null; then
  # Extract title from frontmatter
  title=$(grep "^title:" "$file_path" | sed 's/title: "\(.*\)"/\1/')

  # Extract file path relative to repo root
  relative_path=$(git ls-files --full-name "$file_path" 2>/dev/null || echo "$file_path")

  # Post comment
  gh issue comment "$issue_num" --body "📚 Lesson Learned: [$title]($relative_path)

A lesson has been documented for this issue.
Branch: $(git branch --show-current)
Commit: $(git rev-parse --short HEAD)

See: $relative_path"

  echo "✅ Comment posted to issue #$issue_num"
else
  echo "⚠️  gh CLI not available - skipping GitHub comment"
fi
```

### Step 4: Update KG Entry (if exists)

```bash
# Search for KG entry referencing this lesson
kg_path=$(jq -r '.graphs[.active].path' ~/.claude/kg-config.json)

kg_entry=$(grep -l "$(basename $file_path)" "$kg_path"/knowledge/*.md 2>/dev/null || true)

if [ -n "$kg_entry" ]; then
  # Add issue reference to KG entry
  echo "Issue #$issue_num referenced" >> "$kg_entry"
  echo "✅ KG entry updated with issue reference"
fi
```

### Step 5: Report Success

```bash
echo ""
echo "✅ Lesson linked to GitHub issue #$issue_num"
echo ""
echo "Updated: $file_path"
if [ "$pr_num" != "null" ]; then
  echo "PR: #$pr_num"
fi
echo ""
echo "Bidirectional links created:"
echo "  Lesson → Issue: YAML frontmatter updated"
echo "  Issue → Lesson: GitHub comment posted (if gh CLI available)"
```

## Output Example

```
✅ Comment posted to issue #42
✅ KG entry updated with issue reference

✅ Lesson linked to GitHub issue #42

Updated: docs/lessons-learned/process/auth-race-condition.md
PR: #40

Bidirectional links created:
  Lesson → Issue: YAML frontmatter updated
  Issue → Lesson: GitHub comment posted
```

## Edge Cases

### No gh CLI
```
⚠️  gh CLI not available - skipping GitHub comment
✅ Lesson frontmatter updated with issue reference

Note: Install gh CLI for automatic GitHub comment posting:
  brew install gh
```

### File Not Found
```
Error: File not found: docs/lessons-learned/nonexistent.md
```

### No Issue Number
```
Error: Missing issue number
Usage: /knowledge:link-issue <file> --issue <num> [--pr <num>]
```

## See Also

- `/knowledge:capture-lesson` — Create new lesson with automatic git metadata
- `/knowledge:update-issue-plan` — Sync KG to plan and GitHub issue
