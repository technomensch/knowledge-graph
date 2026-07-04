---
title: "ADR-056: Reject plugin-split for contributor-only doc commands; fix via repo-context auto-detection"
number: 056
status: Accepted
date: 2026-07-01
author: technomensch
email: mkitact@gmail.com
git:
  branch: v0.6.15-fix-init-completeness
  commit: 80c856db0deeaaffd3940a8c7bdf5aaa4b9b1a24
  pr: null
  issue: null
implements: null
related:
  adrs: [027]
  lessons: []
  kg_entries:
    - knowledge/chat-history/2026-04/2026-04-07-claude-part-02.md
    - knowledge/chat-history/2026-02/2026-02-20-claude-part-01.md
tags: [architecture, plugin-packaging, doc-commands, contributor-tools, kmg-update-doc, kmg-create-doc]
category: architecture
---

# ADR-056: Reject plugin-split for contributor-only doc commands; fix via repo-context auto-detection

**Date:** 2026-07-01
**Status:** Accepted
**Implements:** (design-first — no implementation commit yet; see ENH-033)
**Related:** [ADR-027](ADR-027-docusaurus-restructure-diataxis-docs-feed.md) (supersedes its deferred recommendation on this point), ENH-033 (implementation spec)

---

## Context

kmgraph ships the `kmg-update-doc` and `kmg-create-doc` commands to **all** installers. These commands were originally built to manage kmgraph's **own** documentation — `COMMAND-GUIDE.md`, `README.md`, `docs/CHEAT-SHEET.md` — all of which are kmgraph's own repo files, hardcoded as examples in `commands/kmg-update-doc.md`. The `--user-facing` flag enforces "v0.0.7 standards" (third-person voice, Section 508 accessibility, canonical structure), which are kmgraph's own documentation conventions, applied unconditionally regardless of which repo the target file lives in.

**Problem:**
- These contributor-oriented commands appear in every installer's `/kmgraph:` autocomplete, even though ordinary users update the *graph*, not kmgraph's docs.
- More seriously, the commands impose kmgraph's own house style onto any file they are pointed at — including an installer's unrelated project files.
- We needed to decide whether to solve this by splitting the contributor commands into a separate plugin, or by another mechanism.

**Scope:**
- In scope: the packaging/visibility decision for `kmg-update-doc` and `kmg-create-doc` (and the related `kmg-doc-update-router` skill).
- Out of scope: the detailed behavioral fix itself (captured separately in ENH-033).

**Technical finding (this session):** kmgraph's plugin manifest (`.claude-plugin/plugin.json`) has **no `commands` field** — Claude Code discovers commands by filesystem scan of the `commands/` directory. There is therefore **no runtime mechanism** to conditionally hide a command from `/kmgraph:` autocomplete based on a marker file or config flag. A command either exists as a `.md` file in `commands/` (always discoverable) or it does not. The **only** way to make a command invisible to a subset of installers is to ship it in a separate plugin.

---

## Decision

**Reject the plugin-split option. Do NOT create a `kmgraph-contrib` plugin.**

The three previously-floated options — separate `kmgraph-contrib` plugin, a `.kmgraph-contributor` marker file, and a `commands/contributing/` subdirectory — are all rejected. The problem is resolved instead through **behavioral repo-context auto-detection** (specified in ENH-033), plus lightweight labeling for residual discoverability.

---

## Rationale

### Why this approach

1. **Splitting is disproportionate.** Creating a second plugin for a 2–3 command difference means a second `plugin.json`, a second version track, a second install/update flow, cross-plugin reference complexity, and a breaking change for the one person (the maintainer) who actually uses the contributor path.
2. **The real defect is correctness, not packaging.** The dangerous behavior is that `kmg-update-doc` forces kmgraph's own v0.0.7 standards (third-person, Section 508) onto whatever file it targets, regardless of whose project it is. That is a correctness bug, not a distribution problem — and shipping the command in a second plugin would not fix it.
3. **Residual discoverability is low-harm.** Once the correctness bug is fixed via auto-detection, the only thing left is a cosmetic "why is this command in my autocomplete" question. That is solvable with labeling (the existing COMMANDS.md severity-dot markers, e.g. 🔴🟡) and a note in `kmg-help` — not an architecture change.

