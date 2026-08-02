import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

export const CONFIG_PATH = process.env.KG_CONFIG_PATH || path.join(os.homedir(), ".kmgraph", "kg-config.json");

export interface CategoryConfig {
  name: string;
  prefix: string | null;
  git: "commit" | "ignore";
}

export type GraphStatus = "pending" | "active" | "archived" | "deleted";

export interface GraphConfig {
  name: string;
  path: string;
  type: "project-local" | "personal" | "custom";
  categories: CategoryConfig[];
  createdAt: string;
  status: GraphStatus;
  statusChangedAt: string;
  githubUser?: string;
  graphId: string;
  mergedInto?: string;
  duplicateOf?: string;
  originUrl?: string;
  confirmedBy?: "interactive" | "automated";
  lastAppliedVersion?: string;
}

export interface SanitizationPattern {
  type: string;
  pattern?: string;
  enabled: boolean;
}

export interface KgConfig {
  version: string;
  graphs: Record<string, GraphConfig>;
  sanitization: {
    enabled: boolean;
    patterns: SanitizationPattern[];
    action: "warn" | "block";
  };
}

const DEFAULT_CONFIG: KgConfig = {
  version: "1.0.0",
  graphs: {},
  sanitization: {
    enabled: false,
    patterns: [],
    action: "warn",
  },
};

function parseConfigOrThrow(raw: string, filePath: string): KgConfig {
  try {
    return JSON.parse(raw) as KgConfig;
  } catch (err) {
    throw new Error(`Failed to parse KG config at ${filePath}: ${(err as Error).message}`);
  }
}

export function readConfig(): KgConfig {
  // Primary: the platform-neutral location (or KG_CONFIG_PATH override).
  if (fs.existsSync(CONFIG_PATH)) {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return parseConfigOrThrow(raw, CONFIG_PATH);
  }
  // Legacy fallback: pre-v0.6 installs kept kg-config.json under ~/.claude/.
  // Without this, users who never migrated get DEFAULT_CONFIG and the
  // config-location upgrade never becomes reachable. Content is written
  // forward to CONFIG_PATH below on first read (spec §6) so subsequent reads
  // and writes agree on a single file; schema upgrade and legacy-file
  // deletion remain kg_upgrade's config-location category's job.
  //
  // Only applies when using the default resolution path. An explicit
  // KG_CONFIG_PATH override means the user opted into a custom location: a
  // missing custom path must yield a fresh/empty config, NOT a silent inherit
  // from an unrelated legacy file. This matches checkConfigLocation() /
  // applyConfigLocation() in tools/upgrade.ts, which both skip legacy-location
  // logic entirely when KG_CONFIG_PATH is set.
  if (process.env.KG_CONFIG_PATH) {
    return { ...DEFAULT_CONFIG };
  }
  const legacyPath = path.join(process.env.HOME || os.homedir(), ".claude", "kg-config.json");
  if (fs.existsSync(legacyPath)) {
    const raw = fs.readFileSync(legacyPath, "utf-8");
    const legacyConfig = parseConfigOrThrow(raw, legacyPath);
    // findings doc #5: write it forward once, so every subsequent read/write
    // in this and any other process agrees on a single file — the
    // precondition spec §6 requires before Task 2.3's merge-on-conflict
    // writer is coherent. Content-preserving only: the legacy file's exact
    // shape (possibly still pre-Task-1.1 schema) is carried forward
    // unchanged; Task 8.1 upgrades the shape and deletes the legacy file
    // with backup/consent.
    writeConfig(legacyConfig);
    return legacyConfig;
  }
  return { ...DEFAULT_CONFIG };
}

// Monotonic per-process counter — avoids same-millisecond collisions that
// `Date.now()` alone can hit when two writes land in the same process tick.
// pid is still included so concurrent *processes* never collide either.
let writeConfigTmpCounter = 0;

