### Recall in Plan Mode

When plan mode is active (native `/plan` command, `superpowers:writing-plans`, or any
automated planning tool such as Ultraplan), invoke the `kmgraph:recall` skill with TWO
queries before making any plan recommendations:
1. The specific plan topic
2. The architectural domain of the change (rules, deployment, platform, cross-LLM, etc.)

Running only the topic query misses architectural ADRs and ENHs that constrain the work.

**Recall results take priority — reason about findings before recommending:**
- If recall surfaces a rejected approach, examine WHY it was rejected and whether that reason is still applicable.
- If still applicable: do not propose the approach; if unavoidable, explain why no workaround exists.
- If no longer applicable: may propose it, but must document why the old rejection no longer holds AND lay out full cascade impact on the project.
- If it is the only viable option: propose it, but lay out complete ramifications and cascade effects across all affected systems, skills, decisions, and docs.
- If recall finds nothing: write "No prior art found for [topic]." and proceed.

Include findings under a "## Prior Art" section at the top of the plan.
Do not skip — plan recommendations made without context contradict existing decisions.
