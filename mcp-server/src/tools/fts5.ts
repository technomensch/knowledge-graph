import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { readConfig, writeConfig, walkDir, getIndexDir } from "../utils.js";
import { resolveGraph, resolvePersonalGraph, PersonalScopeSession, confirmPersonalScopeAccess, isAncestorOrEqual } from "../resolution.js";
import { resolveInteractionMode, STUB_ASK_TIMEOUT_MS, stubAsk } from "../interaction.js";
import { resolveEffectiveCwd } from "../platform-cwd.js";

// Graceful fallback: node-sqlite3-wasm is bundled in dist/node_modules/ for marketplace installs
// (v0.5.10.3+). This try/catch covers edge cases: partial clone, corrupted dist, or dev runs
// via bare tsc. FTS5 functions return empty results and kg_search falls back to linear scan.
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
 * Makes a KG name safe to embed in a filename. Anything outside [A-Za-z0-9_-]
 * (path separators, `..`, spaces, unicode) collapses to `-`, so a KG name can
 * never escape the projects/ directory or shadow a sibling's file. Falls back
 * to "kg" for a name that sanitizes away to nothing.
 */
export function sanitizeKgNameForFilename(kgName: string): string {
  const cleaned = (kgName || "")
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "kg";
}

/**
 * Short, stable digest of a KG's *normalized* on-disk location (issue-55).
 *
 * The KG name alone is not unique — two unrelated repos can both call their
 * graph "knowledge", and before this hash existed they silently shared (and
 * shadowed) one another's FTS5 index file. Hashing `normalizeForFts5Scope(kgPath)`
 * (not the raw string) means `~/foo`, `/Users/me/foo`, and a symlink to either
 * all land on the same digest regardless of the caller's cwd.
 */
export function kgPathHash(kgPath: string): string {
  return crypto
    .createHash("sha256")
    .update(normalizeForFts5Scope(kgPath))
    .digest("hex")
    .slice(0, 12);
}

/**
 * PURE path computation — never touches the filesystem beyond the realpath
 * lookup inside `normalizeForFts5Scope`. `kg_fts5_status` publishes a
 * "read-only ... never creates directories" contract and therefore MUST call
 * this, not `resolveDbPath` below.
 *
 * Routes to `<indexDir>/personal.db` for the personal graph, or
 * `<indexDir>/projects/<sanitizedName>-<pathHash>.db` for everything else.
 */
export function computeDbPath(kgName: string, kgType: string, kgPath: string): string {
  const indexDir = getIndexDir();
  if (kgType === "personal") return path.join(indexDir, "personal.db");
  if (kgType !== "project-local" && kgType !== "project" && kgType !== "custom") {
    // Unknown type — default to project-local with a console warning
    console.warn(`computeDbPath: unknown kgType "${kgType}", defaulting to project-local`);
  }
  const filename = `${sanitizeKgNameForFilename(kgName)}-${kgPathHash(kgPath)}.db`;
  return path.join(indexDir, "projects", filename);
}

export function getPersonalDbPath(): string {
  const dir = getIndexDir();
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "personal.db");
}

/**
 * Project-local DB path, creating the containing directory. issue-55: keyed by
 * the KG's realpath as well as its name, so same-named graphs in different
 * repos no longer collide on one file.
 */
