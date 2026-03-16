import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Database } from "node-sqlite3-wasm";
import {
  sanitizeFts5Query,
  initDb,
  indexFile,
  rebuildIndex,
  searchFts5,
  getDbPath,
  FTS5_DB_FILENAME,
} from "../src/tools/fts5.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a unique temp directory for a test. */
function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `fts5-test-${prefix}-`));
}

/** Creates the standard KG subdirectory structure. */
function scaffoldKg(root: string): void {
  for (const dir of ["knowledge", "lessons-learned", "decisions", "sessions"]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
}

/** Writes a markdown file and returns its path. */
function writeMd(dir: string, name: string, content: string): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

// ---------------------------------------------------------------------------
// Cleanup tracking
// ---------------------------------------------------------------------------

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
  tempDirs.length = 0;
});

// ---------------------------------------------------------------------------
// 8-1: sanitizeFts5Query
// ---------------------------------------------------------------------------

describe("sanitizeFts5Query", () => {
  test("strips FTS5 operator characters", () => {
    // ++ replaced with spaces, then whitespace collapsed
    expect(sanitizeFts5Query("C++ patterns")).toBe("C patterns");
    // colon replaced with space, then collapsed
    expect(sanitizeFts5Query("fix: auth bug")).toBe("fix auth bug");
  });

  test("strips quotes", () => {
    // quotes replaced with spaces, then collapsed + trimmed
    expect(sanitizeFts5Query('"exact match"')).toBe("exact match");
  });

  test('returns \'""\'for empty / whitespace-only input', () => {
    expect(sanitizeFts5Query("")).toBe('""');
    expect(sanitizeFts5Query("   ")).toBe('""');
  });
});

// ---------------------------------------------------------------------------
// 8-2: indexFile section parsing
// ---------------------------------------------------------------------------

describe("indexFile", () => {
  test("parses frontmatter title, headings, and body into rows", () => {
    const tmpDir = makeTempDir("indexfile");
    tempDirs.push(tmpDir);

    const mdContent = [
      "---",
      "title: Test Document",
      "---",
      "",
      "# Main Heading",
      "",
      "Some body text under the main heading.",
      "",
      "## Section A",
      "",
      "Content in section A.",
      "",
      "## Section B",
      "",
      "Content in section B.",
    ].join("\n");

    const filePath = writeMd(tmpDir, "test.md", mdContent);
    const dbPath = path.join(tmpDir, "test.db");
    const db = new Database(dbPath);

    try {
      initDb(db);
      const rowCount = indexFile(db, filePath, tmpDir);

      // Expect rows: title section (frontmatter), Main Heading, Section A, Section B
      expect(rowCount).toBe(4);

      const rows = db.all(
        "SELECT section_heading, match_type, line_offset FROM kg_entries ORDER BY line_offset"
      ) as Array<{ section_heading: string; match_type: string; line_offset: number }>;

      expect(rows).toHaveLength(4);

      // Title from frontmatter
      expect(rows[0].section_heading).toBe("Test Document");
      expect(rows[0].match_type).toBe("title");
      expect(rows[0].line_offset).toBe(1);

      // # Main Heading (line 5 in 1-based)
      expect(rows[1].section_heading).toBe("Main Heading");
      expect(rows[1].match_type).toBe("title");
      expect(rows[1].line_offset).toBe(5);

      // ## Section A (line 9)
      expect(rows[2].section_heading).toBe("Section A");
      expect(rows[2].match_type).toBe("heading");
      expect(rows[2].line_offset).toBe(9);

      // ## Section B (line 13)
      expect(rows[3].section_heading).toBe("Section B");
      expect(rows[3].match_type).toBe("heading");
      expect(rows[3].line_offset).toBe(13);
    } finally {
      db.close();
    }
  });
});

// ---------------------------------------------------------------------------
// 8-3: rebuildIndex incremental behavior
// ---------------------------------------------------------------------------

