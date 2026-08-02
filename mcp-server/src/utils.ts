import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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
  lastUsed?: string; // KEPT for now, made OPTIONAL rather than required (2026-08-01, Opus pass 3, C1) —
  // nothing reads this field except config.ts's kg_config_list display line (deleted in Task 1.9 Step 7),
  // and making it optional here means no literal anywhere needs to actively supply-or-omit it in lockstep
  // with the type's own requirement window; it simply stops mattering once nothing writes it, one character
  // instead of a second Task 1.12 Step 0 extension into `src/tools/config.ts`/`src/cli.ts`. Removed outright
  // in Task 1.12.
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
  active: string | null;
  graphs: Record<string, GraphConfig>;
  sanitization: {
    enabled: boolean;
    patterns: SanitizationPattern[];
    action: "warn" | "block";
  };
}

const DEFAULT_CONFIG: KgConfig = {
  version: "1.0.0",
  active: null,
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
  // Read-only legacy fallback: pre-v0.6 installs kept kg-config.json under
  // ~/.claude/. Without this, users who never migrated get DEFAULT_CONFIG and
  // the config-location upgrade never becomes reachable. Never written here —
  // migration is handled explicitly by kg_upgrade's config-location category.
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
    return JSON.parse(raw) as KgConfig;
  }
  return { ...DEFAULT_CONFIG };
}

export function writeConfig(config: KgConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
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

export function getActiveGraphPath(config: KgConfig): string | null {
  if (!config.active || !config.graphs[config.active]) {
    return null;
  }
  const graphPath = config.graphs[config.active].path;
  // Expand ~ to home directory
  return graphPath.replace(/^~/, os.homedir());
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
