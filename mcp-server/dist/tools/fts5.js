"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FTS5_DB_FILENAME = void 0;
exports.getDbPath = getDbPath;
exports.sanitizeFts5Query = sanitizeFts5Query;
exports.initDb = initDb;
exports.indexFile = indexFile;
exports.rebuildIndex = rebuildIndex;
exports.searchFts5 = searchFts5;
exports.registerFts5Tool = registerFts5Tool;
const zod_1 = require("zod");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const utils_js_1 = require("../utils.js");
// Graceful fallback: node-sqlite3-wasm may be absent on first run after upgrade.
// The SessionStart hook will install it and prompt users to restart Claude Code.
// Until then, FTS5 functions return empty results and kg_search falls back to linear scan.
let Database;
let fts5Available = false;
try {
    Database = require("node-sqlite3-wasm").Database;
    fts5Available = true;
}
catch {
    // node-sqlite3-wasm not installed yet — FTS5 disabled until next restart
}
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
exports.FTS5_DB_FILENAME = ".fts5.db";
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Returns the absolute path to the FTS5 database for a given KG root.
 */
function getDbPath(kgPath) {
    return path.join(kgPath, exports.FTS5_DB_FILENAME);
}
/**
 * Strips FTS5 operator characters from a raw query string so it can be used
 * safely in a MATCH clause. Returns '""' for empty / whitespace-only input.
 */
function sanitizeFts5Query(raw) {
    let sanitized = raw
        .replace(/[":(){}[\]^~*+\\]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!sanitized)
        return '""';
    return sanitized;
}
// ---------------------------------------------------------------------------
// Schema initialisation
// ---------------------------------------------------------------------------
/**
 * Creates the FTS5 virtual table and the index-meta tracking table if they do
 * not already exist.
 */
function initDb(db) {
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
/**
 * Parses a single markdown file into sections and inserts FTS5 rows.
 *
 * Returns the number of rows inserted.
 */
function indexFile(db, filePath, kgPath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const relativePath = path.relative(kgPath, filePath);
    const lines = content.split("\n");
    // Remove old rows for this file
    db.run("DELETE FROM kg_entries WHERE file_path = ?", [filePath]);
    // Parse YAML frontmatter
    let frontmatterTitle = null;
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
    const sections = [];
    let currentSection = null;
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
                heading: h1Match ? h1Match[1] : h2Match[1],
                matchType: h1Match ? "title" : "heading",
                lineOffset: i + 1, // 1-based
                lines: [],
            };
        }
        else {
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
    const insertStmt = db.prepare(`INSERT INTO kg_entries (file_path, relative_path, section_heading, content, match_type, line_offset)
     VALUES (?, ?, ?, ?, ?, ?)`);
    let rowCount = 0;
    for (const section of sections) {
        const sectionContent = section.lines.join("\n").trim();
        // Skip empty sections (headings with no body) unless it is a title
        if (!sectionContent && section.matchType !== "title")
            continue;
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
    db.run(`INSERT OR REPLACE INTO kg_index_meta (file_path, mtime, indexed_at, row_count)
     VALUES (?, ?, ?, ?)`, [filePath, mtime, Date.now(), rowCount]);
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
function rebuildIndex(kgPath) {
    if (!fts5Available) {
        throw new Error("FTS5 search engine not available. Restart Claude Code to complete the upgrade installation.");
    }
    const start = Date.now();
    const dbPath = getDbPath(kgPath);
    const db = new Database(dbPath);
    try {
        initDb(db);
        // Collect all .md files from target subdirectories
        const searchDirs = ["knowledge", "lessons-learned", "decisions", "sessions"];
        const allFiles = [];
        for (const dir of searchDirs) {
            const dirPath = path.join(kgPath, dir);
            allFiles.push(...(0, utils_js_1.walkDir)(dirPath, ".md"));
        }
        let indexed = 0;
        let skipped = 0;
        // Index new / changed files
        for (const filePath of allFiles) {
            const currentMtime = fs.statSync(filePath).mtimeMs;
            // Check existing meta
            const meta = db.get("SELECT mtime FROM kg_index_meta WHERE file_path = ?", [filePath]);
            if (meta && meta.mtime === currentMtime) {
                skipped++;
            }
            else {
                indexFile(db, filePath, kgPath);
                indexed++;
            }
        }
        // Clean up deleted files
        let removed = 0;
        const allMeta = db.all("SELECT file_path FROM kg_index_meta");
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
    }
    finally {
        db.close();
    }
}
// ---------------------------------------------------------------------------
// FTS5 search
// ---------------------------------------------------------------------------
/**
 * Searches the FTS5 index using BM25 ranking. Returns up to 50 results.
 */
function searchFts5(dbPath, query, kgPath) {
    if (!fts5Available) {
        return []; // Falls back to linear scan in search.ts; upgrade install pending restart
    }
    const sanitized = sanitizeFts5Query(query);
    const db = new Database(dbPath, { fileMustExist: true });
    try {
        const rows = db.all(`SELECT file_path, relative_path, section_heading, content, match_type,
              line_offset, bm25(kg_entries) as rank
       FROM kg_entries
       WHERE kg_entries MATCH ?
       ORDER BY rank
       LIMIT 50`, [sanitized]);
        return rows.map((row) => ({
            file: row.file_path,
            relativePath: row.relative_path,
            line: row.line_offset || 0,
            context: (row.content || "").slice(0, 200),
            matchType: row.match_type,
        }));
    }
    finally {
        db.close();
    }
}
// ---------------------------------------------------------------------------
// MCP tool registration
// ---------------------------------------------------------------------------
/**
 * Registers the `kg_fts5_rebuild` MCP tool.
 */
function registerFts5Tool(server) {
    server.tool("kg_fts5_rebuild", "Build or refresh FTS5 full-text search index for the active knowledge graph. " +
        "Indexes all .md files in knowledge/, lessons-learned/, decisions/, sessions/. " +
        "Incremental: only re-indexes changed files. Run after sync-all or any time " +
        "search results seem stale.", {
        kgPath: zod_1.z
            .string()
            .optional()
            .describe("Override KG path (default: active KG)"),
    }, async ({ kgPath }) => {
        if (!fts5Available) {
            return {
                content: [{
                        type: "text",
                        text: "Search index is not available yet. The required package was installed in the background — please restart Claude Code and try again.",
                    }],
                isError: true,
            };
        }
        try {
            const config = (0, utils_js_1.readConfig)();
            let resolvedPath;
            if (kgPath) {
                resolvedPath = kgPath.replace(/^~/, os.homedir());
            }
            else {
                const activePath = (0, utils_js_1.getActiveGraphPath)(config);
                if (!activePath) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: "Error: No active KG and no path specified.",
                            },
                        ],
                        isError: true,
                    };
                }
                resolvedPath = activePath;
            }
            if (!fs.existsSync(resolvedPath)) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error: KG path does not exist: ${resolvedPath}`,
                        },
                    ],
                    isError: true,
                };
            }
            const result = rebuildIndex(resolvedPath);
            // Update config to mark FTS5 as enabled, remove declined flag
            if (config.active && config.graphs[config.active]) {
                const graph = config.graphs[config.active];
                graph.fts5 = true;
                delete graph.fts5_declined;
                (0, utils_js_1.writeConfig)(config);
            }
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                content: [
                    {
                        type: "text",
                        text: `Error rebuilding FTS5 index: ${message}`,
                    },
                ],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=fts5.js.map