### Alternatives Considered

**Option A: Separate `kmgraph-contrib` plugin**
- Pros: Only true way to hide the commands from non-contributor autocomplete; clean separation of contributor vs. user surface.
- Cons: Second `plugin.json`, second version track, second install/update flow, cross-plugin reference complexity; breaking change for the sole contributor.
- Rejected because: Disproportionate cost for a 2–3 command delta, and it does not fix the underlying correctness bug.

**Option B: `.kmgraph-contributor` marker file**
- Pros: Lightweight, no second plugin.
- Cons: Technically impossible for visibility — command discovery is a filesystem scan with no config/marker gating hook. A marker file cannot hide a command from autocomplete.
- Rejected because: No runtime mechanism exists to act on the marker.

**Option C: `commands/contributing/` subdirectory**
- Pros: Organizational tidiness.
- Cons: Claude Code still scans subdirectories; the commands remain discoverable. Does not change visibility or behavior.
- Rejected because: Does not achieve hiding and does not fix the correctness bug.

### Trade-offs

**Benefits:**
- ✅ No packaging/version/install complexity added.
- ✅ Fixes the actual correctness bug (imposed house style) rather than the cosmetic symptom.
- ✅ No breaking change for the maintainer's contributor workflow.

**Costs:**
- ❌ The commands remain visible in every installer's autocomplete.

**Mitigation:**
- Label the commands as contributor-oriented using the existing severity-dot convention in COMMANDS.md / `docs/reference/commands.md`, and surface a clarifying note via `kmg-help`.

---

## Consequences

### Positive

1. **Correctness restored:** After ENH-033 lands, the doc commands stop imposing kmgraph's conventions on unrelated projects.
2. **Simplicity preserved:** Single-plugin architecture retained; no second version track.

### Negative

1. **Cosmetic clutter:** Contributor commands stay in the user-visible autocomplete surface (mitigated by labeling).

### Neutral

1. **ADR-027's deferred item is now resolved** for this specific point — no separate packaging follow-up is needed.

---

## Prior Discussion / History

This decision consolidates and closes prior art that was documented but never actioned:

- **ADR-027** (`ADR-027-docusaurus-restructure-diataxis-docs-feed.md`, ~line 300) flagged `update-doc`, `create-doc`, and the `doc-update-router` skill as "contributor-only tools shipping to all users." It was deferred with no follow-on ENH. **This ADR supersedes that deferred recommendation** and resolves it via ENH-033 rather than a packaging change.
- **Chat history 2026-04-08** (`knowledge/chat-history/2026-04/2026-04-07-claude-part-02.md`, part 2): the user stated directly that "those commands should only be available to contributors. Users of the kmgraph don't need to update the docs, they are updating the graph." The same three options (separate plugin, marker file, subdirectory) were floated and explicitly punted ("explore later").
- **Chat history 2026-02-20** (`knowledge/chat-history/2026-02/2026-02-20-claude-part-01.md`): an earlier precursor discussing `--user`/`--plugin` flag ambiguity for the same command.

---

## Related Decisions

- **[ADR-027](ADR-027-docusaurus-restructure-diataxis-docs-feed.md):** Supersedes its deferred recommendation to treat these as contributor-only tools; that item is resolved here via behavioral auto-detection.
- **[ADR-058](ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings.md):** Cites this ADR as evidence — the scope-leakage instance of the broader process gap it governs (a missing upfront naming/scope check for new commands/skills). This ADR's individual fix is not re-decided there; ADR-058 adds a preventive governance layer above it.

---

## Future Considerations

1. **If the contributor base grows** beyond the maintainer, revisit whether autocomplete clutter warrants a packaging change; the plugin-split option can be reconsidered at that point.
2. **Monitor** whether labeling + `kmg-help` notes are sufficient to prevent user confusion.

---

**Decision Made:** 2026-07-01
**Last Updated:** 2026-07-01
**Status:** Accepted
