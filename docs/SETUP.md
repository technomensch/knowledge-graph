# Post-Installation Setup

This guide walks you through setting up the Knowledge Graph plugin after installation for your platform.

---

## Platform-Specific Installation

### Claude Code CLI

```bash
# Start Claude Code with the plugin
claude --plugin-dir /path/to/knowledge-graph-plugin

# Skills will be available immediately (no additional setup needed)
/knowledge:init
```

### VSCode Extension

The VSCode extension doesn't support `--plugin-dir` natively. Use the auto-install script:

```bash
cd /path/to/knowledge-graph-plugin
bash scripts/install-vscode.sh
```

Then restart VSCode:
- Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Linux/Windows)
- Type "Reload Window" and press Enter
- Skills will now appear: type `/knowledge:` to see all 16 skills

---

## Installation Scope

When installing the plugin, Claude Code will prompt you to choose an installation scope:

| Scope | Who Can Use | Best For |
|-------|------------|----------|
| **User scope** | Only you | Personal projects, local development |
| **Project scope** | All repository collaborators | Team projects, shared knowledge graphs |
| **Local scope** | Only you, in this repo | Testing before team rollout |

**Recommendation:**
- **Solo projects**: Choose "User scope"
- **Team projects**: Choose "Project scope" (installs in `.claude/settings.json`)
- **Evaluating the plugin**: Choose "Local scope" (trial period)

---

## Quick Start (3 minutes)

### 1. Initialize the Knowledge Graph

The plugin installs the framework, but you need to initialize it in your project:

```bash
# Create directory structure
mkdir -p docs/{lessons-learned/{architecture,debugging,process,patterns},decisions,knowledge,sessions}

# Create .gitkeep files to track empty directories
find docs -type d -exec touch {}/.gitkeep \;

# Commit structure
git add docs/
git commit -m "docs: initialize knowledge graph structure"
```

### 2. Verify Skills Loaded

Skills should appear in Claude Code's command menu after installation:

```
/knowledge:capture-lesson
/knowledge:create-adr
/knowledge:recall
/knowledge:sync-all
```

**If skills don't appear:**
- **CLI users:** Restart Claude Code (skills load at startup only)
- **VSCode users:**
  1. Run the install script: `bash scripts/install-vscode.sh`
  2. Restart VSCode (Cmd+Shift+P → Reload Window)
  3. Verify symlinks: `ls ~/.claude/skills/knowledge:*.md | wc -l` (should show 16)

### 3. Create Your First Lesson

Test the system by documenting something you learned recently:

```
/knowledge:capture-lesson
```

Claude Code will guide you through:
- Topic/title
- Category (auto-detected from keywords)
- Problem description
- Solution and lessons learned

The lesson will be created, indexed, and committed automatically.

---

## Optional: Copy Example Content

The plugin includes examples you can study or adapt:

```bash
# View examples (don't copy to your project yet)
ls core/examples/knowledge/
ls core/examples/lessons-learned/
ls core/examples/decisions/

# Study the examples
cat core/examples/knowledge/sample-patterns.md
cat core/examples/lessons-learned/process/Example_Chat_History_Workflow.md
```

**Recommendation:** Study examples first, then create your own entries. Don't copy examples directly (they're generalized, not project-specific).

---

## Integration with Existing Projects

If you're adding this to an established project:

### 1. Preserve Existing Documentation

```bash
# If you have existing docs/ directory, move knowledge system elsewhere
mkdir -p .knowledge/
# Use .knowledge/ instead of docs/ for knowledge graph
```

Or integrate into existing structure:

```bash
# Add knowledge subdirectories to existing docs/
mkdir -p docs/knowledge-graph/{lessons-learned,decisions,knowledge,sessions}
```

### 2. Link Existing Documentation

Create knowledge graph entries that reference your existing docs:

```markdown
# In docs/knowledge/patterns.md

## Existing Authentication Pattern

**Quick Summary:** OAuth2 implementation with refresh tokens

**Details:** See detailed guide at [docs/auth/oauth-guide.md](../auth/oauth-guide.md)

**Cross-References:**
- **Related Lesson:** [[lessons-learned/security/oauth-implementation.md]]
```

### 3. Extract Knowledge Gradually

Don't try to document everything at once:
- Start with **new** work (document as you go)
- Extract **valuable past knowledge** opportunistically
- Let the system grow organically

---

## Team Workflows

### For Solo Developers

The knowledge graph is your project memory. Use it for:
- Capturing solutions to non-trivial problems
- Recording architectural decisions
- Building reusable patterns library
- Maintaining context across weeks/months

### For Small Teams (2-5 people)

**Workflow:**
1. Each developer creates lessons/ADRs locally
2. Commit to feature branches
3. Review during PR (knowledge is code)
4. Merge to main

