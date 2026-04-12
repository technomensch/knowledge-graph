import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { readConfig, writeConfig, getActiveGraphPath, walkDir } from "../utils.js";

// Graceful fallback: node-sqlite3-wasm may be absent on first run after upgrade.
// The SessionStart hook will install it and prompt users to restart Claude Code.
// Until then, FTS5 functions return empty results and kg_search falls back to linear scan.
let Database: any;
let fts5Available = false;
try {
  Database = require("node-sqlite3-wasm").Database;
  fts5Available = true;
} catch {
  // node-sqlite3-wasm not installed yet — FTS5 disabled until next restart
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FTS5_DB_FILENAME = ".fts5.db";

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

/**
 * Returns the absolute path to the user-level FTS5 database for a given KG name.
 * Stored in ~/.claude/kg-fts5/<kgName>.db (outside project directories).
 * Creates the directory if it does not exist.
 * @deprecated Use resolveDbPath(kgName, kgType) — DB now at ~/.kmgraph/index/
 */
export function getFTS5DbPath(kgName: string): string {
  const dir = path.join(os.homedir(), ".claude", "kg-fts5");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${kgName}.db`);
}

export function getPersonalDbPath(): string {
  const dir = path.join(os.homedir(), ".kmgraph", "index");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "personal.db");
}

export function getProjectDbPath(kgName: string): string {
  // TODO(v0.3.7): name collision risk — two repos with the same kgName share this file.
  // Future: use a registry with stable content-hash IDs as filenames.
  const dir = path.join(os.homedir(), ".kmgraph", "index", "projects");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${kgName}.db`);
}

export function resolveDbPath(kgName: string, kgType: string): string {
  if (kgType === "personal") return getPersonalDbPath();
  return getProjectDbPath(kgName);
}

/**
 * Resolves the content root for a KG path.
 * If the KG contains a docs/lessons-learned subdirectory (v0.2+ layout),
 * returns the docs/ directory so that lessons-learned, decisions, and sessions
 * are found under docs/. Otherwise falls back to kgPath itself.
 */
