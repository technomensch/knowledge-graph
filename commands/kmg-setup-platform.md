
# Configure AI Platforms for KMGraph

**Purpose:** Detect which AI coding tools are installed on this machine and write the appropriate config files so they know how to use the knowledge graph. Run this when you install a new AI tool after the initial `/kmgraph:kmg-init` setup.

---

## Syntax Detection

```
/kmgraph:kmg-setup-platform
/kmgraph:kmg-setup-platform <platform>
```

**Examples:**
- `/kmgraph:kmg-setup-platform` → Detect and configure all installed platforms
- `/kmgraph:kmg-setup-platform gemini` → Configure Gemini CLI only

---

## Step 1: Read Active KG Config

```bash
cat ~/.kmgraph/kg-config.json
```

Extract:
- `active` key → active KG name
- Active KG's `path` field → KG path
- Active KG's `platforms` array → already-configured platforms (skip these, or note "already configured")

If no config exists: ask the user to run `/kmgraph:kmg-init` first.

---

## Step 2: Detect Installed AI Coding Tools

Run these checks to build the list of detected platforms:

```bash
# Gemini CLI
which gemini 2>/dev/null || [ -d "$HOME/.gemini" ] && echo "gemini"

# Cursor
([ -d "$HOME/.cursor" ] || [ -d "$HOME/Library/Application Support/Cursor" ]) && echo "cursor"

# Windsurf
([ -d "$HOME/.windsurf" ] || [ -d "$HOME/Library/Application Support/Windsurf" ]) && echo "windsurf"

# Continue.dev
[ -d "$HOME/.continue" ] && echo "continue"

# VS Code Copilot (check extensions list)
code --list-extensions 2>/dev/null | grep -q "GitHub.copilot" && echo "copilot"

# Aider
which aider 2>/dev/null && echo "aider"
```

Collect results. Note which are already in the `platforms` array (already configured).

---

## Step 3: Confirmation Prompt

If a platform was passed as an argument, skip this step and go directly to configuration.

**No new platforms detected:** "All detected platforms are already configured, or no supported AI tools were found."

**One new platform detected:**
```
Want me to configure KMGraph for [platform]? [y/N]
```

**Multiple new platforms detected:**
```
I see you have [A], [B], and [C] that aren't configured for KMGraph yet.
Want me to configure all of them?

1. Configure all
2. Choose which ones
3. Skip — I'll do it myself
```

**If option 2 (choose):** Prompt individually for each detected platform.

---

## Step 4: Platform File Map

| Platform | File | Content source |
|---|---|---|
| Gemini CLI | `GEMINI.md` in project root | `${CLAUDE_PLUGIN_ROOT}/core/default-templates/AGENTS-template.md` |
| Cursor | `.cursorrules` | Project conventions + KMGraph behaviors subset |
| Windsurf | `.windsurfrules` | Same as `.cursorrules` |
| Continue.dev | `.continue/config.json` prompt section | KMGraph behaviors subset |
| VS Code Copilot | `.github/copilot-instructions.md` | Project conventions + KMGraph behaviors subset |
| Aider | `.aider.conf.yml` conventions section | KMGraph behaviors subset |

---

## Step 5: Write Platform Files

For each approved platform:

**Overwrite protection:** If the target file already exists, show a diff (describe what content will change) and ask before writing. Never silently replace an existing file.

**Writing Gemini CLI (`GEMINI.md`):**
```
Action: Read ${CLAUDE_PLUGIN_ROOT}/core/default-templates/AGENTS-template.md
Action: Write contents to GEMINI.md in the current project root
```

**Writing Cursor/Windsurf (`.cursorrules` / `.windsurfrules`):**
Write a KMGraph behaviors subset covering:
- When to suggest capturing lessons (bug resolved, decision made, pattern found)
- How to use recall before answering questions about project history
- Session wrap-up cues
- Available MCP tools: `kg_search`, `kg_fts5_rebuild`, `kg_scaffold`, `kg_config_*`

Do NOT include: Claude Code slash commands, hooks syntax, or Claude Code-specific tool references.

**Writing VS Code Copilot (`.github/copilot-instructions.md`):**
Include project coding conventions plus the KMGraph behaviors subset above.
Create the `.github/` directory if it doesn't exist.

**Writing Continue.dev (`.continue/config.json`):**
Add a `systemPrompt` entry with the KMGraph behaviors subset.
If the file already exists, add to the existing config rather than overwriting.

**Writing Aider (`.aider.conf.yml`):**
Add a `conventions` section with the KMGraph behaviors subset.
If the file already exists, add to the existing config rather than overwriting.

**Output confirmation per platform:**
```
✅ Configured: GEMINI.md (Gemini CLI)
✅ Configured: .cursorrules (Cursor)
⚠️  .windsurfrules already existed — showed diff, user declined overwrite
```

---

## Step 6: For Any Declined Platform

Show the exact file path and exact content to paste — never redirect to docs:

```
To configure [platform] manually:

File: [exact path]

Contents to paste:
[exact content block]

Verification: Once added, ask your AI: "Is there a knowledge graph available?"
Expected response: Your AI should describe KMGraph's capture, recall, and session
summary capabilities and mention the kg_search MCP tool.
```

---

## Step 7: Register Platforms in Config

After writing each platform file, add the platform name to the `platforms` array in
`~/.kmgraph/kg-config.json` for the active KG:

```bash
# Platform names: "gemini", "cursor", "windsurf", "continue", "copilot", "aider"
# Read current config, add platform name to the platforms array
# If platforms array is absent, initialize it first
```

Use Read + Edit to update the config. Never error if the `platforms` field is missing — treat absence as an empty array.

Final config shape for the active KG entry:
```json
{
  "path": "/path/to/kg/docs",
  "type": "project-local",
  "autoSwitch": false,
  "platforms": ["gemini", "cursor"],
  "notification": { "webhookUrl": "" }
}
```

---

## Checklist

- [ ] Active KG config read; already-configured platforms identified
- [ ] Installed platforms detected
- [ ] User confirmed which platforms to configure
- [ ] Platform files written with overwrite protection
- [ ] Manual instructions provided for any declined platforms (exact content, not "see docs")
- [ ] Platforms array updated in kg-config.json
- [ ] Verification step shown for each configured platform

---

## Related Commands

- `/kmgraph:kmg-init` — Initialize a knowledge graph (includes platform detection at setup time)
- `/kmgraph:kmg-status` — Check current knowledge graph status
- `/kmgraph:kmg-switch` — Change the active knowledge graph
