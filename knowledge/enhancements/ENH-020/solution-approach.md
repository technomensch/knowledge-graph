---
id: ENH-020
file: solution-approach
status: stub
---

# ENH-020 Solution Approach

_Stub — requires brainstorm session before filling in._

## Candidate Approaches

1. Hook-based pre-implementation gate (PreToolUse on Write/Edit for implementation files)
2. Skill-based cascade check invoked explicitly at plan approval
3. Inline prompt template in governance-rules.md

## Open Questions

- Should the cascade check be automated (hook) or prompted (skill)?
- Where does the profile ecosystem reference doc live? (`core/docs/` vs `core/templates/`)
- How does this integrate with the existing ENH-015 decision gate?
