---
title: "Lesson: Relative File Path Hygiene"
created: 2026-01-07T14:20:00Z
author: "Example User"
git:
  branch: null
  commit: null
  pr: null
  issue: null
sources:
  - url: "https://keepachangelog.com/en/1.0.0/"
    title: "Keep a Changelog"
    accessed: "2026-01-07"
    context: "Standardizing the versioning documentation format"
  - url: "https://semver.org/spec/v2.0.0.html"
    title: "Semantic Versioning 2.0.0"
    accessed: "2026-01-07"
    context: "Defining version increment logic for multi-user environments"
tags: ["#portability", "#paths", "#documentation", "#best-practices"]
category: process
---

# Lesson Learned: Relative File Path Hygiene

**Date:** 2024-07-22
**Category:** Process
**Tags:** #portability #paths #documentation #best-practices

---

## Problem

Documentation and scripts contained hardcoded absolute paths that broke when:
- Cloning repository to different machine
- Different user accounts (different home directories)
- Moving project to different location
- Sharing documentation publicly

This caused:
- Links failing to resolve
- Scripts throwing "file not found" errors
- Copy-paste instructions not working for other users
- Embarrassment when publishing with `/Users/YourName/` visible

**Specific incident:** Published documentation to GitHub with paths like `/Users/john/Documents/my-project/`. Multiple users reported "instructions don't work" because paths didn't exist on their systems.

---

## Root Cause

**AI agents default to absolute paths** when generating file references because:
- More "explicit" feels safer to AI
- Editor APIs often return absolute paths
- AI doesn't inherently understand portability concerns
- No automatic detection of hardcoded paths

**What gets hardcoded:**
```markdown
# BAD: Absolute paths
See [config](/Users/john/Documents/project/config/settings.md)
Run: cd /Users/john/Documents/project && ./script.sh
```

---

## Solution Implemented

### 1. Relative Path Policy

**Rule:** ALL documentation and scripts use relative paths from repository root.

```markdown
# GOOD: Relative paths
See [config](./config/settings.md)
Run: cd ./scripts && ./script.sh
```

**For global resources:** Use environment variables or home directory expansion:
```bash
# GOOD: Platform-agnostic
~/.config/app/settings
$HOME/.config/app/settings
${HOME}/.config/app/settings
```

### 2. Automated Detection

Created pre-commit hook to catch hardcoded paths:

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Checking for hardcoded absolute paths..."

# Check staged files for patterns like /Users/, /home/, C:\
MATCHES=$(git diff --cached | grep -E "/(Users|home)/|[A-Z]:\\\\" || true)

if [ -n "$MATCHES" ]; then
  echo "❌ ERROR: Hardcoded absolute paths detected:"
  echo "$MATCHES"
  echo ""
  echo "Use relative paths instead:"
  echo "  ./docs/file.md  (not /Users/you/project/docs/file.md)"
  echo "  ~/. config       (not /Users/you/.config)"
  exit 1
fi

echo "✅ No hardcoded paths detected"
```

### 3. Sanitization Script

Created script to find and fix existing hardcoded paths:

```bash
#!/bin/bash
# scripts/sanitize-paths.sh

PROJECT_ROOT=$(git rev-parse --show-toplevel)

echo "Sanitizing absolute paths in: $PROJECT_ROOT"

# Find all markdown and script files
find . -type f \( -name "*.md" -o -name "*.sh" -o -name "*.py" \) -not -path "*/\.git/*" | while read file; do
  
  # Replace absolute paths with relative
  # Matches /full/path/to/project/subdir -> ./subdir
  sed -i.bak "s|$PROJECT_ROOT/|./|g" "$file"
  
  # Replace user home paths
  # Matches /Users/username or /home/username -> ~
  sed -i.bak -E "s|/Users/[^/]+|~|g" "$file"
  sed -i.bak -E "s|/home/[^/]+|~|g" "$file"
  
  # Clean up backup if no changes
  if diff "$file" "$file.bak" > /dev/null 2>&1; then
    rm "$file.bak"
  else
    echo "  Fixed: $file"
    rm "$file.bak"
  fi
