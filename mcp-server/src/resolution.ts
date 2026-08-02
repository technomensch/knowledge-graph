import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { execFileSync } from "child_process";
import { KgConfig, GraphConfig } from "./utils.js";

export type ResolutionResult =
  | { kind: "resolved"; name: string; graph: GraphConfig }
  | { kind: "fuzzy-match"; candidates: string[] }
  | { kind: "not-registered"; name: string }
  | { kind: "no-graph-in-cwd" }
  | { kind: "archived"; name: string; graph: GraphConfig }
  | { kind: "ambiguous-tie"; candidates: string[] }
  | { kind: "merged"; name: string; into: string; at: string };

function expand(p: string): string {
  return p.replace(/^~/, os.homedir());
}

// findings doc #12: resolve symlinks (e.g. macOS /tmp -> /private/tmp) with a
// graceful fallback — a failed normalization must never become a hard error,
// just less-normalized matching.
function normalizeRealPath(p: string): string {
  const expanded = expand(p);
  try {
    return fs.realpathSync(expanded);
  } catch {
    return resolveNearestExistingAncestor(expanded);
  }
}

// findings doc #12 correction: falling straight back to the raw, un-resolved
// path when `realpathSync` throws only handles "the path doesn't exist at
// all." It doesn't handle the much more common case of a path that doesn't
// exist *yet* several levels below a symlinked (or otherwise-normalized)
// ancestor that does exist — e.g. a cwd deep inside a freshly-symlinked
// project whose leaf directories haven't been created. In that case, giving
// up on normalization entirely reintroduces the exact bug this function was
// built to fix: the raw path still says "linked-proj", the registry's
// resolved root says "real-proj", and a comparison that used to succeed on
// raw strings starts failing because normalization was added. Instead, walk
// up to the nearest ancestor that does exist, resolve *that* through any
// symlinks, and rejoin the unresolved remainder onto it.
function resolveNearestExistingAncestor(p: string): string {
  const remainder: string[] = [];
  let current = p;
  while (true) {
    if (fs.existsSync(current)) {
      try {
        const resolved = fs.realpathSync(current);
        return remainder.length > 0 ? path.join(resolved, ...remainder.reverse()) : resolved;
      } catch {
        return p;
      }
    }
    const parent = path.dirname(current);
    if (parent === current) return p; // reached the filesystem root, nothing exists
    remainder.push(path.basename(current));
    current = parent;
  }
}

// findings doc #12: map a linked git worktree's cwd back to its main repo's
// root, so a worktree session (this project's own `isolation: "worktree"`
// usage, superpowers:using-git-worktrees) resolves against the same
// registered entry as the main checkout. Best-effort: any failure (not a
// git repo, no git on PATH) returns null and the caller falls back to the
// un-mapped cwd.
function resolveWorktreeMainRepoRoot(cwd: string): string | null {
  try {
    const gitCommonDir = execFileSync(
      "git",
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      { cwd, stdio: ["ignore", "pipe", "ignore"] }
    ).toString().trim();
    // git-common-dir is always "<main-repo-root>/.git", whether invoked from
    // the main working tree or any of its linked worktrees.
    return path.dirname(gitCommonDir);
  } catch {
    return null;
  }
}

function isAncestorOrEqual(ancestor: string, descendant: string): boolean {
  const rel = path.relative(ancestor, descendant);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function statusIsLive(graph: GraphConfig): boolean {
  return graph.status !== "archived" && graph.status !== "deleted";
}

// findings doc #19: an archived entry with `mergedInto` set resolves as an
// alias to its survivor instead of the ordinary archived-entry outcome.
function archivedOrMerged(name: string, graph: GraphConfig): ResolutionResult {
  if (graph.mergedInto) {
    return { kind: "merged", name, into: graph.mergedInto, at: graph.statusChangedAt };
  }
  return { kind: "archived", name, graph };
}

export function findTruePathTies(config: KgConfig, resolvedPath: string): string[] {
  const target = expand(resolvedPath);
  return Object.entries(config.graphs)
    .filter(([, g]) => expand(g.path) === target)
    .map(([name]) => name);
}

export function resolveGraph(config: KgConfig, cwd: string, name?: string): ResolutionResult {
  if (name) {
    const exact = config.graphs[name];
    if (exact) {
      return statusIsLive(exact)
        ? { kind: "resolved", name, graph: exact }
        : archivedOrMerged(name, exact);
    }
    const lowerQuery = name.toLowerCase();
    const candidates = Object.keys(config.graphs).filter((n) => n.toLowerCase().includes(lowerQuery));
    if (candidates.length > 0) return { kind: "fuzzy-match", candidates };
    return { kind: "not-registered", name };
  }

  // No name: bounded upward walk against already-registered paths only.
  // Deepest/most-specific match wins (spec §5).
  const projectLocalRoots = Object.entries(config.graphs)
    .filter(([, g]) => (g.type ?? "project-local") !== "personal")
    .map(([n, g]) => ({ name: n, graph: g, root: normalizeRealPath(path.dirname(g.path)) }));

  // Normalize cwd itself (symlinks) and check for a plain match first.
  const normalizedCwd = normalizeRealPath(cwd);
  let matches = projectLocalRoots.filter(({ root }) => isAncestorOrEqual(root, normalizedCwd));

  // Only fall back to the git-worktree main-repo mapping — which spawns a
  // `git` subprocess — when the plain match didn't already succeed. A
  // worktree's own path may not be a symlink at all, so this is a genuinely
  // separate normalization, not a redundant one (findings doc #12), but the
  // overwhelmingly common case (cwd directly under a registered, non-worktree
  // path) never needs the subprocess spawn at all (findings doc #12, minor
  // perf note: this used to run unconditionally on every no-name resolveGraph
  // call).
  if (matches.length === 0) {
    const worktreeMainRoot = resolveWorktreeMainRepoRoot(cwd);
    if (worktreeMainRoot) {
      const normalizedWorktreeRoot = normalizeRealPath(worktreeMainRoot);
      matches = projectLocalRoots.filter(({ root }) => isAncestorOrEqual(root, normalizedWorktreeRoot));
    }
  }
  if (matches.length === 0) return { kind: "no-graph-in-cwd" };

  matches.sort((a, b) => b.root.length - a.root.length); // deepest path wins
  const deepestRootLength = matches[0].root.length;
  const tiedAtDeepest = matches.filter((m) => m.root.length === deepestRootLength);

  // findings doc #13: true path ties (two registry entries resolving to the
  // identical deepest path) were previously left to resolve to whichever
  // entry happened to sort first — silently arbitrary. `findTruePathTies`
  // (Task 1.6) was built for exactly this but never called here. Surface it
  // as its own outcome so the caller routes it through gate() the same way
  // fuzzy-match/archived already are, instead of picking one silently.
  if (tiedAtDeepest.length > 1) {
    return { kind: "ambiguous-tie", candidates: tiedAtDeepest.map((m) => m.name) };
  }

  const deepest = matches[0];
  return statusIsLive(deepest.graph)
    ? { kind: "resolved", name: deepest.name, graph: deepest.graph }
    : archivedOrMerged(deepest.name, deepest.graph);
}
