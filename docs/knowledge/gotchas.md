# Knowledge Graph - Gotchas

Quick-reference pitfalls and anti-patterns to avoid.

---

## Gotcha Template

Copy this template for each new gotcha:

```markdown
## Gotcha Name

**Quick Reference:**
- **Symptom:** [What you see when you hit this]
- **Root Cause:** [Why it happens]
- **Fix:** [How to resolve it]
- **Prevention:** [How to avoid it]

**Evidence:**
[Link to lesson learned](../../lessons-learned/category/lesson-file.md) — [Context]
- [What went wrong]
- [How it was discovered]

**See Lesson:** [Link to full lesson with debugging details]
```

---

## Instructions

1. **Symptom-first:** Start with what the user observes
2. **Root cause:** Explain why it happens (not just how to fix)
3. **Prevention:** Include how to avoid hitting this in the future
4. **Link to lessons:** Every gotcha must reference at least one lesson-learned
5. **Concrete examples:** Use real cases, not hypotheticals

---

## .gitignore Inline Comments Silently Fail

**Quick Reference:**
- **Symptom:** Files you intended to ignore are being tracked by git (appear in `git status`)
- **Root Cause:** Comments placed inline or at end of `.gitignore` lines are not parsed correctly; `.gitignore` ignores everything after the pattern on a line
- **Fix:** Remove any inline comments; put each pattern on its own line
- **Prevention:** Test `.gitignore` behavior with `git check-ignore -v <file>`; review `.gitignore` in code review

**Evidence:**
Multiple instances from v0.0.5 where 3 paths weren't being ignored due to comment formatting

**Example:**
```gitignore
# ✗ WRONG - comment after pattern doesn't work
*.log  # log files

# ✓ CORRECT
*.log
```

---

## Duplicate Hooks Declaration in plugin.json

**Quick Reference:**
- **Symptom:** Plugin fails to load; error about duplicate hook declarations
- **Root Cause:** Hooks declared twice—once via auto-discovery and again explicitly in `hooks` section
- **Fix:** Use one method only; prefer explicit declaration in plugin.json
- **Prevention:** Don't mix auto-discovery (`hooks/` directory) with explicit hook configuration

**Evidence:**
[Duplicate Hooks Declaration Causes Plugin Load Failure](../../lessons-learned/debugging/Lessons_Learned_Duplicate_Hooks_Declaration.md) — v0.0.1
- Hook loader detected duplicate registrations
- Plugin refused to initialize

**Technical Note:** Auto-discovery scans `hooks/` directory; explicit config in `plugin.json` is separate. Both together cause conflict.

---

## Marketplace Config Pulls from Main Branch Only

**Quick Reference:**
- **Symptom:** Changes to `plugin.json` or `marketplace.json` don't appear in marketplace even though they're committed to feature branch
- **Root Cause:** Marketplace fetches configuration only from main branch, not from feature branches
- **Fix:** Merge to main before marketplace becomes aware of changes
- **Prevention:** Test marketplace changes only after merging to main; or use local plugin testing

**Evidence:**
Feature branches invisible to marketplace until merged to main

**Impact:** Can't test marketplace behavior via feature branches

---

## Interactive Prompts Fail in Hook Context

**Quick Reference:**
- **Symptom:** `/kg-sis:capture-lesson` or other interactive command fails when triggered from a hook; reports "stdin not connected"
- **Root Cause:** Hooks execute in detached context without IDE connection; stdin/stdout not available for interactive prompts
- **Fix:** Use hooks for logging/validation only; defer interactive operations to user invocation
- **Prevention:** Never call interactive commands from hooks; use hooks for async validation instead

