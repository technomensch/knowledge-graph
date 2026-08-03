import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFileSync } from "child_process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { hashDirectory, compareFileSets, FileEntry, FileComparison, ComparisonCategory } from "../graph-compare.js";
import { readConfig } from "../utils.js";
import { PersonalScopeSession, confirmPersonalScopeAccess, isAncestorOrEqual } from "../resolution.js";
import { resolveInteractionMode, STUB_ASK_TIMEOUT_MS, stubAsk } from "../interaction.js";

// Finding 2 (Fable review): a raw path string can't be gated the same way a scope enum can --
// a personal-KG path could be passed under any of dozens of possible string values. Instead of
// gating the enum, resolve the caller-supplied path against the registry and require
// confirmation only when it actually lands on a registered personal-type graph.
function normalizeForCompare(p: string): string {
  const expanded = p.replace(/^~/, os.homedir());
  try {
    return fs.realpathSync(expanded);
  } catch {
    return path.resolve(expanded);
  }
}

export interface RecencySignal {
  source: "git" | "mtime-fallback";
  filesTouchedLast30Days: number;
}

function isGitRepo(dirPath: string): boolean {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: dirPath, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export function getRecencySignal(dirPath: string, precomputedEntries?: FileEntry[]): RecencySignal {
  if (isGitRepo(dirPath)) {
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      // "--" scopes the log to dirPath itself (cwd); without it git walks the whole repo's
      // history regardless of cwd, so two directories in the same repo report identical numbers.
      const out = execFileSync("git", ["log", "--since", since, "--name-only", "--format=", "--", "."], { cwd: dirPath, stdio: "pipe" }).toString();
      const files = new Set(out.split("\n").map((l) => l.trim()).filter(Boolean));
      return { source: "git", filesTouchedLast30Days: files.size };
    } catch {
      // fall through to mtime fallback if git log fails for any reason
    }
  }
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let count = 0;
  for (const entry of precomputedEntries ?? hashDirectory(dirPath)) {
    const full = path.join(dirPath, entry.relPath);
    if (fs.statSync(full).mtimeMs >= cutoff) count++;
  }
  return { source: "mtime-fallback", filesTouchedLast30Days: count };
}

function isGitTracked(dirPath: string, relPath: string): boolean {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", "--", relPath], { cwd: dirPath, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export interface CompareSummary {
  fileCountA: number;
  fileCountB: number;
  recencyA: RecencySignal;
  recencyB: RecencySignal;
  changedInBoth: number;
  onlyInBTracked: number;
  onlyInBUntracked: number;
  onlyInATracked: number;
  onlyInAUntracked: number;
  worktreeFingerprint: boolean;
  verdict: string;
}

export interface ComparisonResult {
  entriesA: FileEntry[];
  entriesB: FileEntry[];
  comparisons: FileComparison[];
}

export function computeComparison(dirA: string, dirB: string): ComparisonResult {
  const entriesA = hashDirectory(dirA);
  const entriesB = hashDirectory(dirB);
  const comparisons = compareFileSets(entriesA, entriesB);
  return { entriesA, entriesB, comparisons };
}

