# ENH-036: `kmg-capture-router` as the sole detection engine — 5 detection skills consolidated to 2

**Status:** ⚪ Withdrawn
**Discovered:** 2026-07-01 (unblocked 2026-07-03; **scope revised three times 2026-07-03** — see Problem)
**Governed by:** [ADR-057](../../decisions/ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md) (characterization + the four 2026-07-03 amendments — the first correcting its original deferral, the **second narrowing "one skill replacing all 5" → a shared engine backing 3 of 5**, the **third naming that engine `kmg-capture-router` (original intent restored) and bringing all 5 skills into scope**, and the **fourth eliminating `kmg-lesson-capture` / `kmg-adr-guide` / `kmg-rules-capture` as skill files entirely — net 5 skills → 2**), [ADR-058](../../decisions/ADR-058-naming-scope-upfront-check-for-new-commands-skills-docstrings.md) (governance)
**Related:** [ADR-034](../../decisions/ADR-034-capture-level-routing-dispatcher-agent-split.md) (precedent: detection/routing split), [ADR-045](../../decisions/ADR-045-update-profile-skill-not-command.md) (`kmg-update-profile`'s "rule without trigger = incomplete" rationale — the source of the `triggers.md`-completeness logic now owned solely by `update-profile`). **The sole detection engine:** `skills/kmg-capture-router/` — the single detection/classification engine for **all 5 original signal types**, trigger surface deliberately broadened to catch the implicit cues; dispatches to `/kmgraph:kmg-capture-lesson`, `/kmgraph:kmg-create-adr`, and `kmg-update-profile`. **The sole profile-file writer:** `skills/kmg-update-profile/` — owns all writes to `me.md` / `rules.md` / `triggers.md` (including the `triggers.md`-completeness check), reached via its own explicit trigger and via internal hand-off from `capture-router`. **Eliminated as skill files:** `skills/kmg-lesson-capture/`, `skills/kmg-adr-guide/`, `skills/kmg-rules-capture/` — detection folds into `capture-router`, writing was already owned by existing destinations. **Net: 5 skills → 2. Zero capability lost.** [issue-37](../../issues/issue-37/issue-37-description.md) (adjacent but answers a different question — this ENH is skill consolidation, issue-37 is whether `kmg-sync-all` should auto-trigger at all; backlinked 2026-08-19)

---

> **STATUS: WITHDRAWN (2026-07-03).** After extensive same-day investigation testing 4 different consolidation architectures, all were independently found flawed. Final decision: no consolidation — see [ADR-057](../../decisions/ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md)'s rewritten Decision section. This spec is preserved below as a historical record of what was considered and rejected, not as an active implementation target.

---

## Problem

> **Scope revised a FOURTH time today, 2026-07-03 (fourth revision).** Governed by [ADR-057](../../decisions/ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md)'s **fourth 2026-07-03 amendment**. The third revision (below) kept `kmg-rules-capture` alive as a skill that *"gains"/"borrows"* a `triggers.md` check while remaining a skill, and described `kmg-update-profile` as merely *"sharing"* sub-logic. **That is superseded by a cleaner split, extended to two more skills.** The corrected end-state is **5 skills → 2**:
> - **`kmg-capture-router` becomes the sole detection engine for all 5 original signal types.** Its trigger surface is **deliberately broadened** to catch the three implicit detectors' cues (lesson / ADR / rule-correction) in addition to its own explicit "capture that" phrasing. It dispatches internally to destinations it **already dispatches to today** — verified directly from its own "Detect Type + Subtype + Location" table: `/kmgraph:kmg-capture-lesson` (Lesson), `/kmgraph:kmg-create-adr` (ADR), and (revised per Correction 1) `kmg-update-profile` (Rule/Me — its table currently reads `rules-capture-agent`).
> - **`kmg-lesson-capture`, `kmg-adr-guide`, and `kmg-rules-capture` are ALL eliminated as skill files** — not reinforced, not partially kept. Detection for all three folds into `capture-router`; their writing was **already owned by destinations that already exist and already work**, so no new write-logic is needed anywhere.
> - **`kmg-update-profile` becomes the sole owner of writes to the three profile files** (`me.md` / `rules.md` / `triggers.md`, including the `triggers.md`-completeness check). It is reached **two ways**: its own explicit "update my profile" trigger (unchanged) *and* internally, via hand-off from `capture-router` when a signal is classified as a rule/correction.
> - **The trigger-precision trade-off is a deliberate, considered choice** — `capture-router`'s own `description` will grow broader than today; the maintainer weighed the earlier "narrow descriptions match more reliably" finding and accepts a broader `capture-router` description as the price of collapsing 5 skills to 2 with **zero capability lost**. This is not a silently reintroduced objection.
> See ADR-057's fourth amendment for the full findings, including the honesty caveat on the "restored original intent" premise for `capture-router`.
>
> *(Third revision, 2026-07-03 third amendment — now superseded on the `rules-capture` framing and extended to `lesson-capture`/`adr-guide`:* the engine is `kmg-capture-router` itself, restored original intent, not a new library; the individual detectors keep their own narrow platform-facing trigger `description`s; `kmg-update-profile`'s explicit trigger stays as-is. *These points still hold. What changed: the third revision kept `rules-capture` as a skill "gaining/borrowing" `triggers.md` logic and touched only some skills; the fourth eliminates `rules-capture`/`lesson-capture`/`adr-guide` as skill files entirely, moving writing to already-existing destinations and making `update-profile` the sole profile writer.)*
>
> *(First/second revisions, 2026-07-03 second amendment — superseded earlier:* "full consolidation into one shared classifier skill replacing all 5" → "a shared confidence/exclusion **engine** (new library) backing **3 of the 5** skills, the 2 explicit routers untouched." *The reasoning that still holds: the 5 skills split into 3 implicit detectors + 2 explicit routers; a single broad skill `description` would dilute Claude Code's trigger-matching precision — which is why the three individual detectors' own trigger declarations are still NOT merged even as their skill files are eliminated; and the real duplication lives in classification* logic*, not in trigger declarations.)*

As characterized in [ADR-057](../../decisions/ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md), among the 5 detection skills, **3 implicitly-triggered detectors** duplicate confidence-scoring/exclusion logic with **no shared confidence model** and **reactively-patched cross-skill exclusions**:

1. `kmg-lesson-capture` — bug-solved / breakthrough signals ("figured it out," "turns out," "the problem was")
2. `kmg-adr-guide` — architectural-decision signals ("we should switch to," "decision between," "should be redesigned")
3. `kmg-rules-capture` — implicit behavioral-correction signals mid-session ("always run npm build," "don't do X" as a standing rule)

These 3 fire on **fuzzy, ambiguous natural-language cues the user never directly asks for** — the case that genuinely needs a shared confidence/exclusion model. **Their detection logic all folds into `kmg-capture-router`, and all three skill files are eliminated** (fourth amendment). Their writing was already owned by destinations that already exist (below).

The other **2 skills are explicit routers**: `kmg-update-profile` ("update my profile") and `kmg-capture-router` ("capture that" / "remember that") fire on near-exact phrase matching. **Under the fourth amendment, these two are the only surviving skills:**

- **`kmg-capture-router` is the sole detection engine for all 5 signal types.** Per ADR-057's third amendment (Finding A), its current narrow "explicit-phrase-only, non-overlapping" scope is believed to be a **prior Claude session's 2026-03-30 narrowing (ENH-008), not the maintainer's original design intent** — the archive is silent, and the maintainer's judgment (adopted as working premise) is that `capture-router` was meant to be the general "fork in the road" dispatcher for **all** signal types. Its **trigger surface is deliberately broadened** to catch the three implicit detectors' cues; its existing "Detect Type + Subtype + Location" logic **becomes the single classification engine**. Verified directly from its SKILL.md this session, that table **already contains built, working dispatch entries** for exactly the three destinations the eliminated detectors route to: **Lesson → `/kmgraph:kmg-capture-lesson`**, **ADR → `/kmgraph:kmg-create-adr`**, and **Rule/Me → `rules-capture-agent`** (the last redirected to `kmg-update-profile` per Correction 1). So `capture-router` already has fully-working dispatch logic for these three — it just currently only reaches it via its own narrow "capture that" trigger.
- **`kmg-update-profile` is the sole profile-file writer.** Per ADR-057's third amendment (Finding B), it and the (now-eliminated) `kmg-rules-capture` were **not cleanly separate jobs** — both write corrections/rules to the profile files (one explicit, one implicit). `kmg-update-profile`'s SKILL.md states the rule *"Rule without trigger = incomplete... always check whether a trigger entry is also needed in `triggers.md`"* (the reason it was created, per ADR-045). Its explicit "update my profile" trigger stays exactly as-is (still deterministic), and it gains a **second internal entry point**: `capture-router` hands off rule/correction content to it directly. It thereby becomes the **single owner of all writes to `me.md` / `rules.md` / `triggers.md`, including the `triggers.md`-completeness check** — regardless of which path fired.

**The verified `kmg-rules-capture` bug (Finding B), and why elimination — not "borrowing" — fixes it.** `kmg-rules-capture`'s entire routing table (verified via direct grep) covers exactly four destinations — `knowledge/rules.md`, `knowledge/me.md`, `~/.kmgraph/rules.md`, `~/.kmgraph/me.md` — and **never mentions `triggers.md`.** It writes implicit corrections straight to a rules/me file with **no check** for whether a corresponding trigger entry is needed. This is the **exact "rule without trigger = incomplete" bug `kmg-update-profile` was specifically built to prevent** — just on the implicit-detection path. The third amendment's fix taught `rules-capture` to *borrow* the check while staying a skill; **the fourth amendment's cleaner fix eliminates `rules-capture` entirely** and routes its detection through `capture-router` to `kmg-update-profile`, which **already owns** the `triggers.md`-completeness check. The bug disappears because the buggy write-path is deleted, not patched. This is a **concrete, verified defect, not an architecture preference.**

A recall investigation (ADR-057) proved these accreted over 2+ months with no governing spec: two born in one generic batch commit, others each created for a one-off gap, cross-skill coupling patched in reactively within a day of creation. Each of the 3 implicit detectors re-implements its confidence/exclusion logic for its own trigger vocabulary, with no shared source of truth and ad-hoc cross-skill exclusions (e.g. `rules-capture` excluding `lesson-capture`'s territory) instead of one centralized model — now centralized into `kmg-capture-router`, with the three detector skill files eliminated.

---

## Proposed Behavior

*(Revised 2026-07-03, fourth amendment — 5 skills → 2. Do not reinstate the third revision's "rules-capture gains/borrows a check while staying a skill" framing.)*

**`kmg-capture-router` is the sole detection engine for all 5 original signal types.** Do **not** build a new, unnamed library — `kmg-capture-router`'s existing, already-proven **"Detect Type + Subtype + Location"** classification logic becomes the single source of truth for "how confident is this signal, which type is it, and where does it go?" This is understood as **restoring `capture-router`'s original intended general-dispatcher role**, not inventing new machinery (see Problem and ADR-057's third/fourth amendments — including the honesty caveat that this "original intent" is the maintainer's adopted working premise, not archive-verified).

**Its trigger surface is deliberately broadened.** `kmg-capture-router` now fires on the three implicit detectors' cues (lesson: "figured it out" / "turns out" / "the problem was"; ADR: "we should switch to" / "decision between" / "should be redesigned"; rule-correction: "always X" / "don't X" as a standing rule) **in addition to** its own explicit "capture that" / "remember that" phrasing. Its own `description` grows broader than today — a **deliberate, considered trade-off** (the maintainer weighed the earlier "narrow descriptions match more reliably" finding and accepts it as the price of collapsing 5 skills to 2 with zero capability lost), not a silently reintroduced objection.

**It dispatches to destinations it already dispatches to today.** Verified directly from its SKILL.md, `capture-router`'s "Detect Type + Subtype + Location" table already has built, working entries for:
- **Lesson → `/kmgraph:kmg-capture-lesson`** (the command, which invokes `lesson-capture-agent`)
- **ADR → `/kmgraph:kmg-create-adr`** (the command, which invokes `create-adr-agent`)
- **Rule/Me → `rules-capture-agent`** — **redirected to `kmg-update-profile`** (Correction 1) so that profile writes have a single owner

So no new write-logic is created anywhere: the destinations for Lesson and ADR already exist and already work, and the Rule/Me destination is repointed to the skill that already owns the `triggers.md`-completeness check.

**`kmg-lesson-capture`, `kmg-adr-guide`, and `kmg-rules-capture` are eliminated as skill files.** Each had two halves — a detection half and a writing half. Detection for all three folds into `kmg-capture-router`'s broadened trigger surface + classification logic. Writing for all three was **already owned elsewhere**:
- `kmg-lesson-capture`'s destination (`/kmgraph:kmg-capture-lesson` → `lesson-capture-agent`) is the **exact same** target `capture-router` already dispatches Lesson content to. Skill file removed; no new write-logic.
- `kmg-adr-guide`'s destination (`/kmgraph:kmg-create-adr` → `create-adr-agent`) is the **exact same** target `capture-router` already dispatches ADR content to. Skill file removed; no new write-logic.
- `kmg-rules-capture`'s writing (which file — `rules.md` vs `me.md`, project vs personal — plus the `triggers.md`-completeness check) moves to `kmg-update-profile`. Skill file removed; the buggy write-path (Finding B — no `triggers.md` check) is deleted rather than patched.

**`kmg-update-profile` becomes the sole owner of writes to the three profile files** (`me.md` / `rules.md` / `triggers.md`), including the `triggers.md`-completeness check. It is reached **two ways**:
1. its own explicit "update my profile" trigger — **unchanged**, still deterministic, no classification ambiguity, still bundling all three files; and
2. a **new internal entry point**: `kmg-capture-router` hands off rule/correction content to it directly once classified.

Because both the explicit path and the implicit-correction path now funnel through `update-profile`, the `triggers.md`-completeness check exists in **exactly one place** and cannot be silently skipped on the implicit path (the Finding B defect).

The **existing separate drafting agents/commands** (`/kmgraph:kmg-capture-lesson` → `lesson-capture-agent`; `/kmgraph:kmg-create-adr` → `create-adr-agent`) are **unchanged** — they produce genuinely different artifacts (per ADR-057's Decision) and are invoked exactly as before. (`rules-capture-agent` is superseded as a dispatch target by `kmg-update-profile` for profile writes.)

**Net: 5 skills become 2** (`kmg-capture-router`, `kmg-update-profile`). Every detection and write path that existed before still exists — detection consolidated into `capture-router`, writing into the two commands and `update-profile` that already had the matching logic. **Zero capability lost.**

### The hard part of this ENH — flagged prominently

The **real open design problem** (per ADR-057's Future Consideration #3 and its 2026-07-03 amendments) is **reconciling the three now-eliminated detectors' previously-independent trigger vocabularies into ONE shared trigger surface + confidence/precision model — now hosted in `kmg-capture-router` — without regressing any of their current detection recall.** This is internal to the engine design and is the substance of this ENH's implementation plan — not the wiring, which is mechanical. Any plan for this ENH must lead with a recall-preservation strategy (e.g. per-type regression fixtures drawn from each of the three eliminated skills' current trigger sets) before removing any skill file. (The reconciliation covers the three implicit detectors' vocabularies folding into `capture-router`; `update-profile`'s explicit "update my profile" phrase-match has no confidence-model problem to fold in.)

---

## No dependency on `capture_mode` — verified

This ENH has **NO dependency** on `capture_mode` or the parent auto-capture pipeline design. This was **verified via traced data-flow analysis** and recorded in [ADR-057's 2026-07-03 amendment](../../decisions/ADR-057-detection-layer-requires-unified-design-not-piecemeal-growth.md):

- The classifier's job is `signal → type → hand to drafting agent`; its output is a typed token.
- `capture_mode` is defined **per-category** — it is *keyed on* the classifier's output, making it a strict **downstream consumer**, not a co-dependency. Nothing flows backward from `capture_mode` into classification logic.
- Even the one plausible coupling ("silent mode should require higher detection confidence") resolves to a policy applied at the confirmation gate to the classifier's already-emitted confidence value — not an internal branch inside the classifier.
- **Precedent:** [ADR-034](../../decisions/ADR-034-capture-level-routing-dispatcher-agent-split.md) already established this exact split (dispatchers own detection, agents own routing, neither duplicates the other's job).

**Consequence:** this ENH can be specced and built **now**, independently. Its prior "blocked" status was corrected in ADR-057's amendment.

---

## Explicitly Out of Scope

> **Revised 2026-07-03 (fourth amendment).** The third amendment kept the three individual detectors alive as skill files (with narrow trigger declarations preserved) and touched `update-profile` only by "sharing" sub-logic. The fourth amendment **eliminates `kmg-lesson-capture` / `kmg-adr-guide` / `kmg-rules-capture` as skill files** and makes `kmg-update-profile` the sole profile writer. So the "no trigger declaration is merged/broadened" caveat now applies only to the **two surviving skills**, and `capture-router`'s declaration is **deliberately broadened** (a considered trade-off). What remains out of scope is narrower still — the drafting commands/agents and the parent pipeline.

- **The two surviving skills' behaviors that are explicitly preserved:** `kmg-update-profile`'s explicit "update my profile" trigger and its bundled 3-file behavior are **unchanged** (it only gains a second internal entry point). `kmg-capture-router` keeps its existing "capture that" / "remember that" phrasing as one entry point.
- **`kmg-capture-router`'s trigger `description` IS deliberately broadened** to catch the three implicit detectors' cues — this is in scope and intentional, an accepted trade-off against the trigger-precision finding, not an oversight. (This is the one place the earlier "keep descriptions narrow" guidance is knowingly set aside.)
- The three eliminated detectors (`kmg-lesson-capture`, `kmg-adr-guide`, `kmg-rules-capture`) are **removed as skill files** — this is in scope. What is out of scope is changing their **downstream write destinations**, which stay exactly as they are: `/kmgraph:kmg-capture-lesson` and `/kmgraph:kmg-create-adr` are untouched; rule/correction writing moves to the already-existing `kmg-update-profile` logic.
- Any change to the drafting commands/agents' internals (`/kmgraph:kmg-capture-lesson` → `lesson-capture-agent`; `/kmgraph:kmg-create-adr` → `create-adr-agent`). They are invoked exactly as before.
- Building or depending on `capture_mode` / the parent auto-capture pipeline (it becomes a downstream consumer later, no retrofitting required).
- Consolidating drafting (ADR-057 explicitly keeps the drafting commands/agents separate — only *detection* consolidates, and *writing* consolidates onto already-existing owners).
- **Superseded note (kept for traceability):** the second amendment's rejection of "reinforcing `kmg-capture-router` as the shared dispatcher" (its Finding 3) rested on treating `capture-router`'s documented narrow scope as authoritative design intent. ADR-057's third amendment (Finding A) removed that footing on provenance grounds; the fourth amendment goes further and makes `capture-router` the sole detection engine for all 5 signal types. The optional low-value cleanup previously noted (deduping `capture-router`'s existing `Rule/Me → rules-capture-agent` dispatch row) is now naturally absorbed: that row is repointed to `kmg-update-profile` and `rules-capture` no longer exists to conflict with it.

---

## Options (open question for planning)

*(Revised 2026-07-03, fourth amendment — the three detector skill files are eliminated, not delegated-to. Options now concern how safely to fold their detection into `capture-router` before deleting them.)*

### Option A: Fold the 3 detectors' trigger surfaces + classification into `kmg-capture-router` directly, then delete the 3 skill files
Broaden `capture-router`'s trigger surface and consolidate all classification/confidence/exclusion logic into it; repoint the Rule/Me dispatch to `kmg-update-profile`; verify recall parity against each eliminated skill's current trigger set; then remove the three skill files in the same pass.

**Trade-off:** Clean single source of truth immediately; requires airtight recall-parity proof **before** deleting any skill file, or detection regresses with no fallback.

### Option B: Run `kmg-capture-router`'s broadened engine in shadow alongside the 3 skills during a transition window, then delete them
Have `capture-router` compute detection/classification in parallel with the 3 still-present skills, compare emissions across a transition window, then cut over and delete the skill files.

**Trade-off:** Safer recall validation via direct comparison; more temporary complexity and a defined cutover-then-delete step.

*(Decision deferred to the implementation plan. Either way, recall preservation across the three eliminated detectors' vocabularies as they fold into `capture-router` is the gating concern, and the skill files are not deleted until parity is proven. `capture-router`'s own explicit "capture that" phrase-match and `update-profile`'s explicit "update my profile" phrase-match are excluded from the vocabulary reconciliation — they have no confidence-model problem to fold in.)*

---

## Affected Files

*(Revised 2026-07-03, fourth amendment — three detector skill files are DELETED; `capture-router` and `update-profile` are the only surviving skills.)*

| File | Role |
|---|---|
| `skills/kmg-capture-router/` | **The sole detection engine for all 5 signal types.** Its existing "Detect Type + Subtype + Location" logic becomes the single source of truth for classification/confidence/exclusion. Its trigger `description` is **deliberately broadened** to catch the three implicit detectors' cues (considered trade-off). Existing dispatch rows reused: Lesson → `/kmgraph:kmg-capture-lesson`, ADR → `/kmgraph:kmg-create-adr`; the Rule/Me row is **repointed** from `rules-capture-agent` to `kmg-update-profile`. |
| `skills/kmg-update-profile/` | **The sole profile-file writer** (`me.md` / `rules.md` / `triggers.md`, incl. the `triggers.md`-completeness check). Explicit "update my profile" trigger + 3-file bundling **unchanged**; gains a **second internal entry point** — invoked by `capture-router` on classified rule/correction content. |
| ~~`skills/kmg-lesson-capture/`~~ | **DELETED** — detection folds into `capture-router`; its write destination (`/kmgraph:kmg-capture-lesson` → `lesson-capture-agent`) is the same one `capture-router` already dispatches to. No new write-logic. |
| ~~`skills/kmg-adr-guide/`~~ | **DELETED** — detection folds into `capture-router`; its write destination (`/kmgraph:kmg-create-adr` → `create-adr-agent`) is the same one `capture-router` already dispatches to. No new write-logic. |
| ~~`skills/kmg-rules-capture/`~~ | **DELETED** — detection folds into `capture-router`; writing (incl. the missing-`triggers.md` Finding B bug) moves to `kmg-update-profile`, which already owns the completeness check. The buggy write-path is deleted, not patched. |
| drafting commands/agents (`/kmgraph:kmg-capture-lesson` → `lesson-capture-agent`; `/kmgraph:kmg-create-adr` → `create-adr-agent`) | Unchanged internals; invoked exactly as before |

---

## Acceptance Criteria

*(Revised 2026-07-03, fourth amendment — 5 skills → 2; three detector skill files removed; `capture-router` sole detection engine; `update-profile` sole profile writer.)*

- [ ] **All three detector skill files are removed** — `skills/kmg-lesson-capture/`, `skills/kmg-adr-guide/`, and `skills/kmg-rules-capture/` no longer exist as skills. Only `kmg-capture-router` and `kmg-update-profile` remain of the original 5.
- [ ] **`kmg-capture-router` is the single detection engine for all 5 original signal types.** Its existing "Detect Type + Subtype + Location" logic is the single source of truth for classification/confidence-scoring and cross-signal exclusion. No new, separate engine library is created.
- [ ] **`kmg-capture-router`'s trigger surface catches all 5 original signal types** — its own explicit "capture that" / "remember that" phrasing **plus** the three implicit cues (lesson: "figured it out"/"turns out"/"the problem was"; ADR: "we should switch to"/"decision between"/"should be redesigned"; rule-correction: standing-rule phrasing). Confirmed by a test firing each of the five cue classes and reaching the correct dispatch.
- [ ] **`kmg-update-profile` is the sole writer to the three profile files** (`me.md` / `rules.md` / `triggers.md`). It is reachable via both its own explicit "update my profile" trigger (unchanged, still bundling all three files) and an internal hand-off from `kmg-capture-router` on classified rule/correction content.
- [ ] **No duplicate write-paths exist.** The `triggers.md`-completeness check ("rule without trigger = incomplete") lives in exactly one place (`kmg-update-profile`) and cannot be skipped on the implicit-correction path. Confirmed by a test where an implicit correction that needs a trigger entry produces (or prompts for) the corresponding `triggers.md` update — which the eliminated `kmg-rules-capture` did not do (its routing table never mentioned `triggers.md` — the verified Finding B bug, now fixed by deleting that write-path).
- [ ] **`kmg-capture-router` dispatches to already-existing destinations with no new write-logic** — Lesson → `/kmgraph:kmg-capture-lesson`, ADR → `/kmgraph:kmg-create-adr`, Rule/Me → `kmg-update-profile`. The Lesson and ADR commands/agents are invoked exactly as before.
- [ ] The three previously-independent detector trigger vocabularies are reconciled into one confidence/precision model within `kmg-capture-router`.
- [ ] **No regression** in detection recall for any of the three folded-in capture types (proven by per-type regression fixtures drawn from each eliminated skill's current trigger set, before its file is deleted).
- [ ] Cross-signal exclusions are expressed once, centrally in `kmg-capture-router`, not as per-skill patches.
- [ ] **The two surviving skills' trigger declarations behave as specified:** `kmg-update-profile`'s "update my profile" trigger is unchanged; `kmg-capture-router`'s `description` is deliberately broadened (accepted trade-off) — and this is the *only* trigger declaration that changes.
- [ ] No code dependency on `capture_mode` or the parent auto-capture pipeline.
- [ ] **T9 (ADR-058) is satisfied without a new name** — the sole detection engine is `kmg-capture-router` and the sole profile writer is `kmg-update-profile`, both already named; `capture-router`'s scope is *restored* to believed original intent, not newly named.
</content>
