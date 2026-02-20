# Documentation Consolidation Plans - Scenario A

**Version**: v0.0.7-alpha
**Created**: 2026-02-19
**Status**: Ready for execution

---

## Quick Start

1. **Review** [Master Plan](v0.0.7-alpha-documentation-consolidation-MASTER.md) for overview
2. **Check** [Parallelization Guide](PARALLELIZATION-GUIDE.md) for speed optimization
3. **Execute** sessions in order (or parallelize 2+3 and 4+5)
4. **Track** progress in Master Plan status table

---

## Plan Files

### Overview
- [**Master Plan**](v0.0.7-alpha-documentation-consolidation-MASTER.md) - Project overview, timeline, all sessions
- [**Parallelization Guide**](PARALLELIZATION-GUIDE.md) - Which sessions can run simultaneously

### Phase 1: Critical UX Fixes (Sessions 1-6)

| Session | File | Time | Model | Parallelize? |
|---------|------|------|-------|--------------|
| 1 | [Rename SETUP.md to CONFIGURATION.md](v0.0.7-alpha-p1-s1-fix-readme-setup.md) | 0.5-1h | Sonnet | ❌ No (foundational) |
| 2 | [Command Tags + Cheat Sheet](v0.0.7-alpha-p1-s2-command-tags-cheatsheet.md) | 1-1.5h | Sonnet | ✅ Yes (with S3) |
| 3 | [Template Field Glossaries](v0.0.7-alpha-p1-s3-template-glossaries.md) | 1-1.5h | Sonnet | ✅ Yes (with S2) |
| 4 | [Create CONCEPTS.md](v0.0.7-alpha-p1-s4-create-concepts.md) | 2-2.5h | Opus | ✅ Yes (with S5) |
| 5 | [Create COMMAND-GUIDE.md](v0.0.7-alpha-p1-s5-create-command-guide.md) | 1.5-2h | Opus | ✅ Yes (with S4) |
| 6 | [Simplify WORKFLOWS.md](v0.0.7-alpha-p1-s6-simplify-workflows.md) | 2-2.5h | Sonnet | ❌ No |

**Phase 1 Total**: 9-10.5 hours

---

### Phase 2: Consolidation & Navigation (Sessions 7-9)

| Session | File | Time | Model | Parallelize? |
|---------|------|------|-------|--------------|
| 7 | [Create GETTING-STARTED.md](v0.0.7-alpha-p2-s1-getting-started.md) | 2-2.5h | Sonnet | ❌ No |
| 8 | [Add Cross-References](v0.0.7-alpha-p2-s2-cross-references.md) | 2-2.5h | Sonnet | ❌ No |
| 9 | [Create NAVIGATION-INDEX.md](v0.0.7-alpha-p2-s3-navigation-index.md) | 2-2.5h | Sonnet | ❌ No |

**Phase 2 Total**: 6-7 hours

---

## Execution Strategies

### Sequential (Safest)
Execute sessions 1-9 in order, one at a time.
- **Total time**: 14-18.5 hours
- **Risk**: Low
- **Best for**: First-time execution, solo work

### Parallel (Faster, Recommended)
Execute Sessions 2+3 simultaneously, then Sessions 4+5 simultaneously (see [Parallelization Guide](PARALLELIZATION-GUIDE.md))
- **Total time**: 11.5-15 hours
- **Time saved**: 3-4 hours
- **Risk**: Low (two parallelization points, both touch different files)
- **Best for**: Experienced users, have Gemini available

---

## Progress Tracking

**Update the Master Plan status table as you complete sessions:**

```markdown
| Session | Branch | Model | Status |
|---------|--------|-------|--------|
| 1 | v0.0.7-alpha-p1-s1 | Sonnet | ✅ Complete |
| 2 | v0.0.7-alpha-p1-s2 | Sonnet | 🔄 In Progress |
| 3 | v0.0.7-alpha-p1-s3 | Sonnet | ⬜ Not Started |
...
```

**Status symbols**:
- ⬜ Not Started
- 🔄 In Progress
- ✅ Complete
- ⚠️ Blocked
- 🔁 Needs Revision

---

## Git Workflow

**Each session follows this pattern**:

1. **Start**: Create branch from base
   ```bash
   git checkout v0.0.7-alpha-gitbook-docs
   git pull origin v0.0.7-alpha-gitbook-docs
   git checkout -b v0.0.7-alpha-p1-s1  # Session 1 example
   ```

2. **Work**: Make changes per session plan

