import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export declare const FTS5_DB_FILENAME = ".fts5.db";
/**
 * Returns the absolute path to the user-level FTS5 database for a given KG name.
 * Stored in ~/.claude/kg-fts5/<kgName>.db (outside project directories).
 * Creates the directory if it does not exist.
 * @deprecated Use resolveDbPath(kgName, "project-local") — DB now at ~/.kmgraph/index/
 */
export declare function getFTS5DbPath(kgName: string): string;
export declare function getPersonalDbPath(): string;
export declare function getProjectDbPath(kgName: string): string;
/**
 * Central dispatcher: routes to personal.db or projects/<kgName>.db based on kgType.
 * Note: kgName is ignored when kgType is "personal" (personal DB is a fixed singleton path).
 */
export declare function resolveDbPath(kgName: string, kgType: string): string;
/**
 * Resolves the content root for a KG path.
 * If the KG contains a docs/lessons-learned subdirectory (v0.2+ layout),
 * returns the docs/ directory so that lessons-learned, decisions, and sessions
 * are found under docs/. Otherwise falls back to kgPath itself.
 */
export declare function resolveContentRoot(kgPath: string): string;
export interface RebuildResult {
    indexed: number;
    skipped: number;
    removed: number;
    duration_ms: number;
    db_path: string;
}
export interface SearchResult {
    file: string;
    relativePath: string;
    line: number;
    context: string;
    matchType: "title" | "heading" | "body";
    /** KG name this result came from. Populated by multi-KG search; absent for single-KG calls. */
    sourceKg?: string;
    /** KG type this result came from ("project-local" | "personal" | etc.). */
    sourceKgType?: string;
}
/**
 * Returns the absolute path to the FTS5 database for a given KG root.
 * @deprecated Use getFTS5DbPath(kgName) instead — stores DB in user-level cache.
 */
export declare function getDbPath(kgPath: string): string;
/**
 * Strips FTS5 operator characters from a raw query string so it can be used
 * safely in a MATCH clause. Returns '""' for empty / whitespace-only input.
 */
export declare function sanitizeFts5Query(raw: string): string;
/**
 * Creates the FTS5 virtual table and the index-meta tracking table if they do
 * not already exist.
 */
export declare function initDb(db: any): void;
/**
 * Parses a single markdown file into sections and inserts FTS5 rows.
 *
 * Returns the number of rows inserted.
 */
export declare function indexFile(db: any, filePath: string, kgPath: string): number;
/**
 * Incrementally rebuilds the FTS5 index for a knowledge graph.
 *
 * - Re-indexes files whose mtime has changed since last index.
 * - Removes index rows for files that no longer exist on disk.
 * - Skips files that haven't changed.
 */
export declare function rebuildIndex(kgPath: string, kgName: string, kgType?: string): RebuildResult;
/**
 * Searches the FTS5 index using BM25 ranking. Returns up to 50 results.
 */
export declare function searchFts5(dbPath: string, query: string, kgPath: string): SearchResult[];
/**
 * Registers the `kg_fts5_status` MCP tool.
 * Returns { exists: boolean, db_path: string, kgType: string } — read-only probe,
 * never creates directories.
 */
export declare function registerFts5StatusTool(server: McpServer): void;
/**
 * Registers the `kg_fts5_rebuild` MCP tool.
 */
export declare function registerFts5Tool(server: McpServer): void;
//# sourceMappingURL=fts5.d.ts.map