# issue-25: Acceptance Criteria

- [ ] A single documented rule states which path (hand-written `ENH-NNN` spec vs. `/kmgraph:kmg-start-issue-tracking`) governs enhancement capture, and under what conditions.
- [ ] The rule is discoverable from both entry points — referenced from `commands/kmg-start-issue-tracking.md` and from wherever the hand-written-spec convention is documented (currently nowhere explicit — also a finding of this issue).
- [ ] A `triggers.md` entry fires the check before a new `knowledge/enhancements/ENH-NNN/` directory is hand-created, so this ambiguity can't silently recur.
- [ ] Existing inconsistent history (ENH-041 through ENH-050, all hand-written with no command driving them) is either reconciled retroactively or explicitly grandfathered — decide, don't leave ambiguous.