3. **Commit**: Descriptive message
   ```bash
   git add [files]
   git commit -m "docs: [session description]

   - [Change 1]
   - [Change 2]

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
   ```

4. **Push**: To remote for review
   ```bash
   git push -u origin v0.0.7-alpha-p1-s1
   ```

5. **Review**: Branch remains open for manual review
   - **DO NOT** merge automatically
   - Branches will be merged manually after review
   - This allows for parallel session execution and better change control

6. **Next**: Start next session from base (sessions can run in parallel)

---

## Checkpoints

### After Session 3 (Optional)
- Review Sessions 1-3 work
- Test simplified templates with users
- Validate no regressions

### After Session 6 (REQUIRED - End of Phase 1)
- **User testing**: Test Phase 1 improvements with beginner users
- **Validation**: Measure time-to-first-lesson (<10 min target)
- **Decision**: Proceed to Phase 2 or iterate on Phase 1?

### After Session 9 (FINAL)
- **End-to-end testing**: All 5 user journeys
- **Quality validation**: All docs pass link check, zero undefined jargon, all cross-references bidirectional
- **Deployment decision**: Use as-is or proceed to hosting (Scenario B/C)?

---

## Acceptance Criteria Summary

**Phase 1 Success** (After Session 6):
- [ ] Installation contradiction resolved
- [ ] Command difficulty tags added
- [ ] Templates have field explanations
- [ ] CONCEPTS.md glossary created
- [ ] COMMAND-GUIDE.md learning path created
- [ ] WORKFLOWS.md simplified
- [ ] User reaches first lesson in <10 minutes

**Phase 2 Success** (After Session 9):
- [ ] GETTING-STARTED.md user routing created
- [ ] All docs cross-referenced
- [ ] NAVIGATION-INDEX.md sitemap created
- [ ] No documentation orphans (all reachable from README)
- [ ] User can find any doc in <3 clicks
- [ ] All links validated

**Final Success** (Scenario A Complete):
- [ ] Time-to-first-lesson: <10 min for Claude Code users, <15 min for others
- [ ] Navigation: Any doc reachable from README in <=3 clicks
- [ ] Jargon: Zero undefined technical terms in user-facing docs
- [ ] All user journeys tested successfully
- [ ] Git history clean, all sessions merged
- [ ] Documentation reviewed and approved

---

## Token Usage Budget

**Phase 1**: ~205K tokens (6 sessions)
- Sonnet 4.5: ~110K tokens (Sessions 1, 2, 3, 6)
- Opus 4.6: ~95K tokens (Sessions 4, 5)

**Phase 2**: ~105K tokens (3 sessions)
- Sonnet 4.5: ~105K tokens (Sessions 7, 8, 9)

**Total**: ~310K tokens across 9 sessions

**Pro Plan Pacing**: 2-3 sessions per day max

---

## File Locations

**All session plans**: `/docs/plans/`
- Master plan
- Individual session plans (9 files)
- Parallelization guide
- This README

**Modified files during execution**: Various locations
- `/README.md`
- `/docs/*.md` (new files)
- `/core/docs/*.md`
- `/core/templates/**/*.md`

---

## Quick Commands

**List all plan files**:
```bash
ls -lh docs/plans/
```

**Check session status** (from Master Plan):
```bash
grep "Session [0-9]" docs/plans/v0.0.7-alpha-documentation-consolidation-MASTER.md
```

**View current session plan**:
```bash
# Replace X with session number
cat docs/plans/v0.0.7-alpha-p1-sX-*.md
```

---

## Next Steps

1. **Read** [Master Plan](v0.0.7-alpha-documentation-consolidation-MASTER.md) for full context
2. **Decide** execution strategy (sequential vs parallel)
3. **Review** [Session 1 plan](v0.0.7-alpha-p1-s1-fix-readme-setup.md)
4. **Start** Session 1 when ready

---

## Support

**Questions about**:
- Execution order → See [Master Plan](v0.0.7-alpha-documentation-consolidation-MASTER.md)
- Parallelization → See [Parallelization Guide](PARALLELIZATION-GUIDE.md)
- Specific session → Open individual session plan file
- Git workflow → See "Git Workflow" section above

**Encountering issues**:
- Check session plan "Troubleshooting" section
- Review "Verification Commands" in session plan
- Validate acceptance criteria met

---

**Created**: 2026-02-19
**Last Updated**: 2026-02-20 (Opus review revision)
**Version**: v0.0.7-alpha
**Status**: Ready for execution