describe("rebuildIndex", () => {
  test("skips unchanged files", () => {
    const kgRoot = makeTempDir("rebuild-skip");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);

    // Create 3 files
    writeMd(path.join(kgRoot, "knowledge"), "a.md", "# A\nContent A");
    writeMd(path.join(kgRoot, "knowledge"), "b.md", "# B\nContent B");
    writeMd(path.join(kgRoot, "knowledge"), "c.md", "# C\nContent C");

    // First build
    const first = rebuildIndex(kgRoot);
    expect(first.indexed).toBe(3);
    expect(first.skipped).toBe(0);

    // Rebuild without changes
    const second = rebuildIndex(kgRoot);
    expect(second.indexed).toBe(0);
    expect(second.skipped).toBe(3);
  });

  test("re-indexes modified files", () => {
    const kgRoot = makeTempDir("rebuild-mod");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);

    writeMd(path.join(kgRoot, "knowledge"), "a.md", "# A\nContent A");
    writeMd(path.join(kgRoot, "knowledge"), "b.md", "# B\nContent B");
    writeMd(path.join(kgRoot, "knowledge"), "c.md", "# C\nContent C");

    // First build
    rebuildIndex(kgRoot);

    // Modify one file — need to change mtime. Write new content and ensure mtime differs.
    const fileB = path.join(kgRoot, "knowledge", "b.md");
    // Ensure mtime changes: wait a tick then rewrite
    const oldMtime = fs.statSync(fileB).mtimeMs;
    // Force mtime change by writing new content
    fs.writeFileSync(fileB, "# B\nUpdated content B", "utf-8");
    // If mtime didn't change (rare, same millisecond), touch it forward
    if (fs.statSync(fileB).mtimeMs === oldMtime) {
      const future = new Date(Date.now() + 1000);
      fs.utimesSync(fileB, future, future);
    }

    const second = rebuildIndex(kgRoot);
    expect(second.indexed).toBe(1);
    expect(second.skipped).toBe(2);
  });

  test("removes deleted files", () => {
    const kgRoot = makeTempDir("rebuild-del");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);

    writeMd(path.join(kgRoot, "knowledge"), "a.md", "# A\nContent A");
    writeMd(path.join(kgRoot, "knowledge"), "b.md", "# B\nContent B");
    writeMd(path.join(kgRoot, "knowledge"), "c.md", "# C\nContent C");

    // First build
    rebuildIndex(kgRoot);

    // Delete one file
    fs.unlinkSync(path.join(kgRoot, "knowledge", "c.md"));

    const second = rebuildIndex(kgRoot);
    expect(second.indexed).toBe(0);
    expect(second.skipped).toBe(2);
    expect(second.removed).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 8-4: searchFts5 result shape
// ---------------------------------------------------------------------------

describe("searchFts5", () => {
  test("returns SearchResult[] with correct shape", () => {
    const kgRoot = makeTempDir("search-shape");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);

    writeMd(
      path.join(kgRoot, "knowledge"),
      "auth.md",
      "# Authentication\n\nOAuth2 token refresh implementation details."
    );

    // Build index
    rebuildIndex(kgRoot);

    const dbPath = getDbPath(kgRoot);
    const results = searchFts5(dbPath, "authentication", kgRoot);

    expect(results.length).toBeGreaterThan(0);

    const first = results[0];
    expect(first).toHaveProperty("file");
    expect(first).toHaveProperty("relativePath");
    expect(first).toHaveProperty("line");
    expect(first).toHaveProperty("context");
    expect(first).toHaveProperty("matchType");

    // Validate types
    expect(typeof first.file).toBe("string");
    expect(typeof first.relativePath).toBe("string");
    expect(typeof first.line).toBe("number");
    expect(typeof first.context).toBe("string");
    expect(["title", "heading", "body"]).toContain(first.matchType);

    // line should not be 0 for a real match
    expect(first.line).toBeGreaterThan(0);
  });

  test("handles empty query gracefully (no crash)", () => {
    const kgRoot = makeTempDir("search-empty");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);

    writeMd(path.join(kgRoot, "knowledge"), "test.md", "# Test\nSome content.");
    rebuildIndex(kgRoot);

    const dbPath = getDbPath(kgRoot);

    // Empty query — sanitizeFts5Query returns '""' which FTS5 handles
    // Should not throw
    expect(() => searchFts5(dbPath, "", kgRoot)).not.toThrow();
    expect(() => searchFts5(dbPath, "   ", kgRoot)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 8-5: corrupt DB fallback
// ---------------------------------------------------------------------------

describe("corrupt database", () => {
  test("searchFts5 throws on corrupt .fts5.db", () => {
    const kgRoot = makeTempDir("corrupt-db");
    tempDirs.push(kgRoot);

    const dbPath = getDbPath(kgRoot);
    // Write garbage bytes
    fs.writeFileSync(dbPath, Buffer.from("this is not a sqlite database!!!"));

    // searchFts5 should throw (search.ts would catch this and fall back)
    expect(() => searchFts5(dbPath, "test query", kgRoot)).toThrow();
  });
});