export function writeConfig(config: KgConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let mode = 0o644;
  if (fs.existsSync(CONFIG_PATH)) {
    mode = fs.statSync(CONFIG_PATH).mode & 0o777;
  }

  const tmpPath = path.join(dir, `.kg-config.json.tmp.${process.pid}.${writeConfigTmpCounter++}`);
  const fd = fs.openSync(tmpPath, "w", mode);
  try {
    fs.writeFileSync(fd, JSON.stringify(config, null, 2), "utf-8");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.chmodSync(tmpPath, mode);

  try {
    renameWithRetry(tmpPath, CONFIG_PATH);
  } catch (err) {
    // Rename never succeeded — don't leave a stray temp file behind forever.
    fs.rmSync(tmpPath, { force: true });
    throw err;
  }

  // Content fsync above only guarantees the temp file's bytes survive a
  // crash; it says nothing about the directory-entry update that makes them
  // visible under CONFIG_PATH's name. fsync the parent directory too so the
  // rename itself is durable (spec §6).
  //
  // Review note (2026-08-01, findings doc #24 round-3 correction): Node cannot
  // open a directory handle via fs.open on Windows (EISDIR/EPERM), and
  // directory fsync is a POSIX-only concept. Without a guard, this block
  // would throw on every writeConfig() call on Windows -- AFTER the rename
  // already succeeded, so the write itself is fine but the tool would
  // incorrectly report failure. Windows already gets durability from the
  // EPERM/EBUSY rename retry a few lines above; skip the directory fsync
  // there rather than fail on it.
  try {
    const dirFd = fs.openSync(dir, "r");
    try {
      fs.fsyncSync(dirFd);
    } finally {
      fs.closeSync(dirFd);
    }
  } catch {
    // Directory fsync unsupported on this platform (Windows) -- the rename
    // itself already succeeded above; this is a best-effort durability
    // improvement, not a correctness requirement.
  }
}

export function updateConfig<T>(
  mutator: (config: KgConfig) => T,
  opts: { intentful?: boolean } = {}
): T {
  const intentful = opts.intentful ?? true;
  const maxAttempts = intentful ? 3 : 2;

  // Fixed merge-base for the whole call (like a git merge-base), not re-read
  // per attempt: re-reading it fresh each attempt would let a concurrent
  // writer that keeps reasserting the same value "launder" itself into the
  // baseline on the next attempt, hiding an unresolved conflict instead of
  // surfacing it after retries are exhausted.
  const beforeSnapshot = JSON.parse(JSON.stringify(readConfig())) as KgConfig;

  let lastResult: T | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const working = JSON.parse(JSON.stringify(readConfig())) as KgConfig;
    lastResult = mutator(working);

    const afterOnDisk = readConfig();
    const merged = mergeGraphs(beforeSnapshot, afterOnDisk, working);

    if (merged.conflict && attempt < maxAttempts - 1) {
      if (intentful) {
        const jitter = Math.floor(Math.random() * 5);
        const until = Date.now() + jitter;
        while (Date.now() < until) { /* microsecond window */ }
        continue;
      } else {
        return lastResult as T; // best-effort: skip silently
      }
    }
    if (merged.conflict && attempt === maxAttempts - 1) {
      if (intentful) {
        throw new Error(
          `updateConfig: could not merge changes after ${maxAttempts} attempts — a concurrent writer keeps touching the same registry key(s). Retry the operation.`
        );
      }
      return lastResult as T; // best-effort: skip silently, don't fail the caller's real operation
    }

    writeConfig(merged.config);
    return lastResult as T;
  }
  return lastResult as T;
}

function mergeGraphs(
  before: KgConfig,
  afterOnDisk: KgConfig,
  working: KgConfig
): { config: KgConfig; conflict: boolean } {
  const result: KgConfig = JSON.parse(JSON.stringify(afterOnDisk));
  let conflict = false;

  // Tier 1: `.graphs[name]` entries.
  const touchedByMutator = new Set(
    Object.keys(working.graphs).filter(
      (name) => JSON.stringify(working.graphs[name]) !== JSON.stringify(before.graphs[name])
    )
  );
  const removedByMutator = Object.keys(before.graphs).filter((name) => !(name in working.graphs));

  for (const name of touchedByMutator) {
    const changedOnDiskToo =
      JSON.stringify(before.graphs[name]) !== JSON.stringify(afterOnDisk.graphs[name]);
    // Also require the current disk value to still disagree with what we're
    // about to write: with a fixed merge-base, a brand-new key that simply
    // hasn't been persisted yet would otherwise look "changed since base"
    // forever (base never had it) and falsely conflict on every attempt.
    const stillDisagreesWithDisk =
      JSON.stringify(afterOnDisk.graphs[name]) !== JSON.stringify(working.graphs[name]);
    if (changedOnDiskToo && stillDisagreesWithDisk) {
      conflict = true; // same key touched by both sides — genuinely contested
    }
    result.graphs[name] = working.graphs[name];
  }
  for (const name of removedByMutator) {
    delete result.graphs[name];
  }

  // Tier 2: every other top-level registry key (`version`, `sanitization`,
  // and any future top-level field) — spec §6 says "merge only the specific
  // registry keys that changed," not "only `.graphs` keys." A `version` bump
  // or `sanitization` edit landing concurrently with an unrelated `graphs`
  // write must survive the same way a disjoint `graphs` write does.
  const topLevelKeys = new Set([
    ...Object.keys(before),
    ...Object.keys(afterOnDisk),
    ...Object.keys(working),
  ]) as Set<keyof KgConfig>;
  topLevelKeys.delete("graphs" as keyof KgConfig);

  for (const key of topLevelKeys) {
    const mutatorTouched = JSON.stringify(working[key]) !== JSON.stringify(before[key]);
    if (!mutatorTouched) continue; // mutator didn't change it — disk value (already in `result`) wins
    const diskChangedToo = JSON.stringify(before[key]) !== JSON.stringify(afterOnDisk[key]);
    if (diskChangedToo && JSON.stringify(afterOnDisk[key]) !== JSON.stringify(working[key])) {
      conflict = true; // both sides changed this key to different values — genuinely contested
    }
    (result as any)[key] = working[key];
  }

  return { config: result, conflict };
}

