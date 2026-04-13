export declare const CONFIG_PATH: string;
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
export declare function readConfig(): KgConfig;
export declare function writeConfig(config: KgConfig): void;
export declare function getActiveGraphPath(config: KgConfig): string | null;
/**
 * Resolve the chat-history directory for a graph.
 * If chatHistoryPath is set in config, use it (expanding ~).
 * Otherwise fall back to {expandedKgPath}/chat-history.
 */
export declare function getChatHistoryPath(graph: GraphConfig, expandedKgPath: string): string;
export declare function getPluginRoot(): string;
/**
 * Derive project root from KG path.
 * If path ends in /docs, parent is project root; otherwise path itself is root.
 */
export declare function getProjectRoot(kgPath: string): string;
/**
 * Returns all registered KG paths, optionally filtered by type.
 * Expands ~ in paths. Skips graphs without a path.
 */
export declare function getAllGraphPaths(config: KgConfig, types?: Array<GraphConfig["type"]>): Array<{
    name: string;
    path: string;
    type: GraphConfig["type"];
}>;
/**
 * Recursively walk a directory and return all matching file paths
 */
export declare function walkDir(dir: string, ext?: string): string[];
//# sourceMappingURL=utils.d.ts.map