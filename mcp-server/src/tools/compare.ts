import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { hashDirectory, compareFileSets } from "../graph-compare.js";

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

export function getRecencySignal(dirPath: string): RecencySignal {
  if (isGitRepo(dirPath)) {
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const out = execFileSync("git", ["log", "--since", since, "--name-only", "--format="], { cwd: dirPath, stdio: "pipe" }).toString();
      const files = new Set(out.split("\n").map((l) => l.trim()).filter(Boolean));
      return { source: "git", filesTouchedLast30Days: files.size };
    } catch {
      // fall through to mtime fallback if git log fails for any reason
    }
  }
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let count = 0;
  for (const entry of hashDirectory(dirPath)) {
    const full = path.join(dirPath, entry.relPath.split("/").join(path.sep));
    if (fs.statSync(full).mtimeMs >= cutoff) count++;
  }
  return { source: "mtime-fallback", filesTouchedLast30Days: count };
}

function isGitTracked(dirPath: string, relPath: string): boolean {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", relPath], { cwd: dirPath, stdio: "pipe" });
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

export function buildCompareSummary(dirA: string, dirB: string): CompareSummary {
  if (!fs.existsSync(dirA) || !fs.existsSync(dirB)) {
    throw new Error(`kg_compare_graphs: one or both paths do not exist (A=${dirA}, B=${dirB})`);
  }
  const entriesA = hashDirectory(dirA);
  const entriesB = hashDirectory(dirB);
  const comparisons = compareFileSets(entriesA, entriesB);

  const changedInBoth = comparisons.filter((c) => c.category === "diverged").length;
  const onlyA = comparisons.filter((c) => c.category === "unique-a");
  const onlyB = comparisons.filter((c) => c.category === "unique-b");
  const onlyATracked = onlyA.filter((c) => isGitTracked(dirA, c.relPathA!)).length;
  const onlyBTracked = onlyB.filter((c) => isGitTracked(dirB, c.relPathB!)).length;

  const identicalCount = comparisons.filter((c) => c.category === "identical").length;
  const nonIdenticalTracked = comparisons.filter(
    (c) => c.category !== "identical" &&
      ((c.relPathA && isGitTracked(dirA, c.relPathA)) || (c.relPathB && isGitTracked(dirB, c.relPathB)))
  );
  const worktreeFingerprint = identicalCount > 0 && nonIdenticalTracked.length === 0;

  const verdict = worktreeFingerprint
    ? "Tracked content is identical — this looks like a worktree or linked copy, not a genuine divergence."
    : changedInBoth > 0
    ? `${changedInBoth} file(s) changed on both sides — genuine divergence, review before merging.`
    : "No shared files changed, but the two folders have different unique content.";

  return {
    fileCountA: entriesA.length,
    fileCountB: entriesB.length,
    recencyA: getRecencySignal(dirA),
    recencyB: getRecencySignal(dirB),
    changedInBoth,
    onlyInATracked: onlyATracked,
    onlyInAUntracked: onlyA.length - onlyATracked,
    onlyInBTracked: onlyBTracked,
    onlyInBUntracked: onlyB.length - onlyBTracked,
    worktreeFingerprint,
    verdict,
  };
}
