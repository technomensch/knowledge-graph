# Common Gotchas & Solutions

<!-- THIS IS AN EXAMPLE — Replace with your project's gotchas -->

**Last Updated:** 2026-02-13
**Entries:** 6

This file contains example gotchas from a real project, generalized for demonstration purposes. Use these as templates for documenting common pitfalls in your own projects.

---

## Quick Navigation

- [Agent Governance Drift](#agent-governance-drift) - AI skips documentation/governance steps
- [Plan File Location](#plan-file-location) - Temporary vs. permanent file storage
- [Flat Skill Discovery Constraint](#flat-skill-discovery-constraint) - Platform ignores nested subdirectories
- [HEREDOC Commit Message Parsing](#heredoc-commit-message-parsing) - Platform-specific commit format handling
- [The Vibe-Coding Drift](#the-vibe-coding-drift) - AI reverting to training bias in saturated context
- [Instructional Saturation](#instructional-saturation) - Loss of rule adherence in long context windows

---

## AI Agent Process Gotchas

### Agent Governance Drift

**Symptom:** The AI agent executes complex technical fixes but "forgets" to create issues, update roadmaps, or follow documented governance workflows.

**Gotcha:** AI reasoning defaults to "Problem → Solution" (technical execution) rather than "Project Management" (governance) under high technical focus.

**Real-World Example:**
You ask the AI to fix a bug. It writes code, creates tests, and commits changes... but never:
- Creates the GitHub issue tracking the bug
- Updates the project roadmap
- Links the commit to any tracking ID
- Documents the fix in project knowledge base

Six months later, you ask "why was this changed?" and there's no audit trail.

**Root Cause:**
- AI training data emphasizes code over process
- Technical problem-solving activates "fix it now" mode
- Documentation/governance steps aren't as "immediately rewarding"
- No structural forcing function (pre-commit hooks, required fields, etc.)

**Fix:**

1. **Enforce governance workflow:**
   ```
   Required sequence: Issue → Branch → Plan → Code → Document → Commit
   ```

2. **Pre-execution checklist:**
   ```markdown
   Before any code changes, verify:
   - [ ] Issue created (or existing issue identified)
   - [ ] Branch created from issue number
   - [ ] Plan documented in docs/plans/
   - [ ] Roadmap updated with this work
   ```

3. **Post-execution validation:**
   ```markdown
   Before closing task, verify:
   - [ ] Lesson learned documented (if non-trivial)
   - [ ] Knowledge graph updated (if reusable)
   - [ ] Commit message follows format
   - [ ] Issue linked in commit
   ```

4. **Use hooks/automation:** External scripts that check for governance artifacts (not bypassable by AI)

**Why This Matters:**
Lack of audit trail makes it impossible to track *why* a change happened later. The code works today, but the *reasoning* is lost.

**Cross-References:**
- **Pattern:** [[patterns.md#project-memory-system]]
- **Concept:** [[concepts.md#passive-vs-active-enforcement]]
- **Related:** [[Instructional Saturation](#instructional-saturation)]

---

## File Management Gotchas

### Plan File Location

**Symptom:** Plans created in temporary directories disappear after cleanup, losing important design documentation.

**Gotcha:** Confusing temporary working directories with permanent tracked locations.

**Real-World Example:**
- You create a plan in `.claude/plans/feature-design.md` (temporary platform directory)
- Work on the feature for 2 days
- Close the project
- Platform cleanup runs, deletes `.claude` temp directory
- Plan is gone, only code remains

**Root Cause:**
Many AI platforms use temporary directories for scratch work:
- `.claude/plans/` (Claude Code temporary)
- `.continue/` (Continue.dev temporary)  
- `.cursor/` (Cursor temporary)

These are *working directories*, not permanent storage.

**Fix:**

1. **Move plans to permanent location immediately:**
   ```bash
   # Wrong location (temporary)
   .claude/plans/feature-plan.md  

   # Right location (tracked in git)
   docs/plans/feature-plan.md
   ```

2. **Update .gitignore to protect temporary directories:**
   ```gitignore
   .claude/
   .continue/
   .cursor/
   ```

3. **Create workflow:**
   ```
   1. Generate plan in temporary location (fine for drafting)
   2. Review and finalize
   3. Move to docs/plans/ IMMEDIATELY
   4. Commit to git
   ```

4. **Add reminder to planning template:**
   ```markdown
   <!-- Remember: Move this file to docs/plans/ when finalized! -->
   ```

**Why This Matters:**
Plans capture *intent* and *reasoning*. Losing them means future developers (including yourself) only see *outcome* without understanding *why*.

**Cross-References:**
- **Pattern:** [[patterns.md#template-driven-docs]]
- **Concept:** [[concepts.md#automation-strategy]]
- **Gotcha:** [[Agent Governance Drift](#agent-governance-drift)]

---

## Platform-Specific Gotchas

### Flat Skill Discovery Constraint

**Symptom:** Skills/commands placed in nested subdirectories don't appear in the platform's command menu, despite being properly formatted.

**Gotcha:** Many AI platforms discover skills from **flat** skill directories only. Nested subdirectories are completely ignored by the discovery mechanism.

**Real-World Example:**
```
# This DOESN'T work on many platforms:
.agent/workflows/governance/validate-branch.md    ← NOT discovered
.agent/workflows/governance/validate-commit.md    ← NOT discovered
.agent/workflows/knowledge/capture-lesson.md      ← NOT discovered

# This DOES work:
.agent/workflows/gov-validate-branch.md           ← Discovered ✓
.agent/workflows/gov-validate-commit.md           ← Discovered ✓
.agent/workflows/know-capture-lesson.md           ← Discovered ✓
```

**Root Cause:**
Platform skill loaders enumerate files in the skill directory without recursion. This is often a performance optimization — scanning deeply nested directories on every command lookup would be slow.

**Fix:**

1. **Use flat structure with prefix naming:**
   ```
   gov-   → governance skills
   know-  → knowledge management skills
   proj-  → project-specific skills
   doc-   → documentation skills
   ```

2. **Organize via prefixes, not directories:**
   ```bash
   # Instead of:
   governance/git-branch.md
   governance/git-commit.md

   # Use:
   gov-validate-branch.md
   gov-git-commit.md
   ```

3. **Document the constraint:**
   Add to project README:
   ```markdown
   **Important:** This platform requires flat skill structure.
   Use prefixes (gov-, know-, proj-) for organization, not subdirectories.
   ```

**Why This Matters:**
Developers expect hierarchical organization to work. When it silently fails (no error, skills just don't appear), debugging is frustrating.

**Cross-References:**
- **Pattern:** [[patterns.md#functional-directory-structure]]
- **Concept:** [[concepts.md#template-driven-consistency]]
- **Related:** [[Platform documentation for your specific tool]]

---

### HEREDOC Commit Message Parsing

**Symptom:** Git commit validation hooks can't extract the commit message, causing false negatives (allowing invalid commits) or false positives (blocking valid ones).

**Gotcha:** Some platforms use HEREDOC format for multi-line commit messages, not simple `-m "message"` format.

**Real-World Example:**

**Simple format (what hooks expect):**
```bash
git commit -m "feat(scope): subject line"
```

**HEREDOC format (what platform actually uses):**
```bash
git commit -m "$(cat <<'EOF'
feat(scope): subject line

Body text here.

Closes #123

Co-Authored-By: AI Agent <noreply@example.com>
EOF
)"
```

A naive hook using `sed -n 's/.*-m "\(.*\)"/\1/p'` will fail because the HEREDOC expands the full message inline with embedded newlines.

**Root Cause:**
Platforms generating multi-line commits (with body, trailers, co-author tags) need HEREDOC to preserve formatting. Simple `-m` doesn't support newlines.

**Fix:**

1. **Handle BOTH formats in hooks:**
   ```bash
   # Try simple extraction first
   MESSAGE=$(echo "$COMMAND" | sed -n "s/.*-m[[:space:]]*[\"']\(.*\)[\"'].*/\1/p")
   
   # Fallback for HEREDOC (extract first line only for validation)
   if [ -z "$MESSAGE" ]; then
     MESSAGE=$(echo "$COMMAND" | sed -n 's/.*-m[[:space:]]*"\(.*\)"/\1/p' | head -n1)
   fi
   
   # Graceful degradation: if still empty, allow (don't block what you can't parse)
   if [ -z "$MESSAGE" ]; then
     exit 0
   fi
   ```

2. **Test hooks with actual platform commits:**
   ```bash
   # Generate a real commit via platform, inspect format:
   git log -1 --format=%B
   
   # Test hook against actual format
   ```

3. **Fallback principle:**
   - If extraction fails → **allow** commit (don't block)
   - False positives (blocking good commits) destroy developer trust
   - False negatives (allowing bad commits) can be fixed later

**Why This Matters:**
Blocking commits you can't parse creates developer friction without governance benefit. Developers will disable hooks they don't trust.

**Cross-References:**
- **Pattern:** [[patterns.md#positive-constraint-framing]]
- **Gotcha:** [[Flat Skill Discovery Constraint](#flat-skill-discovery-constraint)]
- **Concept:** [[concepts.md#passive-vs-active-enforcement]]

---

## AI Reasoning Gotchas

### The Vibe-Coding Drift

**Symptom:** AI agent ignores project-specific structure or terminology and generates output based on its "generic" understanding of the problem domain.

**Gotcha:** In context-heavy sessions (>4,000 lines), the model's training bias on what things "should look like" overrides specific project instructions.

**Real-World Example:**

**You specify:**
- Output format: XML with specific schema
- Terminology: Use "Phase 1", "Phase 2", etc.
- Structure: Include validation checkpoints

**AI generates:**
- Output format: Generic polished prose
- Terminology: Uses common industry terms it was trained on
- Structure: Skips validation, goes straight to "final" result

The AI "drifted" toward its "vibe" of what the output should be rather than your "architecture."

**Root Cause:**
- Training data creates strong priors about "good" output
- In long contexts (>4K lines), specific instructions lose "attention weight"
- Model falls back to training bias when uncertain
- "Polished" generic output *feels* correct to the model even when it's wrong for your project

**Fix:**

1. **Recency anchors:**
   Place critical format instructions at the absolute end of the prompt:
   ```markdown
   [4000 lines of context]
   ...
   
   CRITICAL FINAL INSTRUCTIONS (Re-read before outputting):
   - Output MUST be XML format (not prose)
   - Terminology MUST use "Phase 1" not "Step 1"
   - Validation checkpoints MUST appear before final output
   ```

2. **Pre-flight checklist:**
   Force AI to output rule mapping *before* generation:
   ```markdown
   Step 0: Output a table showing:
   - Rule ID | Project Requirement | How I will comply
   
   [AI outputs table - this "refreshes" the rules in working memory]
   
   Step 1: Now generate content following those rules...
   ```

3. **External validator:**
   Use external script to check output against project schema:
   ```bash
   # AI generates output
   # External validator checks:
   - Is it valid XML?
   - Does it use correct terminology?
   - Are checkpoints present?
   # If validation fails → reject output, AI must fix
   ```

4. **Explicit anti-drift instruction:**
   ```markdown
   WARNING: Your training data may suggest generic format is "good."
   For THIS project, generic format is WRONG.
   Follow the project schema EXACTLY, even if it feels unusual.
   ```

**Why This Matters:**
"Vibe coding" output *looks* good but doesn't meet project requirements. It passes human "glance test" but fails actual validation.

**Cross-References:**
- **Concept:** [[concepts.md#passive-vs-active-enforcement]]
- **Gotcha:** [[Instructional Saturation](#instructional-saturation)]
- **Pattern:** [[patterns.md#positive-constraint-framing]]

---

### Instructional Saturation

**Symptom:** AI correctly identifies a rule (e.g., "NEVER use em-dashes") but fails to apply it during generation.

**Gotcha:** In long context windows (>4,000 lines), instructions placed at the start or middle lose "priority weight." The AI knows the rule but lacks the "working memory" to hold it active during generation.

**Real-World Example:**

**You provide excellent documentation:**
- Line 100-150: Clear rule "Never use em-dashes (—), always use hyphens (-)"
- Line 500-600: Example showing correct hyphen usage
- Line 1000-1200: Rationale for why em-dashes are problematic
- Line 3000: (AI generates content) Uses em-dashes throughout

**AI's "reasoning" (if you ask):**
"I understand em-dashes should not be used based on the guidelines provided earlier."

**But it used them anyway!**

**Root Cause:**
- **Context window length ≠ context attention**
- Rules lose attention weight as distance from execution point increases
- At 4,000+ lines, passive documentation is insufficient
- Model has "read" the rule but doesn't maintain it in active working memory during token generation

**Fix:**

1. **Recency anchors (critical rules at end):**
   ```markdown
   [3500 lines of comprehensive documentation]
   ...
   
   === FINAL HARD CONSTRAINTS (re-read immediately before outputting) ===
   - Use hyphens (-) ONLY. Em-dashes (—) are REJECTED.
   - Character limit: 100-210 per item (count before submitting)
   - Chronological order REQUIRED (newest first)
   ```

2. **Pre-flight explicit check:**
   ```markdown
   Step 0: BEFORE generating content, output:
   - Forbidden characters: —, …, etc.
   - Required format: [specifics]
   - Validation method: [how you will check]
   
   [This forces AI to "reload" constraints into working memory]
   
   Step 1: NOW generate content...
   ```

3. **Negative validator (checks for forbidden patterns):**
   Create separate file: `output-validator.md`
   ```markdown
   Scan output for FORBIDDEN elements:
   - Contains em-dash (—)? → FAIL
   - Contains ellipsis (…)? → FAIL
   - Character count >210? → FAIL
   - Wrong chronological order? → FAIL
   ```

4. **Multi-turn workflow:**
   ```markdown
   Turn 1: Here are the rules. Acknowledge them.
   [AI acknowledges]
   
   Turn 2: NOW generate content following those rules.
   [AI generates with rules fresh in context]
   ```

**Why This Matters:**
The difference between "AI knows the rule" and "AI applies the rule" is attention weight. Long contexts reduce attention to early instructions.

**Real-World Evidence:**
Projects report rule adherence degrading from ~80% (early in session) to ~30% (after 4K+ lines of context). Same rules, same documentation, different position in context window.

**Cross-References:**
- **Gotcha:** [[The Vibe-Coding Drift](#the-vibe-coding-drift)]
- **Concept:** [[concepts.md#passive-vs-active-enforcement]]
- **Pattern:** [[patterns.md#positive-constraint-framing]]

---

## Common Patterns Across Gotchas

**Many gotchas share root causes:**

1. **Passive documentation is insufficient** (Agent Governance Drift, Vibe-Coding, Instructional Saturation)
   - Solution: Active enforcement (external validators, hooks, multi-turn workflows)

2. **Platform-specific behaviors surprise developers** (Flat Skill Discovery, HEREDOC Parsing)
   - Solution: Document platform constraints explicitly

3. **Temporary vs. permanent confusion** (Plan File Location)
   - Solution: Clear conventions for "working" vs. "tracked" directories

**Design Principles to Prevent Gotchas:**

- **Make the right thing easy:** Default paths should be permanent locations
- **Make the wrong thing obvious:** Temporary directories should have clear warnings
- **Test in realistic conditions:** Don't assume nested directories work, verify discovery
- **Fail gracefully:** If you can't validate, allow (don't block)
- **Document discovered constraints:** Each gotcha should become documented wisdom

**Cross-References:**
- **Concept:** [[concepts.md#passive-vs-active-enforcement]]
- **Pattern:** [[patterns.md#template-driven-docs]]
- **Pattern:** [[patterns.md#smart-defaults]]
