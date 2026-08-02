import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

export interface FileEntry {
  relPath: string;
  hash: string;
}

const SKIP_FILES = new Set([".kmgraph-id", ".git"]); // ".git" covers the worktree/submodule case where it's a pointer file, not a directory
const SKIP_DIRS = new Set([".git"]); // findings doc #22: never hash git's internal object store

export function hashDirectory(dirPath: string): FileEntry[] {
  const results: FileEntry[] = [];
  function walk(current: string, relBase: string) {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const rel = relBase ? path.join(relBase, entry.name) : entry.name;
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue; // e.g. `.git/` — thousands of unrelated internal blobs
        walk(full, rel);
      } else if (entry.isFile() && !SKIP_FILES.has(entry.name)) {
        // entry.isFile() excludes symlinks (isDirectory()===false for a symlink-to-dir would
        // otherwise fall through here and crash on EISDIR/ENOENT) and other non-regular entries.
        const content = fs.readFileSync(full);
        const hash = crypto.createHash("sha256").update(content).digest("hex");
        results.push({ relPath: rel.split(path.sep).join("/"), hash });
      }
    }
  }
  walk(dirPath, "");
  return results;
}

export type ComparisonCategory = "identical" | "diverged" | "unique-a" | "unique-b" | "moved";

export interface FileComparison {
  relPathA?: string;
  relPathB?: string;
  category: ComparisonCategory;
}

export function compareFileSets(a: FileEntry[], b: FileEntry[]): FileComparison[] {
  const results: FileComparison[] = [];
  const bByRel = new Map(b.map((e) => [e.relPath, e]));
  const consumedB = new Set<string>();
  const consumedA = new Set<string>();

  for (const entryA of a) {
    const match = bByRel.get(entryA.relPath);
    if (match) {
      results.push({
        relPathA: entryA.relPath,
        relPathB: match.relPath,
        category: entryA.hash === match.hash ? "identical" : "diverged",
      });
      consumedA.add(entryA.relPath);
      consumedB.add(match.relPath);
    }
  }

  const remainingA = a.filter((e) => !consumedA.has(e.relPath));
  const remainingB = b.filter((e) => !consumedB.has(e.relPath));

  for (const entryA of remainingA) {
    const movedMatch = remainingB.find((e) => e.hash === entryA.hash && !consumedB.has(e.relPath));
    if (movedMatch) {
      results.push({ relPathA: entryA.relPath, relPathB: movedMatch.relPath, category: "moved" });
      consumedA.add(entryA.relPath);
      consumedB.add(movedMatch.relPath);
    }
  }

  for (const entryA of a) {
    if (!consumedA.has(entryA.relPath)) results.push({ relPathA: entryA.relPath, category: "unique-a" });
  }
  for (const entryB of b) {
    if (!consumedB.has(entryB.relPath)) results.push({ relPathB: entryB.relPath, category: "unique-b" });
  }

  return results;
}
