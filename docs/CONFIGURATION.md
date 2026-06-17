---
title: Configuration
category:
  uri: overview
position: 8
slug: configuration
---

This guide covers configuring and customizing the Knowledge Management Graph after installation.

> **Installation instructions**: See [GETTING-STARTED.md](GETTING-STARTED.md) for installation steps.

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

## Model Tier Configuration

KMGraph uses platform-agnostic tier labels (`fast-tier`, `standard-tier`, `powerful-tier`) instead of hardcoded model names. This means model preferences survive model version changes and work across platforms.

### Personal defaults — `~/.kmgraph/me.md`

Add a `platforms[]` block to set default model tiers across all projects. The `profile_schema:` field pins the frontmatter format version so `upgrade-inspector` can migrate entries when the schema evolves; missing or outdated schema values trigger an offer-to-upgrade flow before any other profile work runs:

```yaml
---
profile_schema: 1
platforms:
  - name: claude
    tier_map:
      fast-tier: claude-haiku-4-5-20251001
      standard-tier: claude-sonnet-4-6
      powerful-tier: claude-opus-4-7
---
```

### Local models — Ollama and LM Studio

Local platforms add `host` and `port` fields alongside `tier_map`. Ollama defaults to `localhost:11434`, LM Studio to `localhost:1234`:

```yaml
platforms:
  - name: ollama
    host: localhost
    port: 11434
    tier_map:
      fast-tier: llama3.2:3b
      standard-tier: llama3.1:8b
      powerful-tier: llama3.1:70b
  - name: lm-studio
    host: localhost
    port: 1234
    tier_map:
      fast-tier: Phi-3.5-mini-instruct
      standard-tier: Meta-Llama-3.1-8B-Instruct
      powerful-tier: Meta-Llama-3.1-70B-Instruct
```

### Project overrides — `knowledge/me.md`

To use different models for a specific project, add a `platforms[]` block to `knowledge/me.md`. Project-level entries override personal defaults for that project only:

```yaml
platforms:
  - platform: claude-code
    tier_map:
      fast-tier: claude-haiku-4-5-20251001
      standard-tier: claude-sonnet-4-6
      powerful-tier: claude-opus-4-7
```

`knowledge/me.md` is gitignored — tier overrides are per-contributor, not shared.

### Tier collapse — when a mapped model is unreachable

When a dispatch asks for a tier whose mapped model is missing or unreachable (local server offline, model not pulled, API error), the resolver falls back down the chain: `powerful-tier → standard-tier → fast-tier`. The first tier that resolves to a reachable model is used, and the collapse event is logged once per session. If `fast-tier` also fails, the resolver halts with an actionable error including remediation steps. Skills that must not downgrade, such as `stuck-work-escalation`, declare `required_tier: powerful-tier` in their frontmatter and halt rather than collapse.

See [Set up your identity files](guides/me-and-rules.md) for the full `me.md` reference.

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

See [core/docs/SANITIZATION-CHECKLIST.md](reference/SANITIZATION-CHECKLIST.md) for details.

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

See [core/docs/PLATFORM-ADAPTATION.md#mcp-server](reference/PLATFORM-ADAPTATION.md#mcp-server) for troubleshooting.

---

## Notification Webhooks (Optional)

KMGraph can send a notification to a Slack channel or any webhook endpoint whenever a lesson or ADR is saved. This feature is **off by default** — no configuration is required unless you want it.

### How to enable

**1. Get a webhook URL**

- **Slack:** Go to [api.slack.com/apps](https://api.slack.com/apps), create an app, enable *Incoming Webhooks*, and copy the generated URL.
- **Other services:** Any service that accepts an HTTP POST with a JSON body works (Discord, Teams, custom endpoints, etc.).

**2. Set the webhook URL**

Add it to your shell environment or `.env` file in your project root:

```bash
# In your shell profile (~/.zshrc or ~/.bashrc)
export KMGRAPH_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Or in a .env file in your project root (make sure .env is in .gitignore)
KMGRAPH_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

> **Note:** `docs/sessions/` and `.env` are gitignored by default. Never commit a webhook URL to version control.

**3. Verify it works**

After capturing your next lesson or ADR, you should receive a notification within a few seconds. If nothing arrives, check that the URL is correctly exported in your current shell session.

### What the notification contains

```json
{
  "text": "📝 KMGraph: New lesson captured — 'JWT Timestamp Unit Mismatch' in docs/lessons-learned/"
}
```

The message includes the entry type, title, and file path. No file contents are sent.

### Disabling webhooks

Unset the environment variable:

```bash
unset KMGRAPH_WEBHOOK_URL
```

Or remove `KMGRAPH_WEBHOOK_URL` from your `.env` file.


### Templates

Customize document templates for your workflow:

```bash
# Edit templates (changes affect NEW documents only)
vim core/default-templates/lessons-learned/lesson-template.md
vim core/default-templates/decisions/ADR-template.md
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


- **[Capture Your First Lesson](GETTING-STARTED.md#step-4-capture-the-first-lesson)**

  Document what you've learned with `/kmgraph:kmg-capture-lesson` while details are fresh.

- **[Study Real Examples](examples/)**

  Review completed examples of lessons learned, ADRs, and knowledge graph entries.

- **[Explore Advanced Features](reference/ARCHITECTURE.md)**

  Understand system design, patterns, and how to build custom workflows.


---

## Related Documentation

### **Getting started**

- [Getting Started Guide](GETTING-STARTED.md)

  Installation and setup walkthrough

- [Command Reference](COMMAND-GUIDE.md)

  All commands with detailed examples

- [Quick Reference](CHEAT-SHEET.md)

  One-page cheat sheet for common tasks

### **Learning**

- [Concepts Guide](CONCEPTS.md)

  Plain-English definitions of all terms and patterns

- [Examples](examples/)

  Real-world lesson, ADR, and KG entry examples

- [Pattern Writing Guide](reference/PATTERNS-GUIDE.md)

  How to write high-quality entries

### **Advanced**

- [Architecture Guide](reference/ARCHITECTURE.md)

  System design and how components work together

- [Manual Workflows](reference/WORKFLOWS.md)

  Step-by-step processes for non-Claude platforms

- [Platform Adaptation](reference/PLATFORM-ADAPTATION.md) 

  Integration for Cursor, Windsurf, Continue, VS Code, Aider

- [Style Guide](STYLE-GUIDE.md)

  Documentation authoring standards and best practices

- [Templates](templates/)

  Starting scaffolds for lessons, ADRs, and KG entries
---

**Need help?** Check the [examples](examples/) or adapt the templates to your workflow.