function renameWithRetry(tmpPath: string, targetPath: string, attempts = 5): void {
  for (let i = 0; i < attempts; i++) {
    try {
      fs.renameSync(tmpPath, targetPath);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      // Windows: AV/Search Indexer/OneDrive can transiently hold the handle.
      if ((code === "EPERM" || code === "EBUSY") && i < attempts - 1) {
        const waitMs = 10 * Math.pow(2, i) + Math.floor(Math.random() * 10);
        const until = Date.now() + waitMs;
        while (Date.now() < until) { /* bounded busy-wait, window is milliseconds */ }
        continue;
      }
      throw err;
    }
  }
}

export function changeGraphStatus(
  config: KgConfig,
  name: string,
  status: GraphStatus,
  opts: { githubUser?: string } = {}
): KgConfig {
  const graph = config.graphs[name];
  if (!graph) throw new Error(`changeGraphStatus: unknown graph '${name}'`);
  graph.status = status;
  graph.statusChangedAt = new Date().toISOString();
  if (opts.githubUser) graph.githubUser = opts.githubUser;
  return config;
}

export function isWritable(graph: GraphConfig): boolean {
  return graph.status === "active";
}

const GRAPH_ID_MARKER_FILE = ".kmgraph-id";

export function mintGraphId(): string {
  return crypto.randomUUID();
}

export function writeGraphIdMarker(kgPath: string, graphId: string): void {
  const markerPath = path.join(kgPath, GRAPH_ID_MARKER_FILE);
  if (fs.existsSync(markerPath)) {
    const existing = fs.readFileSync(markerPath, "utf-8").trim();
    if (existing === graphId) return; // idempotent no-op
    throw new Error(
      `writeGraphIdMarker: ${markerPath} already has graphId '${existing}', refusing to overwrite with '${graphId}'`
    );
  }
  fs.writeFileSync(markerPath, graphId + "\n", "utf-8");
}

export function readGraphIdMarker(kgPath: string): string | null {
  const markerPath = path.join(kgPath, GRAPH_ID_MARKER_FILE);
  if (!fs.existsSync(markerPath)) return null;
  return fs.readFileSync(markerPath, "utf-8").trim();
}

// The only sanctioned way to overwrite an existing marker with a *different*
// id. No mismatch guard — that's the whole point (fork deliberately breaks
// identity from whatever marker the clone carried in). Callers: Task 4.4's
// "fork" branch, and Task 4.6's standalone re-mint tool. Every other caller
// must keep using the strict `writeGraphIdMarker` above.
export function remintGraphIdMarker(kgPath: string, graphId: string): void {
  const markerPath = path.join(kgPath, GRAPH_ID_MARKER_FILE);
  fs.writeFileSync(markerPath, graphId + "\n", "utf-8");
}

export function findRegistryEntryByGraphId(
  config: KgConfig,
  graphId: string
): { name: string; graph: GraphConfig } | null {
  for (const [name, graph] of Object.entries(config.graphs)) {
    if (graph.status !== "deleted" && graph.graphId === graphId) {
      return { name, graph };
    }
  }
  return null;
}

// "path-missing" is intentionally unreachable: checkGraphPathHealth collapses both
// "path doesn't exist" and "path exists but is empty directory" into "content-missing"
// since both need the same handling currently. Any code pattern-matching on "path-missing"
// specifically will never see it fire. A future caller needing finer granularity should
// branch on fs.existsSync directly rather than expecting this function to ever return it.
export type PathHealth = "ok" | "parent-unreachable" | "path-missing" | "content-missing";

export function checkGraphPathHealth(graph: GraphConfig): PathHealth {
  const expanded = graph.path.replace(/^~/, os.homedir());
  const parent = path.dirname(expanded);
  if (!fs.existsSync(parent)) return "parent-unreachable";
  if (!fs.existsSync(expanded)) return "content-missing";
  const entries = fs.readdirSync(expanded);
  if (entries.length === 0) return "content-missing";
  return "ok";
}

export function getPluginRoot(): string {
  // When running as plugin: CLAUDE_PLUGIN_ROOT is set
  // When running standalone: use parent of mcp-server directory
  return process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, "..", "..");
}

/**
 * Derive project root from KG path: the parent of the KG's content directory,
 * whatever that directory is named.
 */
export function getProjectRoot(kgPath: string): string {
  return path.dirname(kgPath);
}

/**
 * Returns all registered KG paths, optionally filtered by type.
 * Expands ~ in paths. Skips graphs without a path.
 */
export function getAllGraphPaths(
  config: KgConfig,
  types?: Array<GraphConfig["type"]>
): Array<{ name: string; path: string; type: GraphConfig["type"] }> {
  return Object.entries(config.graphs)
    .filter(([, graph]) => {
      if (!graph.path) return false;
      if (!types) return true;
      // Treat missing type as "project-local" for v0.2.1 compat
      const graphType = (graph.type || "project-local") as GraphConfig["type"];
      return types.includes(graphType);
    })
    .map(([name, graph]) => ({
      name,
      path: graph.path.replace(/^~/, os.homedir()),
      type: (graph.type || "project-local") as GraphConfig["type"],
    }));
}

/**
 * Recursively walk a directory and return all matching file paths
 */
export function walkDir(dir: string, ext: string = ".md"): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}