export function getProjectDbPath(kgName: string, kgPath: string): string {
  const dbPath = computeDbPath(kgName, "project-local", kgPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  return dbPath;
}

/**
 * Central dispatcher: `computeDbPath` plus directory creation. Use this from
 * any write path (rebuild/capture); use `computeDbPath` from read-only paths.
 * Note: kgName is ignored when kgType is "personal" (personal DB is a fixed singleton path).
 */
export function resolveDbPath(kgName: string, kgType: string, kgPath: string): string {
  const dbPath = computeDbPath(kgName, kgType, kgPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  return dbPath;
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
 * @deprecated Use resolveDbPath(kgName, kgType, kgPath) instead — stores DB in user-level cache.
 */
export function getDbPath(kgPath: string): string {
  return path.join(kgPath, FTS5_DB_FILENAME);
}

/**
 * Strips FTS5 operator characters from a raw query string so it can be used
 * safely in a MATCH clause. Returns '""' for empty / whitespace-only input.
 */
// Mirrors compare.ts's normalizeForCompare / sanitization.ts's normalizeForScan: a raw path
// string can't be gated the same way a scope enum can -- a personal-KG path could be passed
// under any of dozens of possible string values, so containment is checked against the
// registry after normalizing, not against the literal string.
function normalizeForFts5Scope(p: string): string {
  const expanded = p.replace(/^~/, os.homedir());
  try {
    return fs.realpathSync(expanded);
  } catch {
    return path.resolve(expanded);
  }
}

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
  // WAL mode: safe for concurrent readers during rebuild
  db.run("PRAGMA journal_mode=WAL;");
  // Schema version stamp for future migration detection
  db.run("PRAGMA user_version = 1;");

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
export function rebuildIndex(kgPath: string, kgName: string, kgType = "project-local"): RebuildResult {
  if (!fts5Available) {
    throw new Error(
      "FTS5 search engine not available. Restart Claude Code to complete the upgrade installation."
    );
  }
  const start = Date.now();
  const dbPath = resolveDbPath(kgName, kgType, kgPath);
  const db = new Database(dbPath);

  try {
    initDb(db);

    // Collect all .md files from target subdirectories
    const contentDirs = ["lessons-learned", "decisions", "sessions", "chat-history", "issues", "enhancements"];
    const allFiles: string[] = [];

    for (const dir of contentDirs) {
      const dirPath = path.join(kgPath, dir);
      allFiles.push(...walkDir(dirPath, ".md"));
    }
    allFiles.push(...walkDir(path.join(kgPath, "concepts"), ".md"));

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
 * Registers the `kg_fts5_status` MCP tool.
 * Returns { exists: boolean, db_path: string, kgType: string } — read-only probe,
 * never creates directories.
 */
export function registerFts5StatusTool(server: McpServer, personalScopeSession: PersonalScopeSession): void {
  server.tool(
    "kg_fts5_status",
    "Check whether the FTS5 search index exists for a knowledge graph (default: resolved " +
      "from your current directory). Returns { exists, db_path, kgType }. Read-only — does " +
      "not create or modify the index.",
    {
      scope: z
        .enum(["project", "user"])
        .optional()
        .describe("project (default, cwd-resolved) or user (the personal knowledge graph)"),
      confirmPersonalScope: z
        .boolean()
        .optional()
        .describe(
          "Confirms this repo may read the personal knowledge graph. Required once per " +
            "process before a scope:\"user\" read is honored for a repo not yet confirmed."
        ),
    },
    async ({ scope, confirmPersonalScope }, extra) =>
      handleFts5Status({ scope, confirmPersonalScope }, personalScopeSession, extra?._meta as Record<string, unknown> | undefined)
  );
}

export interface HandleFts5StatusParams {
  scope?: "project" | "user";
  confirmPersonalScope?: boolean;
}

export interface HandleFts5StatusResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}

export async function handleFts5Status(
  params: HandleFts5StatusParams,
  personalScopeSession: PersonalScopeSession = new PersonalScopeSession(),
  toolCallMeta?: Record<string, unknown>
): Promise<HandleFts5StatusResult> {
  try {
    const config = readConfig();
    const cwd = resolveEffectiveCwd({ processCwd: process.cwd(), toolCallMeta });
    const target = params.scope === "user" ? resolvePersonalGraph(config) : (() => {
      const resolution = resolveGraph(config, cwd);
      return resolution.kind === "resolved"
        ? { name: resolution.name, graph: resolution.graph }
        : { error: "No knowledge graph resolved from your current directory." };
    })();

    if ("error" in target) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ exists: false, db_path: null, kgType: null, error: target.error }),
        }],
      };
    }

    // ADR-067 Task 6.4 (spec §11): scope:"user" reaches the personal graph
    // here the same way it does in search.ts/capture.ts/kg_config_add_category
    // -- same gate, closing the interim gap left open by Task 1.9.
    if (params.scope === "user") {
      const mode = resolveInteractionMode({}).mode;
      const confirmed = await confirmPersonalScopeAccess(personalScopeSession, cwd, {
        confirmPersonalScope: params.confirmPersonalScope,
        mode,
        timeoutMs: STUB_ASK_TIMEOUT_MS,
        ask: stubAsk,
      });
      if (!("confirmed" in confirmed)) {
        return { content: [{ type: "text" as const, text: JSON.stringify(confirmed) }], isError: true };
      }
    }

    const kgType = target.graph.type ?? "project-local";
    // issue-55: this used to reconstruct the path inline, which (a) drifted from
    // what kg_search/kg_fts5_rebuild actually use the moment the format changed
    // and (b) passed target.graph.path's raw, unexpanded "~/..." string nowhere,
    // so a `~`-registered graph reported a path that depended on process.cwd().
    // computeDbPath is the single shared source of truth AND is pure — this tool's
    // published contract is "read-only ... never creates directories", so it must
    // not call resolveDbPath(), which mkdirSync's.
    const dbPath = computeDbPath(target.name, kgType, target.graph.path);
    const exists = fs.existsSync(dbPath);
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ exists, db_path: dbPath, kgType }),
      }],
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{
        type: "text" as const,
        text: `Error checking FTS5 status: ${message}`,
      }],
      isError: true,
    };
  }
}

/**
 * Registers the `kg_fts5_rebuild` MCP tool.
 */