export function resolveContentRoot(kgPath: string): string {
  const docsLessons = path.join(kgPath, "docs", "lessons-learned");
  if (fs.existsSync(docsLessons)) {
    return path.join(kgPath, "docs");
  }
  return kgPath;
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the absolute path to the FTS5 database for a given KG root.
 * @deprecated Use getFTS5DbPath(kgName) instead — stores DB in user-level cache.
 */
export function getDbPath(kgPath: string): string {
  return path.join(kgPath, FTS5_DB_FILENAME);
}

/**
 * Strips FTS5 operator characters from a raw query string so it can be used
 * safely in a MATCH clause. Returns '""' for empty / whitespace-only input.
 */
export function sanitizeFts5Query(raw: string): string {
  let sanitized = raw
    .replace(/[":(){}[\]^~*+\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized) return '""';
  return sanitized;
}

// ---------------------------------------------------------------------------
// Schema initialisation
// ---------------------------------------------------------------------------

/**
 * Creates the FTS5 virtual table and the index-meta tracking table if they do
 * not already exist.
 */
export function initDb(db: any): void {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS kg_entries USING fts5(
      file_path UNINDEXED,
      relative_path,
      section_heading,
      content,
      match_type UNINDEXED,
      line_offset UNINDEXED,
      tokenize = 'porter unicode61'
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS kg_index_meta (
      file_path TEXT PRIMARY KEY,
      mtime REAL,
      indexed_at INTEGER,
      row_count INTEGER
    );
  `);
}

// ---------------------------------------------------------------------------
// Markdown section parser + file indexer
// ---------------------------------------------------------------------------

interface ParsedSection {
  heading: string;
  matchType: "title" | "heading" | "body";
  lineOffset: number;
  lines: string[];
}

/**
 * Parses a single markdown file into sections and inserts FTS5 rows.
 *
 * Returns the number of rows inserted.
 */
export function indexFile(db: any, filePath: string, kgPath: string): number {
  const content = fs.readFileSync(filePath, "utf-8");
  const relativePath = path.relative(kgPath, filePath);
  const lines = content.split("\n");

  // Remove old rows for this file
  db.run("DELETE FROM kg_entries WHERE file_path = ?", [filePath]);

  // Parse YAML frontmatter
  let frontmatterTitle: string | null = null;
  let contentStartLine = 0;

  if (lines[0] && lines[0].trim() === "---") {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        contentStartLine = i + 1;
        break;
      }
      const titleMatch = lines[i].match(/^title:\s*["']?(.+?)["']?\s*$/);
      if (titleMatch) {
        frontmatterTitle = titleMatch[1];
      }
    }
  }

  // Collect sections
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;

  // If we have a frontmatter title, create a title section
  if (frontmatterTitle) {
    currentSection = {
      heading: frontmatterTitle,
      matchType: "title",
      lineOffset: 1,
      lines: [],
    };
  }

  for (let i = contentStartLine; i < lines.length; i++) {
    const line = lines[i];
    const h1Match = line.match(/^#\s+(.+)/);
    const h2Match = line.match(/^##\s+(.+)/);

    if (h1Match || h2Match) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection);
      }

      currentSection = {
        heading: h1Match ? h1Match[1] : h2Match![1],
        matchType: h1Match ? "title" : "heading",
        lineOffset: i + 1, // 1-based
        lines: [],
      };
    } else {
      if (!currentSection) {
        // Body text before any heading
        currentSection = {
          heading: frontmatterTitle || path.basename(filePath, ".md"),
          matchType: "body",
          lineOffset: i + 1,
          lines: [],
        };
      }
      currentSection.lines.push(line);
    }
  }

  // Push final section
  if (currentSection) {
    sections.push(currentSection);
  }

  // Insert rows
  const insertStmt = db.prepare(
    `INSERT INTO kg_entries (file_path, relative_path, section_heading, content, match_type, line_offset)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  let rowCount = 0;
  for (const section of sections) {
    const sectionContent = section.lines.join("\n").trim();
    // Skip empty sections (headings with no body) unless it is a title
    if (!sectionContent && section.matchType !== "title") continue;

    insertStmt.run([
      filePath,
      relativePath,
      section.heading,
      sectionContent || section.heading,
      section.matchType,
      section.lineOffset,
    ]);
    rowCount++;
  }
  insertStmt.finalize();

  // Update meta
  const mtime = fs.statSync(filePath).mtimeMs;
  db.run(
    `INSERT OR REPLACE INTO kg_index_meta (file_path, mtime, indexed_at, row_count)
     VALUES (?, ?, ?, ?)`,
    [filePath, mtime, Date.now(), rowCount]
  );

  return rowCount;
}

// ---------------------------------------------------------------------------
// Incremental rebuild
// ---------------------------------------------------------------------------

/**
 * Incrementally rebuilds the FTS5 index for a knowledge graph.
 *
 * - Re-indexes files whose mtime has changed since last index.
 * - Removes index rows for files that no longer exist on disk.
 * - Skips files that haven't changed.
 */
export function rebuildIndex(kgPath: string, kgName: string): RebuildResult {
  if (!fts5Available) {
    throw new Error(
      "FTS5 search engine not available. Restart Claude Code to complete the upgrade installation."
    );
  }
  const start = Date.now();
  const dbPath = getFTS5DbPath(kgName);
  const db = new Database(dbPath);

  try {
    initDb(db);

    // Resolve content root: v0.2+ KGs store content under docs/
    const contentRoot = resolveContentRoot(kgPath);

    // Collect all .md files from target subdirectories
    const searchDirs = ["knowledge", "lessons-learned", "decisions", "sessions"];
    const allFiles: string[] = [];

    for (const dir of searchDirs) {
      const dirPath = path.join(contentRoot, dir);
      allFiles.push(...walkDir(dirPath, ".md"));
    }

    let indexed = 0;
    let skipped = 0;

    // Index new / changed files
    for (const filePath of allFiles) {
      const currentMtime = fs.statSync(filePath).mtimeMs;

      // Check existing meta
      const meta = db.get(
        "SELECT mtime FROM kg_index_meta WHERE file_path = ?",
        [filePath]
      ) as { mtime: number } | null;

      if (meta && meta.mtime === currentMtime) {
        skipped++;
      } else {
        indexFile(db, filePath, kgPath);
        indexed++;
      }
    }

    // Clean up deleted files
    let removed = 0;
    const allMeta = db.all("SELECT file_path FROM kg_index_meta") as Array<{
      file_path: string;
    }>;

    for (const row of allMeta) {
      if (!fs.existsSync(row.file_path)) {
        db.run("DELETE FROM kg_entries WHERE file_path = ?", [row.file_path]);
        db.run("DELETE FROM kg_index_meta WHERE file_path = ?", [row.file_path]);
        removed++;
      }
    }

    return {
      indexed,
      skipped,
      removed,
      duration_ms: Date.now() - start,
      db_path: dbPath,
    };
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// FTS5 search
// ---------------------------------------------------------------------------

/**
 * Searches the FTS5 index using BM25 ranking. Returns up to 50 results.
 */
export function searchFts5(
  dbPath: string,
  query: string,
  kgPath: string
): SearchResult[] {
  if (!fts5Available) {
    return []; // Falls back to linear scan in search.ts; upgrade install pending restart
  }
  const sanitized = sanitizeFts5Query(query);
  const db = new Database(dbPath, { fileMustExist: true });

  try {
    const rows = db.all(
      `SELECT file_path, relative_path, section_heading, content, match_type,
              line_offset, bm25(kg_entries) as rank
       FROM kg_entries
       WHERE kg_entries MATCH ?
       ORDER BY rank
       LIMIT 50`,
      [sanitized]
    ) as Array<{
      file_path: string;
      relative_path: string;
      section_heading: string;
      content: string;
      match_type: string;
      line_offset: number;
      rank: number;
    }>;

    return rows.map((row) => ({
      file: row.file_path,
      relativePath: row.relative_path,
      line: row.line_offset || 0,
      context: (row.content || "").slice(0, 200),
      matchType: row.match_type as "title" | "heading" | "body",
    }));
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// MCP tool registration
// ---------------------------------------------------------------------------

/**
 * Registers the `kg_fts5_rebuild` MCP tool.
 */
export function registerFts5Tool(server: McpServer): void {
  server.tool(
    "kg_fts5_rebuild",
    "Build or refresh FTS5 full-text search index for the active knowledge graph. " +
      "Indexes all .md files in knowledge/, lessons-learned/, decisions/, sessions/. " +
      "Incremental: only re-indexes changed files. Run after sync-all or any time " +
      "search results seem stale.",
    {
      kgPath: z
        .string()
        .optional()
        .describe("Override KG path (default: active KG)"),
    },
    async ({ kgPath }) => {
      if (!fts5Available) {
        return {
          content: [{
            type: "text" as const,
            text: "Search index is not available yet. The required package was installed in the background — please restart Claude Code and try again.",
          }],
          isError: true,
        };
      }
      try {
        const config = readConfig();
        let resolvedPath: string;
        let resolvedName: string;

        if (kgPath) {
          resolvedPath = kgPath.replace(/^~/, os.homedir());
          // Find the matching KG name from config, or derive from path basename
          const matchedEntry = Object.entries(config.graphs || {}).find(
            ([, g]) => (g as any).path === resolvedPath
          );
          resolvedName = matchedEntry ? matchedEntry[0] : path.basename(resolvedPath);
        } else {
          const activePath = getActiveGraphPath(config);
          if (!activePath) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "Error: No active KG and no path specified.",
                },
              ],
              isError: true,
            };
          }
          resolvedPath = activePath;
          resolvedName = config.active!;
        }

        if (!fs.existsSync(resolvedPath)) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: KG path does not exist: ${resolvedPath}`,
              },
            ],
            isError: true,
          };
        }

        const result = rebuildIndex(resolvedPath, resolvedName);

        // Update config to mark FTS5 as enabled, remove declined flag
        if (config.active && config.graphs[config.active]) {
          const graph = config.graphs[config.active] as unknown as Record<string, unknown>;
          graph.fts5 = true;
          delete graph.fts5_declined;
          writeConfig(config);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error rebuilding FTS5 index: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
