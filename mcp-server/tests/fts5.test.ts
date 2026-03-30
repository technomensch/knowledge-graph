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
  getFTS5DbPath,
  resolveContentRoot,
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
    const first = rebuildIndex(kgRoot, "rebuild-skip");
    expect(first.indexed).toBe(3);
    expect(first.skipped).toBe(0);

    // Rebuild without changes
    const second = rebuildIndex(kgRoot, "rebuild-skip");
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
    rebuildIndex(kgRoot, "rebuild-mod");

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

    const second = rebuildIndex(kgRoot, "rebuild-mod");
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
    rebuildIndex(kgRoot, "rebuild-del");

    // Delete one file
    fs.unlinkSync(path.join(kgRoot, "knowledge", "c.md"));

    const second = rebuildIndex(kgRoot, "rebuild-del");
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
    rebuildIndex(kgRoot, "search-shape");

    const dbPath = getFTS5DbPath("search-shape");
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
    rebuildIndex(kgRoot, "search-empty");

    const dbPath = getFTS5DbPath("search-empty");

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

// ---------------------------------------------------------------------------
// TC-001: DB is created at ~/.claude/kg-fts5/{name}.db on first rebuild
// ---------------------------------------------------------------------------

describe("getFTS5DbPath", () => {
  test("TC-001: DB created at ~/.claude/kg-fts5/{name}.db on first rebuild", () => {
    const kgRoot = makeTempDir("tc-001-db-path");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);

    writeMd(path.join(kgRoot, "knowledge"), "test.md", "# Test\nContent");

    // Rebuild should use getFTS5DbPath internally
    const result = rebuildIndex(kgRoot, "test-kg-001");

    // Verify DB path in result
    expect(result.db_path).toContain(".claude");
    expect(result.db_path).toContain("kg-fts5");
    expect(result.db_path).toContain("test-kg-001.db");

    // Verify file actually exists
    expect(fs.existsSync(result.db_path)).toBe(true);

    // Verify it's in the home directory, not in the project
    const homeDir = os.homedir();
    expect(result.db_path).toContain(homeDir);
  });

  test("getFTS5DbPath creates ~/.claude/kg-fts5 directory if missing", () => {
    const dbPath = getFTS5DbPath("test-kg-dir-creation");
    const dirPath = path.dirname(dbPath);

    expect(fs.existsSync(dirPath)).toBe(true);
    expect(dirPath).toContain("kg-fts5");
    expect(fs.statSync(dirPath).isDirectory()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-002: Content root auto-detection finds docs/ when docs/lessons-learned/ exists
// ---------------------------------------------------------------------------

describe("resolveContentRoot", () => {
  test("TC-002: Auto-detects docs/ subdir when docs/lessons-learned/ exists", () => {
    const kgRoot = makeTempDir("tc-002-content-root");
    tempDirs.push(kgRoot);

    // Create v0.2+ layout: docs/lessons-learned exists
    fs.mkdirSync(path.join(kgRoot, "docs", "lessons-learned"), {
      recursive: true,
    });

    const resolved = resolveContentRoot(kgRoot);

    // Should return docs/ not kgRoot
    expect(resolved).toBe(path.join(kgRoot, "docs"));
    expect(resolved).not.toBe(kgRoot);
  });

  test("TC-003: Falls back to root when no docs/lessons-learned/ subdir", () => {
    const kgRoot = makeTempDir("tc-003-content-root-fallback");
    tempDirs.push(kgRoot);

    // Create minimal structure (no docs/lessons-learned)
    fs.mkdirSync(path.join(kgRoot, "knowledge"), { recursive: true });

    const resolved = resolveContentRoot(kgRoot);

    // Should fall back to kgRoot
    expect(resolved).toBe(kgRoot);
  });

  test("resolveContentRoot uses correct path when docs/ exists but no lessons-learned", () => {
    const kgRoot = makeTempDir("tc-003b-docs-exists-only");
    tempDirs.push(kgRoot);

    // Create docs/ but not docs/lessons-learned/
    fs.mkdirSync(path.join(kgRoot, "docs"), { recursive: true });

    const resolved = resolveContentRoot(kgRoot);

    // Should still fall back to kgRoot
    expect(resolved).toBe(kgRoot);
  });
});

// ---------------------------------------------------------------------------
// TC-007: Multiple KGs get separate DB files (no path conflicts)
// ---------------------------------------------------------------------------

describe("Multiple KGs with separate DBs", () => {
  test("TC-007: Multiple KGs get separate DB files with no conflicts", () => {
    const projRoot1 = makeTempDir("tc-007-kg1");
    const projRoot2 = makeTempDir("tc-007-kg2");
    tempDirs.push(projRoot1, projRoot2);

    scaffoldKg(projRoot1);
    scaffoldKg(projRoot2);

    writeMd(
      path.join(projRoot1, "knowledge"),
      "doc1.md",
      "# Doc 1\nContent for KG1"
    );
    writeMd(
      path.join(projRoot2, "knowledge"),
      "doc2.md",
      "# Doc 2\nContent for KG2"
    );

    const result1 = rebuildIndex(projRoot1, "kg-instance-1");
    const result2 = rebuildIndex(projRoot2, "kg-instance-2");

    // Both should have DB at ~/.claude/kg-fts5/
    expect(result1.db_path).toContain("kg-fts5");
    expect(result2.db_path).toContain("kg-fts5");

    // But with different filenames
    expect(result1.db_path).not.toBe(result2.db_path);
    expect(result1.db_path).toContain("kg-instance-1.db");
    expect(result2.db_path).toContain("kg-instance-2.db");

    // Both should exist and be valid databases
    expect(fs.existsSync(result1.db_path)).toBe(true);
    expect(fs.existsSync(result2.db_path)).toBe(true);

    // Verify they're actually separate by opening and checking content
    const db1 = new Database(result1.db_path);
    const db2 = new Database(result2.db_path);

    try {
      const rows1 = db1.all(
        "SELECT COUNT(*) as cnt FROM kg_entries"
      ) as Array<{ cnt: number }>;
      const rows2 = db2.all(
        "SELECT COUNT(*) as cnt FROM kg_entries"
      ) as Array<{ cnt: number }>;

      expect(rows1[0].cnt).toBeGreaterThan(0);
      expect(rows2[0].cnt).toBeGreaterThan(0);
    } finally {
      db1.close();
      db2.close();
    }
  });
});

// ---------------------------------------------------------------------------
// TC-008: DB file is not inside project directory (survives git clean)
// ---------------------------------------------------------------------------

describe("DB file location independence", () => {
  test("TC-008: DB file is not inside the project directory", () => {
    const kgRoot = makeTempDir("tc-008-db-outside");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);

    writeMd(path.join(kgRoot, "knowledge"), "test.md", "# Test\nContent");

    const result = rebuildIndex(kgRoot, "tc-008-kg");

    // DB should be in user's home, not in project
    expect(result.db_path).not.toContain(kgRoot);
    expect(result.db_path).toContain(os.homedir());
    expect(result.db_path).toContain(".claude/kg-fts5");

    // Verify by checking path structure
    const dbDir = path.dirname(result.db_path);
    const projectIsNotAncestor = !result.db_path.startsWith(kgRoot);
    expect(projectIsNotAncestor).toBe(true);
  });

  test("TC-008b: Simulated git clean does not remove user DB", () => {
    const kgRoot = makeTempDir("tc-008b-git-clean-sim");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);

    writeMd(path.join(kgRoot, "knowledge"), "test.md", "# Test\nContent");

    const result = rebuildIndex(kgRoot, "tc-008b-kg");
    const dbPath = result.db_path;

    // Verify DB exists
    expect(fs.existsSync(dbPath)).toBe(true);

    // Simulate "git clean -fdx" by removing entire project directory
    fs.rmSync(kgRoot, { recursive: true, force: true });

    // DB should still exist (not in project)
    expect(fs.existsSync(dbPath)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TC-009: .gitignore does not contain .fts5.db pattern at project root
// ---------------------------------------------------------------------------

describe(".gitignore patterns", () => {
  test("TC-009: .gitignore does not contain .fts5.db pattern (DB lives in ~/.claude/kg-fts5/)", () => {
    const gitignorePath = path.join(
      process.cwd(),
      "..",
      ".gitignore"
    );

    const content = fs.readFileSync(gitignorePath, "utf-8");

    // DB now lives at ~/.claude/kg-fts5/{name}.db — outside the project.
    // No gitignore entry is needed or correct.
    expect(content).not.toContain(".fts5.db");
    expect(content).not.toContain("kg-fts5");
  });
});
