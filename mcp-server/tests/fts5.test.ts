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
  getPersonalDbPath,
  getProjectDbPath,
  resolveDbPath,
  computeDbPath,
  sanitizeKgNameForFilename,
  FTS5_DB_FILENAME,
} from "../src/tools/fts5.js";
import { getIndexDir } from "../src/utils.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a unique temp directory for a test. */
function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `fts5-test-${prefix}-`));
}

/** Creates the standard KG subdirectory structure. */
function scaffoldKg(root: string): void {
  for (const dir of ["lessons-learned", "decisions", "sessions"]) {
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
    writeMd(path.join(kgRoot, "lessons-learned"), "a.md", "# A\nContent A");
    writeMd(path.join(kgRoot, "lessons-learned"), "b.md", "# B\nContent B");
    writeMd(path.join(kgRoot, "lessons-learned"), "c.md", "# C\nContent C");

    // First build
    const first = rebuildIndex(kgRoot, "rebuild-skip");
    expect(first.indexed).toBe(3);
    expect(first.skipped).toBe(0);

    // Rebuild without changes
    const second = rebuildIndex(kgRoot, "rebuild-skip");
    expect(second.indexed).toBe(0);
    expect(second.skipped).toBe(3);
  });

  test("does not index files under a dead 'knowledge' dir (issue-35)", () => {
    const kgRoot = makeTempDir("rebuild-dead-knowledge");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    fs.mkdirSync(path.join(kgRoot, "knowledge"), { recursive: true });
    writeMd(path.join(kgRoot, "knowledge"), "orphan.md", "# Orphan\nShould not be indexed");

    const result = rebuildIndex(kgRoot, "rebuild-dead-knowledge");
    expect(result.indexed).toBe(0);
    expect(result.skipped).toBe(0);
  });

  test("indexes files under 'issues' and 'enhancements' (issue-34)", () => {
    const kgRoot = makeTempDir("rebuild-issues-enhancements");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);
    fs.mkdirSync(path.join(kgRoot, "issues"), { recursive: true });
    fs.mkdirSync(path.join(kgRoot, "enhancements"), { recursive: true });
    writeMd(path.join(kgRoot, "issues"), "issue-1.md", "# Issue 1\nSomething broke");
    writeMd(path.join(kgRoot, "enhancements"), "enh-1.md", "# Enhancement 1\nSomething to add");

    const result = rebuildIndex(kgRoot, "rebuild-issues-enhancements");
    expect(result.indexed).toBe(2);

    const dbPath = getProjectDbPath("rebuild-issues-enhancements", kgRoot);
    expect(searchFts5(dbPath, "broke", kgRoot).length).toBeGreaterThan(0);
    expect(searchFts5(dbPath, "Enhancement", kgRoot).length).toBeGreaterThan(0);
  });

  test("re-indexes modified files", () => {
    const kgRoot = makeTempDir("rebuild-mod");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);

    writeMd(path.join(kgRoot, "lessons-learned"), "a.md", "# A\nContent A");
    writeMd(path.join(kgRoot, "lessons-learned"), "b.md", "# B\nContent B");
    writeMd(path.join(kgRoot, "lessons-learned"), "c.md", "# C\nContent C");

    // First build
    rebuildIndex(kgRoot, "rebuild-mod");

    // Modify one file — need to change mtime. Write new content and ensure mtime differs.
    const fileB = path.join(kgRoot, "lessons-learned", "b.md");
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

    writeMd(path.join(kgRoot, "lessons-learned"), "a.md", "# A\nContent A");
    writeMd(path.join(kgRoot, "lessons-learned"), "b.md", "# B\nContent B");
    writeMd(path.join(kgRoot, "lessons-learned"), "c.md", "# C\nContent C");

    // First build
    rebuildIndex(kgRoot, "rebuild-del");

    // Delete one file
    fs.unlinkSync(path.join(kgRoot, "lessons-learned", "c.md"));

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
      path.join(kgRoot, "lessons-learned"),
      "auth.md",
      "# Authentication\n\nOAuth2 token refresh implementation details."
    );

    // Build index
    rebuildIndex(kgRoot, "search-shape");

    const dbPath = getProjectDbPath("search-shape", kgRoot);
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

    writeMd(path.join(kgRoot, "lessons-learned"), "test.md", "# Test\nSome content.");
    rebuildIndex(kgRoot, "search-empty");

    const dbPath = getProjectDbPath("search-empty", kgRoot);

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
// TC-001: DB is created at ~/.kmgraph/index/ on first rebuild
// ---------------------------------------------------------------------------

