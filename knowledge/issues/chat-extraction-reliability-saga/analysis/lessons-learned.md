# Lessons Learned (Meta-Issue)

Reusable insights from the chat-extraction reliability investigation.

**Last Updated:** 2026-07-08

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
