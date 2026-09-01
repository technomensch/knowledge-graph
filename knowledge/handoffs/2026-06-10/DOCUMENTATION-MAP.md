# Documentation Map — knowledge-graph

Generated: 2026-06-10

## commands/ (25 files)

Slash command definitions — PROTECTED, do not modify without explicit user permission.

```
add-category.md
capture-lesson.md
check-sensitive.md
config-sanitization.md
create-adr.md
create-doc.md
extract-chat.md
handoff.md
help.md
init-personal-kg.md
init.md
link-issue.md
list.md
meta-issue.md
migration.md
recall.md
session-summary.md
setup-platform.md
start-issue-tracking.md
status.md
switch.md
sync-all.md
update-doc.md
update-graph.md
update-issue-plan.md
```

## skills/ (15 subdirectories)

Auto-triggered context providers — invoked automatically at workflow phase transitions.

```
adr-guide
brainstorm-recall
capture-router
doc-update-router
docs-impact-scan
gov-execute-plan
gov-plan-gate
kg-recall
knowledge-graph-usage
lesson-capture
rules-capture
session-wrap
sidebar-update
stuck-work-escalation
update-profile
```

## agents/ (11 files)

Heavy-lift subagent definitions — invoked explicitly to handle large tasks outside main context.

```
create-adr-agent.md
knowledge-extractor.md
knowledge-reviewer.md
lesson-capture-agent.md
mcp-setup-agent.md
platform-sync-agent.md
recall-agent.md
rules-capture-agent.md
session-documenter.md
session-summary-agent.md
sync-all-agent.md
```

## knowledge/decisions/ (ADRs)

**Total ADRs:** 51

### Last 5 ADRs

| File | Summary |
|---|---|
| ADR-047 | (see file) |
| ADR-048 | (see file) |
| ADR-049-review-audit-protocol-post-plan-pre-push-review-governance.md | Governs when the review audit protocol fires — post-plan, pre-push |
| ADR-050-pre-push-composite-gate-inline-recommendation-gate.md | Pre-push composite gate + inline recommendation gate design |
| ADR-051-session-summary-handoff-asymmetric-coupling.md | Session-summary reads handoff (asymmetric, one-way coupling); handoff does not read session-summary |

Note: `ADR-template.md` and `README.md` are present in the directory alongside ADR files.

## knowledge/lessons-learned/ (by category)

Top-level directory contains 4 category subdirectories plus 2 root-level files.

| Category | File Count |
|---|---|
| architecture | 10 |
| debugging | 8 |
| patterns | 18 |
| process | 16 |
| **Total categorized** | **52** |
| Root-level files | `lesson-template.md`, `Lessons_Learned_gh_issue_create_omission.md`, `Lessons_Learned_InBand_Version_Warning_Burst_Cadence_Pattern.md`, `README.md` |
