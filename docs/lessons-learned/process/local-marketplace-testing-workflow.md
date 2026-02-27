---
title: "Lesson: Local Marketplace Testing - Two-Location Sync Required"
created: 2026-02-16T18:30:00Z
author: technomensch
git:
  branch: v0.0.2-alpha
  commit: 2bc7920
tags: [process, testing, marketplace, plugin-development, workflow]
category: process
---

# Lesson: Local Marketplace Testing - Two-Location Sync Required

## Problem

When testing plugin changes locally through the Claude Code marketplace, changes were not being picked up despite being committed and saved in the project directory. The plugin consistently showed the old version and behavior, making iterative testing impossible.

## Symptom

**What was observed:**
- Modified plugin code in `/Users/mkaplan/Documents/GitHub/knowledge-graph-plugin`
- Committed changes to git
- Restarted Claude Code or refreshed marketplace
- Plugin still showed old version (0.0.1-alpha instead of 0.0.2-alpha)
- Changes to commands, skills, or configuration not reflected

**Impact:**
- Hours wasted debugging "phantom issues" that were already fixed
- Unable to validate actual plugin behavior
- False negatives in testing (thought fixes didn't work when they did)
- Confusion about whether marketplace.json was configured correctly

## Root Cause

**Two Separate Directory Locations:**

Claude Code's local marketplace installation maintains its own copy of the plugin separate from the development project directory.

```
Development Location (where edits are made):
/Users/mkaplan/Documents/GitHub/knowledge-graph-plugin/
  ├── .claude-plugin/
  ├── commands/
  ├── skills/
  └── [all plugin files]

Marketplace Location (what Claude Code actually uses):
/Users/mkaplan/Documents/GitHub/local-marketplace/plugins/knowledge-graph-plugin/
  ├── .claude-plugin/
  ├── commands/
  ├── skills/
  └── [cached copy of plugin files]
```

**Why This Happens:**

When `marketplace.json` uses `"source": "./"` (local source), Claude Code:
1. Reads the marketplace.json from the development location
2. **Copies** the plugin files to the local marketplace cache
3. Loads the plugin from the **cached copy**, not the original

This means:
- Edits in development location don't automatically sync to marketplace cache
- Each edit requires manual copy to marketplace location to be visible
- Two versions of the plugin exist simultaneously

## Solution

### Immediate Fix

**Copy updated files to the local marketplace location after each change:**

```bash
# After making changes in development directory
cd /Users/mkaplan/Documents/GitHub/knowledge-graph-plugin

# Copy entire plugin to marketplace location
cp -r . /Users/mkaplan/Documents/GitHub/local-marketplace/plugins/knowledge-graph-plugin/

# Or use rsync for incremental updates
rsync -av --delete \
  /Users/mkaplan/Documents/GitHub/knowledge-graph-plugin/ \
  /Users/mkaplan/Documents/GitHub/local-marketplace/plugins/knowledge-graph-plugin/
```

**Restart Claude Code** to load the updated plugin from marketplace cache.

### Development Workflow

**Recommended workflow for local marketplace testing:**

1. **Make changes** in development directory:
   ```bash
   cd /Users/mkaplan/Documents/GitHub/knowledge-graph-plugin
   # Edit files: commands/, skills/, plugin.json, etc.
   git add .
   git commit -m "feat: add new feature"
   ```

2. **Sync to marketplace location:**
   ```bash
   # Option A: Full copy (safe, ensures everything syncs)
   cp -r . /Users/mkaplan/Documents/GitHub/local-marketplace/plugins/knowledge-graph-plugin/

   # Option B: Rsync (faster, only copies changes)
   rsync -av --delete . /Users/mkaplan/Documents/GitHub/local-marketplace/plugins/knowledge-graph-plugin/
   ```

3. **Restart Claude Code** or reload plugins

4. **Test changes** in Claude Code

5. **Repeat** steps 1-4 for iterative development

### Automation Script

**Create a sync script for convenience:**

```bash
#!/bin/bash
# save as: sync-to-marketplace.sh

DEV_DIR="/Users/mkaplan/Documents/GitHub/knowledge-graph-plugin"
MARKETPLACE_DIR="/Users/mkaplan/Documents/GitHub/local-marketplace/plugins/knowledge-graph-plugin"

echo "Syncing plugin to marketplace..."
rsync -av --delete "$DEV_DIR/" "$MARKETPLACE_DIR/"
echo "✅ Sync complete. Restart Claude Code to load changes."
```

**Usage:**
```bash
chmod +x sync-to-marketplace.sh
./sync-to-marketplace.sh
```

## Prevention

### Workflow Checklist

Before testing plugin changes locally:

- [ ] **Edit** files in development directory
- [ ] **Commit** changes to git
- [ ] **Sync** to marketplace location (copy or rsync)
- [ ] **Restart** Claude Code
- [ ] **Verify** version number changed in marketplace UI
- [ ] **Test** actual plugin behavior

### Common Mistakes to Avoid

**❌ Don't:**
- Assume changes in development directory automatically appear in marketplace
- Edit files directly in marketplace cache location
- Skip the sync step when testing
- Test without restarting Claude Code

**✅ Do:**
- Always sync after each logical change
- Use automation script to reduce human error
- Verify version number in marketplace UI before testing
- Keep both locations in mind when troubleshooting

## Related Discovery

### Namespace Visibility in Marketplace

**Important finding:** When testing the updated plugin via marketplace installation, namespace visibility behaves correctly:

**Without filename prefix** (`status.md`):
- Installed via marketplace: Shows `/kmgraph:status` ✅
- File prefix not required for namespace visibility in marketplace mode

**With filename prefix** (`knowledge-status.md`):
- Installed via marketplace: Also shows `/kmgraph:status` ✅
- Filename prefix is redundant but doesn't hurt

**Conclusion:** The file prefix workaround (`knowledge-*.md`) was needed for local development testing, but marketplace installation handles namespace visibility correctly regardless of filename prefix.

See related lesson: [Plugin Namespace Visibility - Shadow Command Failure](../debugging/namespace-visibility-shadow-command-failure.md)

## Metrics

- ✅ Testing workflow: Reliable after implementing sync step
- ✅ Time saved: ~30 minutes per testing cycle (no more false debugging)
- ✅ Confidence: Can now trust that changes are actually being tested
- ✅ Discovery: Namespace visibility works correctly via marketplace

## Tags

`#process` `#testing` `#marketplace` `#plugin-development` `#workflow` `#local-testing` `#two-location-sync`

## Related Files

- Development location: `/Users/mkaplan/Documents/GitHub/knowledge-graph-plugin/`
- Marketplace cache: `/Users/mkaplan/Documents/GitHub/local-marketplace/plugins/knowledge-graph-plugin/`
- Marketplace config: `.claude-plugin/marketplace.json`

## Related Lessons

- [Plugin Namespace Visibility - Shadow Command Failure](../debugging/namespace-visibility-shadow-command-failure.md) - File prefix workaround for namespace visibility
