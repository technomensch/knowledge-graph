# Knowledge Graph - Workflows

Quick-reference workflows and standard operating procedures.

---

## Workflow Template

Copy this template for each new workflow:

```markdown
## Workflow Name

**Quick Reference:**
- **Purpose:** [What this workflow accomplishes]
- **Trigger:** [When to use this workflow]
- **Steps:** [High-level sequence]

**Detailed Steps:**
1. [Step 1 description]
2. [Step 2 description]
3. [Step 3 description]

**Integration:**
- **Prerequisites:** [What must be done first]
- **Outputs:** [What this produces]
- **Next Steps:** [What typically follows]

**Evidence:**
[Link to lesson learned](../../lessons-learned/process/lesson-file.md) — [Context]

**See Also:** [Related workflows, skills, automation]
```

---

## Instructions

1. **Clear triggers:** Specify when to use this workflow
2. **Repeatable:** Steps should be executable by anyone
3. **Automation references:** Link to skills or scripts that automate this
4. **Exception handling:** Document what to do when things go wrong
5. **Continuous improvement:** Update as workflow evolves

---

## KG Initialization Workflow

**Quick Reference:**
- **Purpose:** Set up knowledge graph for new environment or user
- **Trigger:** First-time plugin setup or new KG needed
- **Steps:** Run setup wizard → configure path → select type (project-local/personal/cowork) → activate

**Detailed Steps:**
1. Run `/kg-sis:init` command
2. Choose KG type (project-local, personal, cowork, or custom path)
3. Specify storage location
4. Wizard creates directory structure (lessons-learned/, decisions/, knowledge/)
5. Automatically sets as active KG
6. Ready for `/kg-sis:capture-lesson` and related commands

**Integration:**
- **Prerequisites:** Plugin installed, user auth configured
- **Outputs:** Active KG with empty structure, ready for content
- **Next Steps:** Run `/kg-sis:capture-lesson` to start capturing knowledge

**Evidence:**
[ADR-001: Centralized Multi-KG Configuration](../../decisions/ADR-001-centralized-multi-kg-configuration.md)

---

## Lesson Capture → KG Extraction Workflow

**Quick Reference:**
- **Purpose:** Convert lessons learned into structured knowledge graph entries
- **Trigger:** After solving a significant problem or discovering a pattern
- **Steps:** Capture lesson → Create/link ADR → Extract to KG → Sync all

**Detailed Steps:**
1. Run `/kg-sis:capture-lesson` to document problem, solution, evidence
2. System detects if architectural decision involved
3. If decision: create or link ADR; establish bidirectional links
4. Run `/kg-sis:update-graph --lesson=[filename]` to extract patterns/gotchas/concepts
5. Optional: `/kg-sis:sync-all` to batch-update knowledge across all KGs

**Integration:**
- **Prerequisites:** Active KG, git repo context
- **Outputs:** Lesson file + optional ADR + optional KG entries
- **Next Steps:** Commit changes; continue development

**Evidence:**
[Validation-to-Implementation Workflow Pattern](../../lessons-learned/process/Lessons_Learned_Validation_to_Implementation_Workflow.md)
`/kg-sis:capture-lesson` skill (Step 4.8 ADR detection)

**Related Skills:** `/kg-sis:capture-lesson`, `/kg-sis:update-graph`, `/kg-sis:create-adr`

---

## Local Marketplace Testing Workflow

**Quick Reference:**
- **Purpose:** Test plugin changes through marketplace before actual deployment
- **Trigger:** Before publishing new version; verifying marketplace behavior
- **Steps:** Dev directory → rsync to cache → test in marketplace → iterate

**Detailed Steps:**
1. Make changes in `~/.claude/plugins/dev/[plugin-name]/`
2. Run `rsync -av` to sync to marketplace cache location
3. Restart Claude Code IDE
4. Test plugin through marketplace interface
5. If changes needed: edit in dev dir, rsync again
6. Once satisfied: commit to git main branch

**Integration:**
- **Prerequisites:** Plugin development setup, rsync available
- **Outputs:** Verified marketplace behavior before actual deployment
- **Next Steps:** Merge to main; update marketplace