export function registerFts5Tool(server: McpServer, personalScopeSession: PersonalScopeSession): void {
  server.tool(
    "kg_fts5_rebuild",
    "Build or refresh FTS5 full-text search index for a knowledge graph (default: resolved " +
      "from your current directory). Indexes all .md files in knowledge/, lessons-learned/, " +
      "decisions/, sessions/. Incremental: only re-indexes changed files. Run after " +
      "sync-all or any time search results seem stale.",
    {
      kgPath: z
        .string()
        .optional()
        .describe("Override KG path (default: cwd-resolved KG)"),
      scope: z
        .enum(["project", "user"])
        .optional()
        .describe("project (default, cwd-resolved) or user (the personal knowledge graph) — ignored when kgPath is given"),
      confirmPersonalScope: z
        .boolean()
        .optional()
        .describe(
          "Confirms this repo may write to the personal knowledge graph. Required once per " +
            "process before a scope:\"user\" rebuild is honored for a repo not yet confirmed."
        ),
    },
    async ({ kgPath, scope, confirmPersonalScope }, extra) =>
      handleFts5Rebuild({ kgPath, scope, confirmPersonalScope }, personalScopeSession, extra?._meta as Record<string, unknown> | undefined)
  );
}

export interface HandleFts5RebuildParams {
  kgPath?: string;
  scope?: "project" | "user";
  confirmPersonalScope?: boolean;
}

export interface HandleFts5RebuildResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: true;
}

export async function handleFts5Rebuild(
  params: HandleFts5RebuildParams,
  personalScopeSession: PersonalScopeSession = new PersonalScopeSession(),
  toolCallMeta?: Record<string, unknown>
): Promise<HandleFts5RebuildResult> {
  const cwd = resolveEffectiveCwd({ processCwd: process.cwd(), toolCallMeta });
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

    if (params.kgPath) {
      resolvedPath = params.kgPath.replace(/^~/, os.homedir());
      // Find the matching KG name from config, or derive from path basename
      const matchedEntry = Object.entries(config.graphs || {}).find(
        ([, g]) => (g as any).path === resolvedPath
      );
      resolvedName = matchedEntry ? matchedEntry[0] : path.basename(resolvedPath);

      // ADR-067 sweep: a raw kgPath bypasses the scope:"user" gate below entirely (this
      // branch returns before that branch is ever reached), so an unconfirmed kgPath
      // pointing at -- or nested inside -- the registered personal graph must be gated
      // independently, mirroring compare.ts's `a`/`b` and sanitization.ts's `kgPath` fix.
      // Without this, `kgPath` was a complete end-run around the scope:"user" gate: any
      // literal path string reached rebuildIndex() -- a WRITE to that graph's FTS5 index
      // -- with zero confirmation.
      const personalGraphPaths = Object.values(config.graphs || {})
        .filter((g) => (g as any).type === "personal" && (g as any).status !== "deleted")
        .map((g) => normalizeForFts5Scope((g as any).path));
      const kgPathTouchesPersonal = personalGraphPaths.some((p) =>
        isAncestorOrEqual(p, normalizeForFts5Scope(resolvedPath))
      );
      if (kgPathTouchesPersonal) {
        const mode = resolveInteractionMode({}).mode;
        const confirmed = await confirmPersonalScopeAccess(personalScopeSession, cwd, {
          confirmPersonalScope: params.confirmPersonalScope,
          mode,
          timeoutMs: STUB_ASK_TIMEOUT_MS,
          ask: stubAsk,
        });
        if (!("confirmed" in confirmed)) {
          return { content: [{ type: "text" as const, text: JSON.stringify(confirmed) }], isError: true };
        }
      }
    } else {
      const target = params.scope === "user" ? resolvePersonalGraph(config) : (() => {
        const resolution = resolveGraph(config, cwd);
        return resolution.kind === "resolved"
          ? { name: resolution.name, graph: resolution.graph }
          : { error: "No knowledge graph resolved from your current directory and no path specified." };
      })();
      if ("error" in target) {
        return { content: [{ type: "text" as const, text: `Error: ${target.error}` }], isError: true };
      }
      // ADR-067 Task 6.4 (spec §11): scope:"user" (no kgPath override) reaches
      // the personal graph -- same gate as kg_fts5_status/search.ts/capture.ts.
      if (params.scope === "user") {
        const mode = resolveInteractionMode({}).mode;
        const confirmed = await confirmPersonalScopeAccess(personalScopeSession, cwd, {
          confirmPersonalScope: params.confirmPersonalScope,
          mode,
          timeoutMs: STUB_ASK_TIMEOUT_MS,
          ask: stubAsk,
        });
        if (!("confirmed" in confirmed)) {
          return { content: [{ type: "text" as const, text: JSON.stringify(confirmed) }], isError: true };
        }
      }
      resolvedPath = target.graph.path.replace(/^~/, os.homedir());
      resolvedName = target.name;
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

    // Determine kgType for the resolved graph
    const graphEntry = config.graphs[resolvedName];
    const resolvedType = graphEntry?.type ?? "project-local";

    const result = rebuildIndex(resolvedPath, resolvedName, resolvedType);

    // Update config to mark FTS5 as enabled, remove declined flag -- on the
    // graph actually rebuilt (resolvedName), not config.active (ADR-067
    // Task 1.9 -- the old code marked whichever graph happened to be
    // .active, even when an explicit kgPath/scope targeted a different one).
    if (config.graphs[resolvedName]) {
      const graph = config.graphs[resolvedName] as unknown as Record<string, unknown>;
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