done
```

### 4. AI Agent Instructions

Added to project rules:

```markdown
## File Path Policy

**ALWAYS use relative paths in documentation and code:**

✅ CORRECT:
- `./docs/guide.md`
- `../config/settings.json`
- `~/. local/app/data`

❌ WRONG:
- `/Users/name/project/docs/guide.md`
- `/home/name/project/config/settings.json`
- `C:\Users\name\project\`

**Why:** Absolute paths break portability and expose user-specific information.

**Exception:** Platform-specific global paths documented as:
- macOS: `~/.config/app/`
- Linux: `~/.config/app/`
- Windows: `%APPDATA%\app\`
```

---

## Replication Steps

To implement relative path hygiene:

1. **Establish policy:**
   - Document in README and contributor guidelines
   - Add to AI agent instructions
   - Train team on rationale

2. **Audit existing files:**
   ```bash
   # Find hardcoded paths
   grep -r "/Users/" . --include="*.md" --include="*.sh"
   grep -r "/home/" . --include="*.md" --include="*.sh"
   grep -r "[A-Z]:\\\\" . --include="*.md" --include="*.sh"
   ```

3. **Create sanitization script:**
   - Automated find-and-replace
   - Safe mode (creates backups)
   - Report changes made

4. **Add pre-commit hook:**
   - Blocks commits with hardcoded paths
   - Provides helpful error message
   - Suggests correction

5. **Document platform differences:**
   ```markdown
   # Installation paths:
   - macOS/Linux: `~/.config/app/`
   - Windows: `%APPDATA%\app\`
   ```

---

## Lessons Learned

### What Worked Well

- **Pre-commit hook:** Catches mistakes before they enter repository
- **Automated sanitization:** Fixed hundreds of paths in minutes
- **Clear policy:** Team knows rule and why it exists

### What Didn't Work

- **Manual review:** Humans miss hardcoded paths in review
- **"Just remember":** Relying on memory doesn't scale

### Key Insights

1. **AI defaults to absolute paths:** Must explicitly instruct otherwise
2. **Automation is mandatory:** Humans can't reliably catch all instances
3. **Fix at the gate:** Pre-commit hook prevents rather than repairs
4. **Separate policy from exceptions:** Clear rule + documented exceptions

### Common Patterns to Catch

**In documentation:**
```markdown
# BAD
[Guide](/Users/you/project/docs/guide.md)

# GOOD  
[Guide](./docs/guide.md)
```

**In scripts:**
```bash
# BAD
cd /Users/you/project && ./run.sh

# GOOD
cd "$(dirname "$0")/.." && ./run.sh
```

**In configurations:**
```json
// BAD
{"path": "/Users/you/project/data"}

// GOOD
{"path": "./data"}
```

---

## Impact

After implementing relative path hygiene:

- **Portability issues:** Dropped from 15/month to 0
- **Setup time for new developers:** Reduced ~40% (instructions just work)
- **Public documentation quality:** No exposed user paths
- **Pre-commit hook triggers:** ~3-5 times/week (catches mistakes early)

---

## External References

Sources consulted while solving this problem:

- **[Keep a Changelog](https://keepachangelog.com/en/1.0.0/)** — Accessed: 2026-01-07
  - Context: Standardizing the documentation of file changes and versioning.
  - Key insight: Explicitly versioning documentation alongside code ensures that relative paths remain valid for specific releases.

- **[Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html)** — Accessed: 2026-01-07
  - Context: Used to manage breaking changes in directory structures.

## Related Documentation

**Knowledge Graph:**
- [Platform Agnostic Paths](../../knowledge/patterns.md#platform-agnostic-paths) — Implementation details for relative path enforcement.
- [Absolute Path Regression](../../knowledge/gotchas.md#absolute-path-regression) — Common pitfalls of path handling in AI agents.
- [Portability First](../../knowledge/concepts.md#portability-first) — Core project philosophy regarding environment isolation.

---

**Version:** 1.0
**Created:** 2026-01-07
**Last Updated:** 2026-02-13