export function buildCompareSummary(dirA: string, dirB: string, precomputed?: ComparisonResult): CompareSummary {
  if (!fs.existsSync(dirA) || !fs.existsSync(dirB)) {
    throw new Error(`kg_compare_graphs: one or both paths do not exist (A=${dirA}, B=${dirB})`);
  }
  const { entriesA, entriesB, comparisons } = precomputed ?? computeComparison(dirA, dirB);

  // moved entries are renames (same hash, different path) — folded into changedInBoth so a
  // pure rename isn't silently invisible in the summary; callers reading just the number can't
  // distinguish content changes from renames, but this keeps the "six numbers" contract intact.
  const changedInBoth = comparisons.filter((c) => c.category === "diverged" || c.category === "moved").length;
  const onlyA = comparisons.filter((c) => c.category === "unique-a");
  const onlyB = comparisons.filter((c) => c.category === "unique-b");

  const trackedCache = new Map<string, boolean>();
  const isTrackedCached = (dirPath: string, relPath: string): boolean => {
    const key = `${dirPath} ${relPath}`;
    let cached = trackedCache.get(key);
    if (cached === undefined) {
      cached = isGitTracked(dirPath, relPath);
      trackedCache.set(key, cached);
    }
    return cached;
  };

  // M-3 (deferred, product question): untracked-only-on-one-side isn't broken out as its own
  // category here — it's folded into onlyA*/onlyB*'s untracked counts like any other untracked
  // file. Whether that deserves a separate signal is a product decision, not built speculatively.
  const onlyATracked = onlyA.filter((c) => isTrackedCached(dirA, c.relPathA!)).length;
  const onlyBTracked = onlyB.filter((c) => isTrackedCached(dirB, c.relPathB!)).length;

  const identicalCount = comparisons.filter((c) => c.category === "identical").length;

  // Tracked-file-identity is only a meaningful worktree signal when both sides are real git
  // repos. In a non-git directory isGitTracked() is always false, so the tracked-based
  // predicate would collapse to "any identical file at all" — flagging arbitrarily divergent
  // directories as worktrees just because they share one file. Fall back to strict equality.
  const bothGitRepos = isGitRepo(dirA) && isGitRepo(dirB);
  let worktreeFingerprint: boolean;
  if (bothGitRepos) {
    const nonIdenticalTracked = comparisons.filter(
      (c) => c.category !== "identical" &&
        ((c.relPathA && isTrackedCached(dirA, c.relPathA)) || (c.relPathB && isTrackedCached(dirB, c.relPathB)))
    );
    worktreeFingerprint = identicalCount > 0 && nonIdenticalTracked.length === 0;
  } else {
    worktreeFingerprint = comparisons.every((c) => c.category === "identical");
  }

  const verdict = worktreeFingerprint
    ? "Tracked content is identical — this looks like a worktree or linked copy, not a genuine divergence."
    : changedInBoth > 0
    ? `${changedInBoth} file(s) changed on both sides — genuine divergence, review before merging.`
    : "No shared files changed, but the two folders have different unique content.";

  return {
    fileCountA: entriesA.length,
    fileCountB: entriesB.length,
    recencyA: getRecencySignal(dirA, entriesA),
    recencyB: getRecencySignal(dirB, entriesB),
    changedInBoth,
    onlyInATracked: onlyATracked,
    onlyInAUntracked: onlyA.length - onlyATracked,
    onlyInBTracked: onlyBTracked,
    onlyInBUntracked: onlyB.length - onlyBTracked,
    worktreeFingerprint,
    verdict,
  };
}

function topExamples(comparisons: FileComparison[], category: ComparisonCategory | ComparisonCategory[], dirPath: string, limit = 5): string {
  const categories = Array.isArray(category) ? category : [category];
  const matches = comparisons.filter((c) => categories.includes(c.category));
  const sorted = [...matches].sort((x, y) => {
    const relX = x.relPathA ?? x.relPathB!;
    const relY = y.relPathA ?? y.relPathB!;
    const mtimeX = fs.statSync(path.join(dirPath, relX)).mtimeMs;
    const mtimeY = fs.statSync(path.join(dirPath, relY)).mtimeMs;
    return mtimeY - mtimeX;
  });
  const names = sorted.slice(0, limit).map((c) => c.relPathA ?? c.relPathB);
  const suffix = matches.length > limit ? ` (${matches.length - limit} more)` : "";
  return names.join(", ") + suffix;
}

