import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export declare const FTS5_DB_FILENAME = ".fts5.db";
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
export declare function rebuildIndex(kgPath: string): RebuildResult;
/**
 * Searches the FTS5 index using BM25 ranking. Returns up to 50 results.
 */
export declare function searchFts5(dbPath: string, query: string, kgPath: string): SearchResult[];
/**
 * Registers the `kg_fts5_rebuild` MCP tool.
 */
export declare function registerFts5Tool(server: McpServer): void;
//# sourceMappingURL=fts5.d.ts.map