describe("DB path resolution", () => {
  test("TC-001: DB created at ~/.kmgraph/index/ on first rebuild", () => {
    const kgRoot = makeTempDir("tc-001-db-path");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);

    writeMd(path.join(kgRoot, "lessons-learned"), "test.md", "# Test\nContent");

    // Rebuild should use resolveDbPath internally
    const result = rebuildIndex(kgRoot, "test-kg-001");

    // Verify DB path in result. issue-55: the filename is now
    // "<name>-<pathHash>.db" rather than a bare "<name>.db", so the KG name is
    // still identifiable in it but no longer the whole key.
    expect(path.dirname(result.db_path)).toBe(path.join(getIndexDir(), "projects"));
    expect(path.basename(result.db_path)).toMatch(/^test-kg-001-[0-9a-f]{12}\.db$/);

    // Verify file actually exists
    expect(fs.existsSync(result.db_path)).toBe(true);

    // Verify it's in the user-level index dir, not in the project
    expect(result.db_path.startsWith(kgRoot)).toBe(false);
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
      path.join(projRoot1, "lessons-learned"),
      "doc1.md",
      "# Doc 1\nContent for KG1"
    );
    writeMd(
      path.join(projRoot2, "lessons-learned"),
      "doc2.md",
      "# Doc 2\nContent for KG2"
    );

    const result1 = rebuildIndex(projRoot1, "kg-instance-1");
    const result2 = rebuildIndex(projRoot2, "kg-instance-2");

    // Both should have DB under the user-level index dir
    const projectsDir = path.join(getIndexDir(), "projects");
    expect(path.dirname(result1.db_path)).toBe(projectsDir);
    expect(path.dirname(result2.db_path)).toBe(projectsDir);

    // But with different filenames
    expect(result1.db_path).not.toBe(result2.db_path);
    expect(path.basename(result1.db_path)).toMatch(/^kg-instance-1-[0-9a-f]{12}\.db$/);
    expect(path.basename(result2.db_path)).toMatch(/^kg-instance-2-[0-9a-f]{12}\.db$/);

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

    writeMd(path.join(kgRoot, "lessons-learned"), "test.md", "# Test\nContent");

    const result = rebuildIndex(kgRoot, "tc-008-kg");

    // DB should be in the user-level index dir, not in the project
    expect(result.db_path).not.toContain(kgRoot);
    expect(result.db_path.startsWith(getIndexDir())).toBe(true);

    // Verify by checking path structure
    const projectIsNotAncestor = !result.db_path.startsWith(kgRoot);
    expect(projectIsNotAncestor).toBe(true);
  });

  test("TC-008b: Simulated git clean does not remove user DB", () => {
    const kgRoot = makeTempDir("tc-008b-git-clean-sim");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);

    writeMd(path.join(kgRoot, "lessons-learned"), "test.md", "# Test\nContent");

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
  test("TC-009: .gitignore does not contain .fts5.db or kg-fts5 patterns (DB lives in ~/.kmgraph/index/)", () => {
    const gitignorePath = path.join(
      process.cwd(),
      "..",
      ".gitignore"
    );

    const content = fs.readFileSync(gitignorePath, "utf-8");

    // DB now lives at ~/.kmgraph/index/ — outside the project.
    // No gitignore entry is needed or correct.
    expect(content).not.toContain(".fts5.db");
    expect(content).not.toContain("kg-fts5");

    // ~/.kmgraph is a user-level directory and must NOT appear in .gitignore
    expect(content).not.toContain(".kmgraph");
  });
});

// ---------------------------------------------------------------------------
// getPersonalDbPath
// ---------------------------------------------------------------------------

describe("getPersonalDbPath", () => {
  it("returns <indexDir>/personal.db", () => {
    const result = getPersonalDbPath();
    expect(result).toBe(path.join(getIndexDir(), "personal.db"));
  });
});

// ---------------------------------------------------------------------------
// getProjectDbPath
// ---------------------------------------------------------------------------

describe("getProjectDbPath", () => {
  it("returns <indexDir>/projects/<name>-<pathHash>.db", () => {
    const kgRoot = makeTempDir("get-project-db-path");
    tempDirs.push(kgRoot);
    const result = getProjectDbPath("my-kg", kgRoot);
    expect(path.dirname(result)).toBe(path.join(getIndexDir(), "projects"));
    // Intent preserved from the pre-issue-55 assertion: the KG name is still
    // present in the filename. It is just no longer the *whole* filename.
    expect(path.basename(result)).toMatch(/^my-kg-[0-9a-f]{12}\.db$/);
  });
});

// ---------------------------------------------------------------------------
// resolveDbPath
// ---------------------------------------------------------------------------

describe("resolveDbPath", () => {
  it("routes personal to personal.db", () => {
    expect(resolveDbPath("any", "personal", os.homedir())).toContain("personal.db");
  });
  it("routes project-local to projects/<name>-<pathHash>.db", () => {
    const kgRoot = makeTempDir("resolve-db-path");
    tempDirs.push(kgRoot);
    const result = resolveDbPath("my-kg", "project-local", kgRoot);
    expect(path.dirname(result)).toBe(path.join(getIndexDir(), "projects"));
    expect(path.basename(result)).toMatch(/^my-kg-[0-9a-f]{12}\.db$/);
  });
});

