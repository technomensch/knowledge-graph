import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export const CONFIG_PATH = process.env.KG_CONFIG_PATH || path.join(os.homedir(), ".claude", "kg-config.json");

export interface CategoryConfig {
  name: string;
  prefix: string | null;
  git: "commit" | "ignore";
}

export interface GraphConfig {
  name: string;
  path: string;
  type: "project-local" | "personal" | "cowork" | "custom";
  categories: CategoryConfig[];
  createdAt: string;
  lastUsed: string;
  chatHistoryPath?: string;
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
  if (!fs.existsSync(CONFIG_PATH)) {
    return { ...DEFAULT_CONFIG };
  }
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  return JSON.parse(raw) as KgConfig;
}

export function writeConfig(config: KgConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function getActiveGraphPath(config: KgConfig): string | null {
  if (!config.active || !config.graphs[config.active]) {
    return null;
  }
  const graphPath = config.graphs[config.active].path;
  // Expand ~ to home directory
  return graphPath.replace(/^~/, os.homedir());
}

/**
 * Resolve the chat-history directory for a graph.
 * If chatHistoryPath is set in config, use it (expanding ~).
 * Otherwise fall back to {expandedKgPath}/chat-history.
 */
export function getChatHistoryPath(graph: GraphConfig, expandedKgPath: string): string {
  if (graph.chatHistoryPath) {
    return graph.chatHistoryPath.replace(/^~/, os.homedir());
  }
  return path.join(expandedKgPath, "chat-history");
}

export function getPluginRoot(): string {
  // When running as plugin: CLAUDE_PLUGIN_ROOT is set
  // When running standalone: use parent of mcp-server directory
  return process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, "..", "..");
}

/**
 * Derive project root from KG path.
 * If path ends in /docs, parent is project root; otherwise path itself is root.
 */
export function getProjectRoot(kgPath: string): string {
  if (kgPath.endsWith('/docs')) {
    return path.dirname(kgPath);
  }
  return kgPath;
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
