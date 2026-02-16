---
name: knowledge:configure-sanitization
description: Interactive wizard to set up pre-commit hooks for sensitive data detection
---

# /knowledge:configure-sanitization — Setup Sanitization Hooks

Interactive wizard to help users set up pre-commit hooks that scan for potentially sensitive information before committing knowledge graph entries.

## What This Does

1. Wizard prompts for scan patterns (emails, API keys, names, URLs)
2. Collect custom patterns specific to your project
3. Choose action on match (warn or block)
4. Install pre-commit hook script
5. Create `.claude/sanitization-config.json`

## Wizard Steps

### Step 1: Select Scan Patterns

```
What should be scanned for?

☐ Email addresses
☐ API keys and tokens
☐ Personal names (from git commits)
☐ Company/internal names
☐ Internal URLs and endpoints
```

### Step 2: Custom Patterns

```
Add custom patterns to block? (regex)

Example: "ACME Corp", "internal\.company\.com", "MyApiKey"

Enter patterns (comma-separated, or leave blank):
```

### Step 3: Action on Match

```
What should happen when sensitive data is found?

1. Warn (allow commit, show warning)
2. Block (prevent commit until fixed)

Choose [1-2]:
```

### Step 4: Install Hook

```bash
# Copy hook script
cp "${CLAUDE_PLUGIN_ROOT}/core/examples-hooks/pre-commit-sanitization.sh" \
   .git/hooks/pre-commit

chmod +x .git/hooks/pre-commit
```

### Step 5: Create Config

```bash
cat > .claude/sanitization-config.json <<EOF
{
  "enabled": true,
  "patterns": [
    {"type": "email", "enabled": true},
    {"type": "api-key", "enabled": true},
    {"type": "custom", "pattern": "ACME Corp", "enabled": true}
  ],
  "action": "$action"
}
EOF
```

## Output

```
✅ Pre-commit sanitization hook installed!

Scan patterns: emails, API keys, custom patterns (2)
Action: Block commits with sensitive data

Test the hook:
  git add docs/knowledge/patterns.md
  git commit -m "test"

If sensitive data is found, you'll see:
  ⚠️ Potential sensitive data found:
  - docs/knowledge/patterns.md:42 — email: user@example.com

Remove or use .sanitization-ignore to bypass.
```

## See Also

- `/knowledge:check-sensitive` — Manually scan KG for sensitive data