// ---------------------------------------------------------------------------
// issue-55: index path is keyed by KG path, not just KG name
// ---------------------------------------------------------------------------

describe("issue-55: computeDbPath path-keying", () => {
  it("gives two same-named KGs at different paths distinct db files", () => {
    const rootA = makeTempDir("collide-a");
    const rootB = makeTempDir("collide-b");
    tempDirs.push(rootA, rootB);

    const a = computeDbPath("shared-name", "project-local", rootA);
    const b = computeDbPath("shared-name", "project-local", rootB);

    expect(a).not.toBe(b);
    expect(path.basename(a)).toMatch(/^shared-name-[0-9a-f]{12}\.db$/);
    expect(path.basename(b)).toMatch(/^shared-name-[0-9a-f]{12}\.db$/);
  });

  it("is stable for the same KG path across repeated calls", () => {
    const root = makeTempDir("stable");
    tempDirs.push(root);
    expect(computeDbPath("kg", "project-local", root)).toBe(
      computeDbPath("kg", "project-local", root)
    );
  });

  it("creates no directories (pure) — kg_fts5_status's read-only contract", () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "fts5-pure-index-"));
    tempDirs.push(sandbox);
    const nonexistentIndexDir = path.join(sandbox, "no-such-index-dir");
    const kgRoot = makeTempDir("pure");
    tempDirs.push(kgRoot);

    const prev = process.env.KG_INDEX_DIR;
    process.env.KG_INDEX_DIR = nonexistentIndexDir;
    try {
      const dbPath = computeDbPath("kg", "project-local", kgRoot);
      expect(dbPath.startsWith(nonexistentIndexDir)).toBe(true);
      // Nothing at all may be created — not the index dir, not projects/
      expect(fs.existsSync(nonexistentIndexDir)).toBe(false);
      // Contrast: resolveDbPath (the write-path variant) *does* create it
      resolveDbPath("kg", "project-local", kgRoot);
      expect(fs.existsSync(path.join(nonexistentIndexDir, "projects"))).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.KG_INDEX_DIR;
      else process.env.KG_INDEX_DIR = prev;
    }
  });

  it("resolves a ~-prefixed KG path identically regardless of process.cwd()", () => {
    const relativeToHome = path.relative(os.homedir(), os.tmpdir());
    // Only meaningful when tmpdir is under home; otherwise use home itself.
    const tildePath = relativeToHome.startsWith("..") ? "~" : `~/${relativeToHome}`;

    const origCwd = process.cwd;
    try {
      process.cwd = () => "/";
      const fromRoot = computeDbPath("tilde-kg", "project-local", tildePath);
      process.cwd = () => os.tmpdir();
      const fromTmp = computeDbPath("tilde-kg", "project-local", tildePath);
      expect(fromRoot).toBe(fromTmp);

      // ...and identical to the fully-expanded absolute form of the same path
      const expanded = tildePath.replace(/^~/, os.homedir());
      expect(computeDbPath("tilde-kg", "project-local", expanded)).toBe(fromRoot);
    } finally {
      process.cwd = origCwd;
    }
  });

  it("routes personal graphs to the fixed personal.db regardless of kgPath", () => {
    const rootA = makeTempDir("personal-a");
    const rootB = makeTempDir("personal-b");
    tempDirs.push(rootA, rootB);
    expect(computeDbPath("x", "personal", rootA)).toBe(
      computeDbPath("y", "personal", rootB)
    );
    expect(computeDbPath("x", "personal", rootA)).toBe(
      path.join(getIndexDir(), "personal.db")
    );
  });
});

describe("issue-55: sanitizeKgNameForFilename", () => {
  it("strips path separators so a KG name cannot escape projects/", () => {
    expect(sanitizeKgNameForFilename("../../etc/passwd")).not.toContain("/");
    expect(sanitizeKgNameForFilename("../../etc/passwd")).not.toContain("..");
    expect(sanitizeKgNameForFilename("a/b")).toBe("a-b");
  });

  it("keeps ordinary names untouched", () => {
    expect(sanitizeKgNameForFilename("my-kg_01")).toBe("my-kg_01");
  });

  it("falls back to 'kg' when a name sanitizes away entirely", () => {
    expect(sanitizeKgNameForFilename("///")).toBe("kg");
    expect(sanitizeKgNameForFilename("")).toBe("kg");
  });

  it("produces a db path that stays inside projects/ for a hostile name", () => {
    const kgRoot = makeTempDir("hostile-name");
    tempDirs.push(kgRoot);
    const dbPath = computeDbPath("../../../evil", "project-local", kgRoot);
    expect(path.dirname(dbPath)).toBe(path.join(getIndexDir(), "projects"));
  });
});
