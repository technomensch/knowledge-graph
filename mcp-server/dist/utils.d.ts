export declare const CONFIG_PATH: string;
export interface CategoryConfig {
    name: string;
    prefix: string | null;
    git: "commit" | "ignore";
}
export interface GraphConfig {
    name: string;
    path: string;
    type: "project-local" | "global" | "cowork" | "custom";
    categories: CategoryConfig[];
    createdAt: string;
    lastUsed: string;
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
export declare function getPluginRoot(): string;
/**
 * Recursively walk a directory and return all matching file paths
 */
export declare function walkDir(dir: string, ext?: string): string[];
//# sourceMappingURL=utils.d.ts.map