**Team conventions:**
```markdown
# In docs/knowledge/README.md

## Team Conventions

- **Lessons:** Create after solving non-trivial problems
- **ADRs:** Required for architectural decisions affecting >1 person
- **Knowledge Graph:** Extract from lessons (don't write directly)
- **Sessions:** Optional (personal preference)
```

### For Larger Teams (6+ people)

**Assign a knowledge curator:**
- Reviews new knowledge entries for clarity
- Identifies duplicate/overlapping content
- Suggests consolidation
- Maintains category READMEs

**Weekly knowledge sync meeting (15-30 min):**
- Share recent valuable lessons
- Discuss emerging patterns
- Update team on architectural decisions
- Identify gaps in documentation

---

## Privacy & Public Sharing

**⚠️ IMPORTANT:** The knowledge graph may contain sensitive information.

### Before Sharing Publicly

Run sanitization checklist:

```bash
# Check for sensitive data
grep -r "api[_-]key\|password\|secret" docs/
grep -r "/Users/\|/home/\|C:\\\\" docs/
grep -r "@yourcompany.com" docs/

# See full checklist
cat core/docs/SANITIZATION-CHECKLIST.md
```

### Use Pre-Commit Hook

Install sanitization hook to catch issues before commit:

```bash
cp core/examples-hooks/pre-commit-sanitization.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Customize patterns for your project
vim .git/hooks/pre-commit
```

See [core/docs/SANITIZATION-CHECKLIST.md](../core/docs/SANITIZATION-CHECKLIST.md) for details.

---

## MCP Server Setup (Optional)

Enable knowledge graph as MCP server for broader access:

### 1. Install MCP SDK

```bash
npm install @anthropic/mcp
```

### 2. Configure MCP Server

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "knowledge-graph": {
      "command": "node",
      "args": ["core/mcp-server.js"],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```

### 3. Test Connection

```bash
# Start MCP server manually to test
node core/mcp-server.js

# Should see: "MCP server listening..."
```

See [core/docs/PLATFORM-ADAPTATION.md#mcp-server](../core/docs/PLATFORM-ADAPTATION.md#mcp-server) for troubleshooting.

---

## Customization

### Templates

Customize document templates for your workflow:

```bash
# Edit templates (changes affect NEW documents only)
vim core/templates/lessons-learned/lesson-template.md
vim core/templates/decisions/ADR-template.md
```

### Categories

Add custom categories:

```bash
# Create new category
mkdir -p docs/lessons-learned/security
touch docs/lessons-learned/security/README.md

# Update auto-detection in skills
vim .claude/skills/knowledge-capture.md
# Add "security" keywords to category mapping
```

### Workflows

Modify skills to match your process:

```bash
# Copy skill to global (for execution)
vim ~/.claude/commands/knowledge-capture.md

# Edit workflow steps
# Save and restart Claude Code
```

---

## Troubleshooting

### Skills Don't Appear in Menu

**Cause:** Skills load at startup only

**Fix:** Restart Claude Code completely (quit and relaunch)

### Skills Execute but Don't Work

**Cause:** Skills in wrong location or outdated

**Fix:**
```bash
# Verify skills in global directory
ls ~/.claude/commands/knowledge-*

# Re-copy from plugin
cp .claude/skills/knowledge-*.md ~/.claude/commands/
# Restart Claude Code
```

### Knowledge Graph Feels Overhead

**Cause:** Trying to document everything

**Solution:** Be selective:
- ✅ DO document: Non-obvious solutions, architectural decisions, discovered patterns
- ❌ DON'T document: Obvious changes, standard practices, routine bug fixes

Quality > Quantity. 5 valuable lessons > 50 routine entries.

### Team Not Adopting

**Causes:**
- Too much friction (skills not working)
- Unclear value (show examples)
- No reinforcement (mention in code reviews)

**Solutions:**
- **Reduce friction:** Ensure skills work reliably
- **Show value:** Share how knowledge graph helped solve problem
- **Gentle reinforcement:** "This would make a great lesson learned" in reviews
- **Lead by example:** Senior devs use it consistently

---

## Next Steps

1. **Create first lesson** using `/knowledge:capture-lesson`
2. **Study examples** in `core/examples/`
3. **Read architecture guide** at [core/docs/ARCHITECTURE.md](../core/docs/ARCHITECTURE.md)
4. **Customize templates** in `core/templates/`
5. **Share with team** and establish conventions

---

## Support & Resources

- **Documentation:** [core/docs/](../core/docs/)
- **Examples:** [core/examples/](../core/examples/)
- **Templates:** [core/templates/](../core/templates/)
- **Platform Adaptation:** [core/docs/PLATFORM-ADAPTATION.md](../core/docs/PLATFORM-ADAPTATION.md)

Questions? Check the examples or adapt the framework to your needs.