**Evidence:**
[Local Marketplace Testing Workflow](../../lessons-learned/process/local-marketplace-testing-workflow.md)
[Two-Location Sync Pattern](patterns.md#two-location-sync-for-testing)

**Automation:** Potential for pre-commit hook to auto-sync during testing

---

## Plan-Driven Development Workflow

**Quick Reference:**
- **Purpose:** Systematically implement complex features using validated plans
- **Trigger:** Starting work on major feature; uncertainty about approach
- **Steps:** Create plan with checkboxes → implement phases → verify → commit

**Detailed Steps:**
1. Create plan file in `docs/plans/v{version}-{slug}.md`
2. Outline implementation phases with specific tasks
3. Check boxes incrementally as work completes
4. Before each commit: verify related phase is complete
5. After all phases: final validation and integration test
6. Commit all changes with reference to plan file

**Integration:**
- **Prerequisites:** Feature scope understood, architectural approach decided
- **Outputs:** Implementation complete, tracked, verifiable
- **Next Steps:** Create PR with plan file reference; merge after review

**Evidence:**
[Validation-to-Implementation Workflow Pattern](../../lessons-learned/process/Lessons_Learned_Validation_to_Implementation_Workflow.md)
[Session Parallelization Pattern](../../lessons-learned/process/Lessons_Learned_Session_Parallelization.md)

**Related:** `/kg-sis:update-issue-plan` for GitHub integration

---

## Version Release Process Workflow

**Quick Reference:**
- **Purpose:** Systematically release new version with complete documentation
- **Trigger:** Feature complete; ready to publish
- **Steps:** Update version → CHANGELOG → README → create commit → push branch → await review

**Detailed Steps:**
1. Update version in `plugin.json` and `marketplace.json`
2. Add CHANGELOG entry with all changes, ADRs, lessons
3. Update README.md with new features/links
4. Update any affected documentation
5. Commit: `git commit -m "release(v{version}): [summary]"`
6. Push branch to origin
7. Wait for manual review (don't auto-merge)
8. Merge to main after approval

**Integration:**
- **Prerequisites:** All features tested, docs updated, CHANGELOG ready
- **Outputs:** New version on main, marketplace updated on push
- **Next Steps:** Monitor for issues; iterate if needed

**Evidence:**
Phase 3 CHANGELOG backfill (v0.0.7-v0.0.8.4) demonstrates release tracking

---

## Documentation Standards Enforcement Workflow

**Quick Reference:**
- **Purpose:** Ensure all user-facing documentation meets accessibility and quality standards
- **Trigger:** Before committing documentation changes
- **Steps:** Write doc → Validate language → Check 508 compliance → Review links → Commit

**Detailed Steps:**
1. Write or update documentation file
2. Run validation: `grep -iE "\b(you|your|we|our|they|them)\b" [file]` (third-person only for comprehensive docs)
3. Verify Section 508 compliance:
   - Logical heading hierarchy (no skipped H-levels)
   - Descriptive link text (never "click here")
   - Tables have headers
   - Images have alt text
   - Diagrams have text alternatives
4. Verify bidirectional links to lessons/ADRs
5. Test links work; fix broken references
6. Commit with clear message

**Integration:**
- **Prerequisites:** Documentation written, structure planned
- **Outputs:** Standards-compliant, accessible documentation
- **Next Steps:** Ready for publication

**Evidence:**
[ADR-008: Third-Person Language Standard](../../decisions/ADR-008-third-person-language-standard.md)
MEMORY.md v0.0.7 Documentation Standards

**Related:** `/knowledge:create-doc` generates compliant templates

---

## Session Parallelization Workflow

**Quick Reference:**
- **Purpose:** Run multiple development sessions in parallel for large tasks
- **Trigger:** Task involves multiple independent file changes
- **Steps:** Plan file partitioning → name branches → run parallel sessions → merge sequentially

**Detailed Steps:**
1. **Audit task:** What files will be modified?
2. **Partition work:** Group tasks so each touches different files
3. **Create branches:**
   - Session A: `v0.0.x-alpha-p1-s1` (files 1-N)
   - Session B: `v0.0.x-alpha-p1-s2` (files N+1-M)
4. **Run sessions in parallel:** Both sessions work simultaneously
5. **Merge sequentially:**
   - Merge session A → main
   - Merge session B → main
   - Verify no merge conflicts (proves files didn't overlap)
6. **Documentation:** Note which session owns which files

**Integration:**
- **Prerequisites:** Clear task boundaries; file-level independence confirmed
- **Outputs:** 50% time reduction vs sequential; clean linear git history
- **Next Steps:** Continue with dependent tasks

**Evidence:**
[Session Parallelization Pattern](../../lessons-learned/process/Lessons_Learned_Session_Parallelization.md)
v0.0.7 documentation consolidation used this workflow (Sessions 1+2 parallel, Session 3 sequential)

**Safety Guarantee:** Git conflicts = file overlap; zero overlap = zero conflicts

