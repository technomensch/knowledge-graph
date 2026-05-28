# Lessons Learned: Plugin Skills Auto-Discovery — No Hooks.json Registration Required

**Source:** Opus v0.5.9 pre-implementation review, finding I9  
**Date:** 2026-05-25  
**Contributors:** Opus, technomensch

---

## The Lesson

Claude Code plugin skills are **auto-discovered** from the `skills/` directory by directory name. No explicit registration in `hooks.json` is required when adding a new skill.

### How Auto-Discovery Works

1. **Directory scanning:** Claude Code plugin harness scans the `skills/` directory at load time
2. **Naming convention:** Each subdirectory name becomes the skill identifier (e.g., `skills/my-skill/` → skill name `my-skill`)
3. **SKILL.md file:** Every skill must include a `SKILL.md` file that defines the skill's behavior and metadata
4. **hooks.json pattern:** The PreToolUse hook uses an empty-string `""` pattern that matches *all* skills; the hook script itself filters by skill name
5. **No per-skill entry needed:** There is NO requirement to add a hooks.json entry for each new skill

### Why This Matters

Developers unfamiliar with the Claude Code plugin architecture will reflexively add `hooks.json` entries when creating a new skill, treating it like a feature flag or registration mechanism. This creates unnecessary noise and maintenance burden.

The actual registration is **implicit and automatic** — the plugin harness does all the work.

### What to Do When Adding a New Skill

1. Create `skills/<skill-name>/` directory
2. Create `skills/<skill-name>/SKILL.md` with skill metadata and prompts
3. Implement the skill's behavior in the module
4. **Do NOT modify hooks.json** — the PreToolUse hook already covers all skills via the empty-string pattern

### Implementation Example

```
skills/
  my-new-skill/
    SKILL.md         ← Defines skill behavior
    index.ts         ← Skill implementation
    package.json     ← Dependencies (if needed)
```

The plugin harness automatically discovers `my-new-skill` and makes it available without any hooks.json changes.

### Related Context

- **Plugin architecture:** `commands/` (PROTECTED) vs. `skills/` (auto-discovered)
- **Hook patterns:** `hooks.json` uses `""` matcher for all-skills catch-all; filtering happens in the hook script
- **Pre-implementation checklist:** Should verify understanding of auto-discovery BEFORE implementing new skills

---

## Tags

`#architecture`, `#plugin`, `#skills`, `#hooks`, `#auto-discovery`, `#implementation-pattern`
