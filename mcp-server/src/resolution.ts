import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { execFileSync } from "child_process";
import { KgConfig, GraphConfig, updateConfig, changeGraphStatus } from "./utils.js";
import { AskResult, GateResult, InputRequiredError, InteractionMode, STUB_ASK_TIMEOUT_MS, gate, requireInput, stubAsk } from "./interaction.js";

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

export function isAncestorOrEqual(ancestor: string, descendant: string): boolean {
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

export function resolvePersonalGraph(config: KgConfig): { name: string; graph: GraphConfig } | { error: string } {
  const matches = Object.entries(config.graphs).filter(([, g]) => g.type === "personal" && g.status !== "deleted");
  if (matches.length === 0) return { error: "No personal knowledge graph is registered. Use kg_config_init with type=personal first." };
  if (matches.length > 1) return { error: `Multiple personal knowledge graphs are registered (${matches.map(([n]) => n).join(", ")}) — this should never happen. Resolve the duplicate before proceeding.` };
  const [name, graph] = matches[0];
  return { name, graph };
}

export function isHomeOrRootCwd(cwd: string): boolean {
  const normalized = path.resolve(cwd);
  return normalized === path.resolve(os.homedir()) || normalized === path.parse(normalized).root;
}

// spec §8: a real (POSIX-only) signal for "does this $HOME/root cwd actually
// belong to the user running this process" -- e.g. a sudo'd shell or a
// container bind-mount can put you in a directory named /root or /home/xyz
// that isn't really "yours." "unknown" (Windows, or any stat failure) is
// deliberately NOT treated as a mismatch by callers -- spec §8 only wants
// genuine ownership *mismatches* surfaced, not an inability to check.
export function checkHomeOwnership(cwd: string): "matches" | "mismatch" | "unknown" {
  if (process.platform === "win32") return "unknown"; // no POSIX uid concept
  try {
    const dirUid = fs.statSync(cwd).uid;
    const processUid = os.userInfo().uid;
    return dirUid === processUid ? "matches" : "mismatch";
  } catch {
    return "unknown";
  }
}

// spec §8's two-layer $HOME/root flow. Only invoked once resolveGraph has
// already returned "no-graph-in-cwd" for a cwd that is either the user's home
// directory or the filesystem root -- silently defaulting a resolution from
// such a broad cwd is exactly the "silently default to X" failure spec §8
// exists to prevent (findings doc #11).
async function gateHomeOrRootCwd(config: KgConfig, mode: InteractionMode): Promise<GateResult> {
  let questionText =
    "You're currently in your own home directory — is this for your personal graph, or one of your existing registered projects?";
  if (mode === "interactive") {
    const ownership = checkHomeOwnership(process.cwd());
    if (ownership === "mismatch") {
      questionText =
        "Heads up: this home directory doesn't appear to belong to the current process's user (possible sudo/container mount). " +
        questionText;
    }
    // "unknown" (e.g. Windows) is treated the same as "matches" -- proceed to
    // the plain question, per spec §8.
  }
  const registeredNames = Object.keys(config.graphs);
  return gate({
    mode,
    reason: "home_or_root_cwd",
    param: "scope",
    accepts: ["personal", ...registeredNames],
    detail: { question: questionText },
    // No real blocking ask() transport exists yet at this layer (spec §12:
    // "mechanism, not native blocking elicitation") -- a never-resolving
    // promise lets gate()'s own Promise.race/timeout machinery (Task 3.2) do
    // what it already does for every other unanswered interactive question,
    // producing the same KMG_INPUT_REQUIRED shape as the automated branch.
    timeoutMs: STUB_ASK_TIMEOUT_MS,
    ask: stubAsk,
  });
}

export type GatedResolution =
  | { kind: "resolved"; name: string; graph: GraphConfig; notice?: string }
  | { kind: "gated"; result: GateResult }
  | { kind: "not-registered"; name: string }
  | { kind: "no-graph-in-cwd" };

// Routes every ResolutionResult outcome through gate() with its real
// per-outcome behavior (Task 6.2), shared between kg_capture and kg_search so
// the two tools don't drift on how archived/fuzzy-match/ambiguous-tie/merged/
// $HOME-or-root resolution is surfaced.
export async function resolveGraphOutcome(
  config: KgConfig,
  resolution: ResolutionResult,
  cwd: string,
  mode: InteractionMode
): Promise<GatedResolution> {
  if (resolution.kind === "resolved") {
    return { kind: "resolved", name: resolution.name, graph: resolution.graph };
  }

  if (resolution.kind === "not-registered") {
    return { kind: "not-registered", name: resolution.name };
  }

  if (resolution.kind === "no-graph-in-cwd") {
    if (!isHomeOrRootCwd(cwd)) return { kind: "no-graph-in-cwd" };
    const gated = await gateHomeOrRootCwd(config, mode);
    if (!("answer" in gated)) return { kind: "gated", result: gated };
    if (gated.answer === "personal") {
      const personal = resolvePersonalGraph(config);
      if ("error" in personal) {
        return { kind: "gated", result: requireInput("home_or_root_cwd_no_personal_kg", "scope", ["personal", ...Object.keys(config.graphs)]) };
      }
      return { kind: "resolved", name: personal.name, graph: personal.graph };
    }
    return resolveGraphOutcome(config, resolveGraph(config, cwd, gated.answer), cwd, mode);
  }

  // findings doc #19: a merged-away entry acts as a transparent alias to its
  // survivor -- plain notice (logged by the caller, not asked as a
  // question), then re-resolve and proceed against the survivor's graph.
  if (resolution.kind === "merged") {
    const notice = `'${resolution.name}' was merged into '${resolution.into}' on ${resolution.at}. Resolving against '${resolution.into}'.`;
    const inner = await resolveGraphOutcome(config, resolveGraph(config, cwd, resolution.into), cwd, mode);
    if (inner.kind === "resolved") {
      return { ...inner, notice: inner.notice ? `${notice} ${inner.notice}` : notice };
    }
    return inner;
  }

  if (resolution.kind === "archived") {
    // findings doc #19: "restore" would recreate the exact duplicate a merge
    // already resolved, so it's excluded whenever mergedInto is set -- belt
    // and suspenders alongside the "merged" branch above, which already
    // routes a mergedInto-set entry away from this branch entirely.
    const accepts = resolution.graph.mergedInto ? ["skip", "ignore"] : ["skip", "ignore", "restore"];
    const gated = await gate({
      mode,
      reason: "archived_entry",
      param: "confirmProceed",
      accepts,
      detail: { name: resolution.name, statusChangedAt: resolution.graph.statusChangedAt },
      timeoutMs: STUB_ASK_TIMEOUT_MS,
      ask: stubAsk,
    });
    if (!("answer" in gated)) return { kind: "gated", result: gated };
    if (gated.answer === "restore") {
      updateConfig((cfg) => changeGraphStatus(cfg, resolution.name, "active"));
      return { kind: "resolved", name: resolution.name, graph: { ...resolution.graph, status: "active" } };
    }
    // "skip"/"ignore": proceed against the archived graph as-is this call --
    // the distinction between the two only governs whether a *future* call
    // re-asks within the same session, and no cross-call session store for
    // that suppression exists yet (out of scope for this task).
    return { kind: "resolved", name: resolution.name, graph: resolution.graph };
  }

  // "fuzzy-match" | "ambiguous-tie": same shape ("here are N registered
  // names, which one"), different reason string for *why* multiple
  // candidates exist (findings doc #13).
  const reason = resolution.kind === "fuzzy-match" ? "fuzzy_match" : "ambiguous_path_tie";
  const gated = await gate({
    mode,
    reason,
    param: "name",
    accepts: resolution.candidates,
    timeoutMs: STUB_ASK_TIMEOUT_MS,
    ask: stubAsk,
  });
  if (!("answer" in gated)) return { kind: "gated", result: gated };
  return resolveGraphOutcome(config, resolveGraph(config, cwd, gated.answer), cwd, mode);
}

// Built to power a "notice the user when they cross from one nested knowledge graph
// into another within the same session" feature, but not yet wired into any tool call path.
// Verified against the full plan set: no later phase's production code path currently
// instantiates or references this class (only its own unit test does) — the nested-KG
// transition notice it was meant to power does not fire yet.
// Future callers touching resolution-driven tool paths should either wire this in or
// flag it as intentionally dropped scope, not assume it's already working.
export class ResolutionSession {
  private lastResolvedName: string | null = null;

  noteResolution(name: string): { changed: boolean } {
    const changed = this.lastResolvedName !== null && this.lastResolvedName !== name;
    this.lastResolvedName = name;
    return { changed };
  }
}

// Detects registry entries pointing at the identical path, but uses a simpler path-normalization
// strategy than resolveGraph's internal normalizeRealPath: this function only does ~ expansion,
// not symlink resolution. As a result, two registry entries with the same real path but reached
// via different symlinks will NOT be detected as a tie by this function (though resolveGraph
// itself does catch that case internally, via its own separate length-based grouping).
// Future callers wiring this into duplicate-detection logic should either upgrade it to use
// normalizeRealPath too, or explicitly accept the symlink-duplication gap.
export function findTruePathTies(config: KgConfig, resolvedPath: string): string[] {
  const target = expand(resolvedPath);
  return Object.entries(config.graphs)
    .filter(([, g]) => expand(g.path) === target)
    .map(([name]) => name);
}

export type ScopeMarker = "personal" | "project" | null;

export function parseScopeMarker(text: string): { marker: ScopeMarker; remainder: string } {
  const match = text.match(/^\[(personal|project)\]\s*/);
  if (!match) return { marker: null, remainder: text };
  return { marker: match[1] as "personal" | "project", remainder: text.slice(match[0].length) };
}

// Ephemeral, process-lifetime scope state (spec §11). Constructed once at
// server startup, never persisted to disk, so a real process restart is
// always a cold start with no scope carried over.
export class PersonalScopeSession {
  private currentScope: "personal" | "project" | null = null;
  private sticky: boolean = false;
  private confirmedRepos: Set<string> = new Set();

  applyMarker(marker: ScopeMarker, sticky: boolean): void {
    this.currentScope = marker;
    this.sticky = marker !== null && sticky;
  }

  // Reading a one-shot scope CONSUMES it: currentScopeFor is called exactly
  // once per kg_search/kg_capture call, so a "one-shot" answer applies to the
  // call that set it and no later one. Without this, a single one-shot
  // [personal] marker permanently pinned the whole process to personal scope
  // -- every later call, marker or not, silently read/wrote the personal KG,
  // which is precisely the prompt-injection threat spec §11 exists to close.
  currentScopeFor(automated: boolean): "personal" | "project" | null {
    if (automated) return null; // ephemeral scope disabled entirely in automated mode, spec §11
    const scope = this.currentScope;
    if (!this.sticky) this.currentScope = null;
    return scope;
  }

  hasConfirmedRepo(repoRoot: string): boolean {
    return this.confirmedRepos.has(repoRoot);
  }

  confirmRepo(repoRoot: string): void {
    this.confirmedRepos.add(repoRoot);
  }
}

// findings doc #14: kg_search's scope:"all" cross-KG union-read mode gated
// behind a which-KGs-and-which-excluded confirmation. Same sticky/one-shot
// shape as PersonalScopeSession, applied to a different trigger -- "may this
// call search across every registered KG" instead of "is this call
// personal-scoped." Ephemeral, process-lifetime, never persisted to disk.
export class CrossKgSearchSession {
  private confirmedForSession: boolean = false;
  private excluded: Set<string> = new Set();

  confirmSession(excluded: string[]): void {
    this.confirmedForSession = true;
    this.excluded = new Set(excluded);
  }

  isConfirmedForSession(): boolean {
    return this.confirmedForSession;
  }

  excludedNames(): string[] {
    return [...this.excluded];
  }
}

// spec §11: a `scope: "user"` request from a repo the assistant hasn't seen
// before needs its own confirmation, independent of the ordinary
// stay/one-shot marker flow in applyMarker/currentScopeFor above -- a
// crafted instruction embedded in a freshly-cloned untrusted repo could
// otherwise ask the assistant to write to the user's personal KG silently.
// Sibling to Task 6.4's confirmFirstWrite: same gate() plumbing, its own
// reason string, and per-repo-root (not per-graph-name) persistence via
// PersonalScopeSession.confirmedRepos.
export async function confirmPersonalScopeAccess(
  session: PersonalScopeSession,
  repoRoot: string,
  opts: {
    confirmPersonalScope?: boolean;
    mode: InteractionMode;
    timeoutMs?: number;
    ask: (signal: AbortSignal, detail?: unknown) => Promise<AskResult>;
  }
): Promise<{ confirmed: true } | InputRequiredError> {
  if (session.hasConfirmedRepo(repoRoot)) return { confirmed: true }; // already confirmed this process, don't re-ask

  if (opts.mode === "automated") {
    if (!opts.confirmPersonalScope) return requireInput("personal_scope_unseen_repo", "confirmPersonalScope");
    session.confirmRepo(repoRoot);
    return { confirmed: true };
  }

  const gated = await gate({
    mode: opts.mode,
    reason: "personal_scope_unseen_repo",
    param: "confirmPersonalScope",
    accepts: ["yes", "no"],
    timeoutMs: opts.timeoutMs,
    ask: opts.ask,
  });
  if ("error" in gated) return gated;
  if (!("answer" in gated) || gated.answer !== "yes") {
    return requireInput("personal_scope_unseen_repo", "confirmPersonalScope", ["yes", "no"]);
  }
  session.confirmRepo(repoRoot);
  return { confirmed: true };
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
