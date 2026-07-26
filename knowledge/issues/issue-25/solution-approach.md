# issue-25: Solution Approach

**Status:** Deferred — sketch only, not scoped for implementation.

## Proposed Direction

Likely needs a small ADR (not just a rules.md line) since it's a real trade-off decision, not a mechanical fix. Candidate resolution shapes:

1. **Weight-based split, documented explicitly:** lightweight `ENH-NNN` hand-write for "just capture the idea, no immediate branch/issue needed" (i.e. what Track-only / Mode 3 already produces if routed through the formal command); reserve direct hand-authoring only for the case where no git repo / no GitHub remote exists at all. Effectively: always route through `/kmgraph:kmg-start-issue-tracking`, let its Mode 3 (Track only) serve the "lightweight" need instead of a second, undocumented shortcut.
2. **Formalize the shortcut:** keep both paths, but write down the actual decision rule (e.g. "hand-write only when explicitly told to skip the workflow; default is always `kmg-start-issue-tracking`") in `rules.md`, with a trigger in `triggers.md`.
3. **Retire the shortcut entirely:** deprecate ad hoc `ENH-NNN` hand-writing, require `kmg-start-issue-tracking` for all new enhancement entries going forward — accept the process weight as the cost of consistency.

## Open Questions (not resolved here)

- Is the GitHub-issue-creation step in `kmg-start-issue-tracking` too heavy for genuinely small deferred ideas, or is that exactly what Mode 3 already solves and the real fix is just "always use the command, let Mode 3 be the lightweight path"?
- Should this become a `triggers.md` entry (e.g. "before creating any file under `knowledge/enhancements/`, check this rule") so the gap can't silently recur the way it just did?