export function registerCompareTools(server: McpServer, personalScopeSession: PersonalScopeSession): void {
  server.tool(
    "kg_compare_graphs",
    "Compare two KG folders by content hash + relative path to distinguish duplicate/forked/worktree registrations from genuine divergence",
    {
      a: z.string().describe("Absolute path to the first KG content directory"),
      b: z.string().describe("Absolute path to the second KG content directory"),
      confirmPersonalScope: z
        .boolean()
        .optional()
        .describe(
          "Confirms this repo may access the personal knowledge graph. Required once per " +
            "process before comparing against a path that resolves to the registered personal " +
            "knowledge graph."
        ),
    },
    async ({ a, b, confirmPersonalScope }) => {
      if (!fs.existsSync(a)) {
        return { content: [{ type: "text" as const, text: `Error: path A does not exist: ${a}` }], isError: true };
      }
      if (!fs.existsSync(b)) {
        return { content: [{ type: "text" as const, text: `Error: path B does not exist: ${b}` }], isError: true };
      }

      // Finding 2 (Fable review): reject an unconfirmed comparison against the personal graph
      // before any file walk/hash/git-log ever touches it -- an untrusted repo's embedded
      // instructions must not be able to exfiltrate personal-KG file counts/recency/filenames
      // just by passing its real filesystem path as `a` or `b`.
      const config = readConfig();
      const normalizedA = normalizeForCompare(a);
      const normalizedB = normalizeForCompare(b);
      const personalGraphPaths = Object.values(config.graphs)
        .filter((g) => g.type === "personal" && g.status !== "deleted")
        .map((g) => normalizeForCompare(g.path));
      // Containment, not just equality -- a subdirectory nested inside the personal graph's
      // registered root still exposes that graph's file hashes/counts/filenames and must be
      // gated the same as the root itself.
      const touchesPersonal = personalGraphPaths.some(
        (p) => isAncestorOrEqual(p, normalizedA) || isAncestorOrEqual(p, normalizedB)
      );

      if (touchesPersonal) {
        const mode = resolveInteractionMode({}).mode;
        const confirmed = await confirmPersonalScopeAccess(personalScopeSession, process.cwd(), {
          confirmPersonalScope,
          mode,
          timeoutMs: STUB_ASK_TIMEOUT_MS,
          ask: stubAsk,
        });
        if (!("confirmed" in confirmed)) {
          return { content: [{ type: "text" as const, text: JSON.stringify(confirmed) }], isError: true };
        }
      }

      try {
        // Computed once and shared between the summary and the examples lines below — computing
        // it twice risked a concurrent write between calls producing self-contradictory numbers.
        const computed = computeComparison(a, b);
        const summary = buildCompareSummary(a, b, computed);
        const { comparisons } = computed;

        const lines = [
          summary.verdict,
          `Files: A=${summary.fileCountA}, B=${summary.fileCountB}`,
          `Last activity: A=${summary.recencyA.filesTouchedLast30Days} files/30d (${summary.recencyA.source}), B=${summary.recencyB.filesTouchedLast30Days} files/30d (${summary.recencyB.source})`,
          `Changed in both: ${summary.changedInBoth}`,
        ];
        if (summary.changedInBoth > 0) {
          lines.push(`Changed in both (examples): ${topExamples(comparisons, ["diverged", "moved"], a)}`);
        }
        lines.push(`Only in A: ${summary.onlyInATracked} tracked, ${summary.onlyInAUntracked} untracked (unrecoverable if archived)`);
        if (summary.onlyInATracked + summary.onlyInAUntracked > 0) {
          lines.push(`Only in A (examples): ${topExamples(comparisons, "unique-a", a)}`);
        }
        lines.push(`Only in B: ${summary.onlyInBTracked} tracked, ${summary.onlyInBUntracked} untracked (unrecoverable if archived)`);
        if (summary.onlyInBTracked + summary.onlyInBUntracked > 0) {
          lines.push(`Only in B (examples): ${topExamples(comparisons, "unique-b", b)}`);
        }
        lines.push(`Worktree fingerprint: ${summary.worktreeFingerprint ? "yes" : "no"}`);
        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error comparing directories: ${message}` }], isError: true };
      }
    }
  );
}
