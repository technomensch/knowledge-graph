# Lessons Learned (Meta-Issue)

Reusable insights from the chat-extraction reliability investigation.

**Last Updated:** 2026-07-11

---

## Key Lessons

### Lesson 1: One subsystem can hide several independent defects

**What We Learned:**
"Messages go missing/misfiled" in the Claude extractor turned out to be at least three distinct root causes — subagent loss (ENH-038), incremental-append dedup permanence (ENH-043), and first-timestamp-only date derivation (ENH-047) — not one bug with one fix.

**Why It Matters:**
Fixing one symptom and declaring victory leaves the others live. Treat a recurring symptom class as a set of hypotheses, not a single defect.

**Apply When:**
A "fixed" data-pipeline bug re-manifests with a different shape.

**Evidence:** [root-cause-evolution.md](root-cause-evolution.md), [implementation-log.md](../implementation-log.md)

---

### Lesson 2: Synthetic-fixture-only validation hides real-world-only failure modes

**What We Learned:**
ENH-038 and ENH-043 were validated against `mktemp -d` fixtures built fresh each run, so the incremental-append path (ENH-043) and the multi-day session shape (ENH-047) were never exercised against real historical data.

**Why It Matters:**
Fixtures that the test itself creates always take the "clean" code path; the failure modes live in pre-existing, messy, real-world state.

**Apply When:**
Writing tests for any code that reads/repairs pre-existing on-disk artifacts — include a fixture seeded to look like real legacy output, and run at least once against the real dataset.

---

### Lesson 3: A count far below the known real count is a bucketing/selection signal

**What We Learned:**
`--today` returning 36 when ~3,114 messages really existed was not a quiet day — it was a date-derivation defect. The cheap diagnostic (count raw `.jsonl` messages, replicate the extractor's derivation by hand) confirmed it in minutes.

**Apply When:**
Any date/partition-filtered query returns implausibly little — verify the partitioning key derivation before anything else.

---

### Lesson 4: Never destroy known-good state before the replacement is confirmed written

**What We Learned:**
The pre-fix rebuild path did `shutil.rmtree` on a stale split subfolder *before* writing the fresh flat file, and used a single fixed `.backup` filename that a second interrupted run would clobber. This is the same shape of bug independently found and fixed **the same day** in the sibling `kg-config-silent-overwrite` issue (a different subsystem entirely — bash hooks, not Python extractors), which clobbered the real global config file the same way. Two independent instances of the identical anti-pattern in one repo on one day is a signal, not a coincidence — promoted to a standalone cross-cutting ADR (write-safety principle: atomic temp+rename, rename-aside timestamped backup, confirm-before-destroy) rather than left as a per-subsystem fix.

**Why It Matters:**
"Fix the bug" and "fix the bug safely" are different scopes. A fix that closes the reported symptom but still destroys old state before the new state is guaranteed can reintroduce data loss on the very next interrupted run.

**Apply When:**
Writing any code that overwrites, deletes, or clears existing state as part of "repairing" or "rebuilding" something — check whether the destroy step can be deferred until after the replacement is confirmed, or made non-destructive (rename aside instead of delete).

**Evidence:** [implementation-log.md Attempt 009](../implementation-log.md), `../../kg-config-silent-overwrite/`, and the new write-safety ADR (see `knowledge/decisions/`).

---

### Lesson 5: Fail-open vs. fail-closed is a matter of check ordering, not just intent

**What We Learned:**
ADR-062's Gemini scoping control was *designed* fail-closed (exclude anything unattributable when `--project` is set) but *behaved* fail-open for a specific input shape — a hex `--project` value could substring-match a hash-named directory before the hash-dir exclusion check ever ran, because the substring match ran first. The control's stated design was never wrong; the order its checks executed in was.

**Why It Matters:**
A control's safety property can't be verified by reading its docstring or its stated intent alone — it has to be verified against the actual order operations execute in, especially when two checks can both "claim" the same input.

**Apply When:**
Reviewing any fail-closed/fail-safe control with more than one exclusion/inclusion check — verify which check runs first and whether an input can satisfy an earlier, more permissive check before a later, more restrictive one gets a chance to exclude it.

---

### Lesson 6: Optional-dependency fallbacks must fail loud, not silent

**What We Learned:**
`.pb` content-dating (ENH-046) silently degraded to file-mtime dating in three distinct code paths whenever `blackboxprotobuf` wasn't usable — dependency absent, decode raised, or decoded content was empty. All three had only a `DEBUG:`-level log, easy to miss, defeating the entire point of ENH-046 (mtime is known-unreliable for copied/restored files) with no signal to the user that it happened.

**Why It Matters:**
A fallback that silently degrades quality is worse than one that fails loudly, because the user has no way to know their data might be subtly wrong. This applies to any "best available" fallback chain, not just this one.

**Apply When:**
Implementing a fallback path for an optional dependency or best-effort heuristic — audit every route that can reach the fallback (not just the "obviously missing" case) and ensure each one surfaces a visible, counted signal.

---

### Lesson 7: Plan/brief `file:line` references go stale fast — re-derive from source at edit time

**What We Learned:**
The team-lead brief that kicked off the v0.6.18 plan cited specific line numbers that were already stale by the time the plan was drafted (e.g. `extract_gemini.py` had grown to 465 lines and already implemented part of what the brief described as missing). The plan author caught this and re-derived every anchor from the actual worktree files before proceeding, flagging it explicitly at the top of the plan.

**Why It Matters:**
A stale line reference isn't just a cosmetic annoyance — acting on it directly (editing "line 442" without checking what's actually there) can silently edit the wrong code or miss that a described bug was already partially fixed.

**Apply When:**
Starting any implementation from a written brief, plan, or spec that includes specific file:line citations — re-read the actual current file before trusting the citation, every time, not just on suspicion something changed.

---

## Investigation Techniques

**What Worked:**
- Replicating the extractor's own date-derivation logic by hand against real files instead of trusting its output.
- Dogfooding the new tooling on a real, long, multi-day session.
- Counting ground-truth (raw `.jsonl` message totals) independent of the tool under test.

**What Didn't Work:**
- Starting from a packaging/plugin-version hypothesis before confirming the extractor's own logic.

**Recommend for Future:**
- Establish ground truth independently, then compare the tool's output to it.
- Suspect the partition-key derivation first when a filtered count is implausibly low.

---

## Patterns Discovered

**For Knowledge Graph:**
- "Per-record vs per-file attribute derivation" — deriving a per-record attribute (date) once per file and reusing it is a latent misfiling bug whenever a file spans multiple values of that attribute. Candidate `patterns.md`/`gotchas.md` entry once ENH-047 lands.

**For Lessons Learned:**
- Lessons 1–3 above are candidates for extraction to project lessons-learned after ENH-047 is fixed and validated.

---

## If We Had to Do It Again

**Do Differently:**
1. Validate every extractor fix against the real dataset, not just synthetic fixtures.
2. Check partition-key (date) derivation before hypothesizing about packaging.

**Keep the Same:**
1. Independent ground-truth counting.
2. Dogfooding on real long-running sessions.