**Evidence:**
[Interactive Prompts and Slash Commands Don't Work in Hooks](../../lessons-learned/debugging/Lessons_Learned_Interactive_Prompts_Dont_Work_In_Hooks.md) — v0.0.3
- Attempted to trigger `/kg-sis:update-graph` from post-commit hook
- Failed because hook has no terminal connection

---

## Slash Commands Can't Be Called from Bash Scripts

**Quick Reference:**
- **Symptom:** Bash script tries to invoke `/kg-sis:capture-lesson` and fails; command not found
- **Root Cause:** Slash commands are Claude Code IDE features; not available in bash environment
- **Fix:** Call Python/JavaScript directly instead of via slash command; or trigger from IDE only
- **Prevention:** Use direct scripts (Python/JS) for automation; reserve slash commands for user interaction

**Evidence:**
Slash commands are Claude Code abstractions; they don't map to shell executables

---

## Multi-KG Architecture Blocks Inline Updates

**Quick Reference:**
- **Symptom:** Inline update pattern from single-KG projects doesn't work in multi-KG environment; updates to wrong graph
- **Root Cause:** Inline pattern hardcodes paths; multi-KG requires routing to active graph
- **Fix:** Use delegated architecture via `/kg-sis:update-graph`
- **Prevention:** Always use delegation for KG writes; never write directly

**Evidence:**
[Inline KG Updates Violate Multi-KG Architecture](../../lessons-learned/architecture/Lessons_Learned_Inline_KG_Updates_Violate_Multi_KG.md) — v0.0.3
- Attempted to port optimize-my-resume inline pattern to knowledge-graph
- Failed because multiple KGs need routing logic

---

## Line vs Token Metrics Inconsistency

**Quick Reference:**
- **Symptom:** Plan estimates become wildly inaccurate; scope balloons unexpectedly
- **Root Cause:** Switching from line-based to token-based counting mid-project; lines are misleading (10 lines of comments ≠ 10 lines of code)
- **Fix:** Use token-based metrics consistently; tokens = `word_count × 1.3`
- **Prevention:** Establish metric early; stick with it throughout project

**Evidence:**
[Line vs Token Metrics Must Be Applied Consistently](../../lessons-learned/debugging/Lessons_Learned_Line_vs_Token_Metrics_Confusion.md) — v0.0.3
- Initial line-based estimates too optimistic
- Switching to tokens revealed true scope (longer than estimated)

**Impact:** Affects all planning going forward; consistency is critical

---

## Truncated Plugin Marketplace Slug (28-char limit)

**Quick Reference:**
- **Symptom:** Plugin appears in marketplace with different name than submitted; ID seems shortened
- **Root Cause:** Marketplace enforces 28-character maximum for plugin IDs; silently truncates longer IDs with no error
- **Fix:** Keep plugin ID ≤ 28 characters (use `kg-sis` instead of `knowledge-graph-stays-in-sync`)
- **Prevention:** Validate ID length before submission; check actual vs submitted ID after publishing

**Evidence:**
[Truncated Plugin Marketplace Slug Bug (28-char limit)](../../lessons-learned/debugging/Lessons_Learned_Truncated_Marketplace_Slug.md) — v0.0.5
- `knowledge-graph-stays-in-sync` (34 chars) silently truncated to `knowledge-graph-stays-in-sy`
- Led to namespace rename to `kg-sis` (6 chars) in v0.0.8.3

**Silent Failure:** Most dangerous type of bug—system "works" but with unexpected results

---

## Orphaned Config Paths After Repo Rename

**Quick Reference:**
- **Symptom:** Suddenly can't access KG; "path not found" error when trying to load
- **Root Cause:** Config contains absolute paths; when repo renamed, old paths become invalid (silent until accessed)
- **Fix:** Add validation layer on config load; check path exists; provide recovery instructions
- **Prevention:** Use config validation command; test repo moves during development

**Evidence:**
[Config File Orphaned References After Repo Rename](../../lessons-learned/architecture/Lessons_Learned_Config_Orphaned_References.md) — v0.0.6
- Renamed knowledge-graph-old → knowledge-graph
- Config pointed to old path
- Error only appeared when trying to use KG

**Solution:** Implement path validation + helpful error messages

---

## MkDocs 2.0 Incompatible with Material Theme

**Quick Reference:**
- **Symptom:** Material theme styling broken in MkDocs; errors about "config schema validation"
- **Root Cause:** Material theme v0.x incompatible with MkDocs 2.0; theme expects MkDocs 1.x API
- **Fix:** Pin MkDocs to 1.x in requirements.txt (`mkdocs<2.0`)
- **Prevention:** Check theme compatibility before upgrading MkDocs

**Evidence:**
Documentation setup discovered incompatibility between Material 9.x and MkDocs 2.0

**Impact:** Affects auto-generated documentation builds

---

## YAML name Field Uses Colon Not Hyphen

**Quick Reference:**
- **Symptom:** Slash command appears with hyphenated name in CLI but YAML config uses different format; mismatch between definition and invocation
- **Root Cause:** YAML frontmatter `name:` field must use colon syntax for nested commands (e.g., `knowledge:cmd` not `knowledge-cmd`)
- **Fix:** Use `name: knowledge:cmd` in YAML; colon creates nested hierarchy
- **Prevention:** Verify `name` field matches actual command invocation; test locally before deploying

**Evidence:**
Command hierarchy parsing expects colon as separator in YAML name field

**Example:**
```yaml
# ✓ CORRECT
name: kg-sis:capture-lesson

# ✗ WRONG (won't work)
name: kg-sis-capture-lesson
```

