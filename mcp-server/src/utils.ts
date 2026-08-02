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

export function readConfig(): KgConfig {
  // Primary: the platform-neutral location (or KG_CONFIG_PATH override).
  if (fs.existsSync(CONFIG_PATH)) {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as KgConfig;
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
    const legacyConfig = JSON.parse(raw) as KgConfig;
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
