// issue-55: handleSearch() reads the registry through readConfig(); mocked so
// the regression test below can drive two *separate* installs that each
// register a graph under the same name. Spreads the real module so every other
// util in this file (getAllGraphPaths, getIndexDir) stays real.
jest.mock("../src/utils.js", () => {
  const actual = jest.requireActual("../src/utils.js") as Record<string, unknown>;
  return {
    ...actual,
    readConfig: jest.fn(() => ({
      version: "1.0.0",
      graphs: {},
      sanitization: { enabled: false, patterns: [], action: "warn" },
    })),
  };
});

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { rebuildIndex, getProjectDbPath, searchFts5 } from "../src/tools/fts5.js";
import { handleSearch } from "../src/tools/search.js";
import { KgConfig, getIndexDir, readConfig } from "../src/utils.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `search-test-${prefix}-`));
}

function scaffoldKg(root: string): void {
  for (const dir of ["lessons-learned", "decisions", "sessions"]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
}

function writeMd(dir: string, name: string, content: string): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

function makeConfig(
  graphs: Record<string, { path: string; type: string }>
): KgConfig {
  const graphEntries: KgConfig["graphs"] = {};
  for (const [name, g] of Object.entries(graphs)) {
    graphEntries[name] = {
      name,
      path: g.path,
      type: g.type as KgConfig["graphs"][string]["type"],
      categories: [],
      createdAt: new Date().toISOString(),
      status: "active" as const,
      statusChangedAt: new Date().toISOString(),
      graphId: `test-graph-id-${name}`,
    };
  }
  return {
    version: "1.0.0",
    graphs: graphEntries,
    sanitization: { enabled: false, patterns: [], action: "warn" },
  };
}

// ---------------------------------------------------------------------------
// Cleanup
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
// issue-35: dead "knowledge" dir literal must not reappear in the fallback
// searchDirs array (search.ts's linear-scan path isn't exported/unit-testable
// in isolation — it lives inside registerSearchTool's closure — so this is a
// static source guard rather than a behavioral test).
// ---------------------------------------------------------------------------

describe("search.ts searchDirs fallback", () => {
  it("does not list the dead 'knowledge' directory", () => {
    const source = fs.readFileSync(path.join(__dirname, "../src/tools/search.ts"), "utf-8");
    const match = source.match(/const searchDirs = \[([^\]]*)\]/);
    expect(match).not.toBeNull();
    expect(match![1]).not.toMatch(/"knowledge"/);
  });

  it("lists 'issues' and 'enhancements' (issue-34)", () => {
    const source = fs.readFileSync(path.join(__dirname, "../src/tools/search.ts"), "utf-8");
    const match = source.match(/const searchDirs = \[([^\]]*)\]/);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/"issues"/);
    expect(match![1]).toMatch(/"enhancements"/);
  });
});

// ---------------------------------------------------------------------------
// getAllGraphPaths tests
// ---------------------------------------------------------------------------

describe("getAllGraphPaths", () => {
  const { getAllGraphPaths } = require("../src/utils.js");

  it("returns all graphs when no type filter given", () => {
    const config = makeConfig({
      proj: { path: "/tmp/proj", type: "project-local" },
      personal: { path: "/tmp/personal", type: "personal" },
    });
    const result = getAllGraphPaths(config);
    expect(result).toHaveLength(2);
  });

  it("filters to personal type only", () => {
    const config = makeConfig({
      proj: { path: "/tmp/proj", type: "project-local" },
      personal: { path: "/tmp/personal", type: "personal" },
    });
    const result = getAllGraphPaths(config, ["personal"]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("personal");
    expect(result[0].type).toBe("personal");
  });

  it("defaults missing type to project-local (v0.2.1 compat)", () => {
    const config = makeConfig({
      legacy: { path: "/tmp/legacy", type: "" as any },
    });
    // Manually remove type field to simulate v0.2.1 config
    delete (config.graphs["legacy"] as any).type;
    const result = getAllGraphPaths(config);
    expect(result[0].type).toBe("project-local");
  });

  it("expands ~ in paths", () => {
    const config = makeConfig({
      home: { path: "~/.kmgraph", type: "personal" },
    });
    const result = getAllGraphPaths(config);
    expect(result[0].path).toBe(path.join(os.homedir(), ".kmgraph"));
    expect(result[0].path).not.toContain("~");
  });

  it("returns empty array when no graphs registered", () => {
    const config = makeConfig({});
    const result = getAllGraphPaths(config);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Multi-KG search integration tests (via searchKg helper, tested indirectly
// through the FTS5 index layer since registerSearchTool is MCP-bound)
// ---------------------------------------------------------------------------

describe("multi-KG search via FTS5", () => {
  it("indexes two separate KG roots independently", () => {
    const projRoot = makeTempDir("proj");
    const globalRoot = makeTempDir("personal");
    tempDirs.push(projRoot, globalRoot);

    scaffoldKg(projRoot);
    scaffoldKg(globalRoot);

    writeMd(
      path.join(projRoot, "lessons-learned"),
      "auth-pattern.md",
      "---\ntitle: Auth Pattern\n---\n# Auth Pattern\n\nUse JWT for stateless auth."
    );

    writeMd(
      path.join(globalRoot, "lessons-learned"),
      "create-vs-update.md",
      "---\ntitle: Create vs Update\n---\n# Create vs Update\n\nUse Create for new files, Update for existing."
    );

    const projResult = rebuildIndex(projRoot, "proj-kg");
    const globalResult = rebuildIndex(globalRoot, "personal-kg");

    expect(projResult.indexed).toBeGreaterThan(0);
    expect(globalResult.indexed).toBeGreaterThan(0);

    // Verify indexes are at the user-level index dir
    expect(projResult.db_path.startsWith(getIndexDir())).toBe(true);
    expect(globalResult.db_path.startsWith(getIndexDir())).toBe(true);
    expect(fs.existsSync(projResult.db_path)).toBe(true);
    expect(fs.existsSync(globalResult.db_path)).toBe(true);
  });

  it("project KG does not contain personal KG content and vice versa", () => {
    const projRoot = makeTempDir("proj");
    const globalRoot = makeTempDir("personal");
    tempDirs.push(projRoot, globalRoot);

    scaffoldKg(projRoot);
    scaffoldKg(globalRoot);

    writeMd(
      path.join(projRoot, "lessons-learned"),
      "proj-only.md",
      "---\ntitle: Project Knowledge\n---\n\nThis belongs to the project KG only."
    );
    writeMd(
      path.join(globalRoot, "lessons-learned"),
      "global-only.md",
      "---\ntitle: Global Knowledge\n---\n\nThis belongs to the global KG only."
    );

    rebuildIndex(projRoot, "proj-kg");
    rebuildIndex(globalRoot, "personal-kg");

    const projDbPath = getProjectDbPath("proj-kg", projRoot);
    const globalDbPath = getProjectDbPath("personal-kg", globalRoot);

    const projResults = searchFts5(projDbPath, "project KG only", projRoot);
    const globalResults = searchFts5(globalDbPath, "global KG only", globalRoot);

    expect(projResults.length).toBeGreaterThan(0);
    expect(globalResults.length).toBeGreaterThan(0);

    // Cross-contamination check
    const projResultsForGlobal = searchFts5(projDbPath, "global KG only", projRoot);
    const globalResultsForProj = searchFts5(globalDbPath, "project KG only", globalRoot);

    expect(projResultsForGlobal).toHaveLength(0);
    expect(globalResultsForProj).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// sourceKg tagging (via searchFts5 + manual tag simulation)
// ---------------------------------------------------------------------------

describe("SearchResult sourceKg field", () => {
  it("SearchResult interface allows sourceKg and sourceKgType fields", () => {
    const root = makeTempDir("tag");
    tempDirs.push(root);
    scaffoldKg(root);

    writeMd(
      path.join(root, "lessons-learned"),
      "test.md",
      "---\ntitle: Test Entry\n---\n\nSome content here."
    );

    rebuildIndex(root, "tag-kg");
    const dbPath = getProjectDbPath("tag-kg", root);
    const results = searchFts5(dbPath, "content", root);
    expect(results.length).toBeGreaterThan(0);

    // Tag results as multi-KG search would
    for (const r of results) {
      r.sourceKg = "my-project";
      r.sourceKgType = "project-local";
    }

    expect(results[0].sourceKg).toBe("my-project");
    expect(results[0].sourceKgType).toBe("project-local");
  });
});

// ---------------------------------------------------------------------------
// TC-004: kg_search reads from the new ~/.kmgraph/index/ path
// ---------------------------------------------------------------------------

describe("searchFts5 uses user-level storage (via getProjectDbPath)", () => {
  test("TC-004: searchFts5 reads from ~/.kmgraph/index/ path", () => {
    const kgRoot = makeTempDir("tc-004-fts5-search");
    tempDirs.push(kgRoot);
    scaffoldKg(kgRoot);

    writeMd(
      path.join(kgRoot, "lessons-learned"),
      "research.md",
      "---\ntitle: Research Results\n---\n# Research Results\n\nKey findings on authentication patterns."
    );

    // Rebuild using new path function
    const rebuildResult = rebuildIndex(kgRoot, "tc-004-kg");

    // Verify DB is at the user-level index dir, outside the project tree
    expect(rebuildResult.db_path.startsWith(getIndexDir())).toBe(true);
    expect(rebuildResult.db_path.startsWith(kgRoot)).toBe(false);

    // Verify searchFts5 can read from that path
    const dbPath = getProjectDbPath("tc-004-kg", kgRoot);
    expect(fs.existsSync(dbPath)).toBe(true);

    // Search should work
    const results = searchFts5(dbPath, "authentication", kgRoot);
    expect(results.length).toBeGreaterThan(0);

    // Verify result shape and content
    const firstResult = results[0];
    expect(firstResult).toHaveProperty("file");
    expect(firstResult).toHaveProperty("relativePath");
    expect(firstResult).toHaveProperty("line");
    expect(firstResult).toHaveProperty("context");
    expect(firstResult.relativePath).toContain("research.md");
  });

  test("TC-004b: Multiple KG names use separate user-level databases", () => {
    const kg1Root = makeTempDir("tc-004b-kg1");
    const kg2Root = makeTempDir("tc-004b-kg2");
    tempDirs.push(kg1Root, kg2Root);

    scaffoldKg(kg1Root);
    scaffoldKg(kg2Root);

    writeMd(
      path.join(kg1Root, "lessons-learned"),
      "doc1.md",
      "---\ntitle: Project Doc\n---\n\nProject-specific content."
    );
    writeMd(
      path.join(kg2Root, "lessons-learned"),
      "doc2.md",
      "---\ntitle: Personal Doc\n---\n\nPersonal-specific content."
    );

    // Rebuild both with distinct names
    rebuildIndex(kg1Root, "project-kg");
    rebuildIndex(kg2Root, "personal-kg");

    const projDbPath = getProjectDbPath("project-kg", kg1Root);
    const persDbPath = getProjectDbPath("personal-kg", kg2Root);

    // Verify separate paths
    expect(projDbPath).not.toBe(persDbPath);
    expect(fs.existsSync(projDbPath)).toBe(true);
    expect(fs.existsSync(persDbPath)).toBe(true);

    // Verify content isolation
    const projResults = searchFts5(projDbPath, "Project", kg1Root);
    const persResults = searchFts5(persDbPath, "Personal", kg2Root);

    expect(projResults.length).toBeGreaterThan(0);
    expect(persResults.length).toBeGreaterThan(0);

    // Cross-contamination check: project search shouldn't find personal content
    const projSearchForPersonal = searchFts5(projDbPath, "Personal", kg1Root);
    expect(projSearchForPersonal).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// issue-55 regression: the project-local FTS5 index path must be keyed by the
// KG's filesystem path, not by its name alone.
//
// Deliberately exercised through handleSearch() -> searchKg() (the actual
// defective call path) rather than rebuildIndex()/searchFts5() directly: the
// lower-level functions were never the bug. searchKg() found *any* file at the
// name-keyed path, assumed it belonged to the KG being searched, queried it,
// and thereby suppressed the correct linear-scan fallback.
// ---------------------------------------------------------------------------

describe("issue-55: same-named KGs at different paths do not share an index", () => {
  /** Nested one level below a fresh mkdtemp wrapper — resolveGraph() matches
   *  cwd against dirname(graph.path), so a bare mkdtemp leaf would share
   *  os.tmpdir() as its dirname with every other fixture here. */
  function makeNestedKg(prefix: string): string {
    const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), `issue55-${prefix}-`));
    tempDirs.push(wrapper);
    const kg = path.join(wrapper, "knowledge");
    fs.mkdirSync(kg, { recursive: true });
    scaffoldKg(kg);
    return kg;
  }

  async function searchIn(kgRoot: string, kgName: string, query: string): Promise<string> {
    (readConfig as jest.Mock).mockReturnValue(
      makeConfig({ [kgName]: { path: kgRoot, type: "project-local" } })
    );
    const origCwd = process.cwd;
    process.cwd = () => kgRoot;
    try {
      const result = await handleSearch({
        query,
        format: "detailed",
        interaction: "automated",
      });
      return result.content.map((c: { text: string }) => c.text).join("\n");
    } finally {
      process.cwd = origCwd;
    }
  }

  it("each KG's search returns only its own content, and never empty", async () => {
    const SHARED_NAME = "shared-name";

    const rootA = makeNestedKg("alpha");
    const rootB = makeNestedKg("beta");

    writeMd(
      path.join(rootA, "lessons-learned"),
      "alpha.md",
      "---\ntitle: Alpha Doc\n---\n# Alpha Doc\n\nzebrafishalpha marker content."
    );
    writeMd(
      path.join(rootB, "lessons-learned"),
      "beta.md",
      "---\ntitle: Beta Doc\n---\n# Beta Doc\n\nzebrafishbeta marker content."
    );

    // Build both indexes under the *same* KG name — this is the collision.
    const buildA = rebuildIndex(rootA, SHARED_NAME);
    const buildB = rebuildIndex(rootB, SHARED_NAME);
    expect(buildA.db_path).not.toBe(buildB.db_path);
    expect(buildA.indexed).toBeGreaterThan(0);
    expect(buildB.indexed).toBeGreaterThan(0);

    // A finds its own marker...
    const aOwn = await searchIn(rootA, SHARED_NAME, "zebrafishalpha");
    expect(aOwn).not.toContain("No results found");
    expect(aOwn).toContain("alpha.md");

    // ...and never B's.
    const aForB = await searchIn(rootA, SHARED_NAME, "zebrafishbeta");
    expect(aForB).not.toContain("beta.md");

    // B finds its own marker (pre-fix this returned A's index, so it was
    // either empty or contained alpha.md)...
    const bOwn = await searchIn(rootB, SHARED_NAME, "zebrafishbeta");
    expect(bOwn).not.toContain("No results found");
    expect(bOwn).toContain("beta.md");

    // ...and never A's.
    const bForA = await searchIn(rootB, SHARED_NAME, "zebrafishalpha");
    expect(bForA).not.toContain("alpha.md");
  });

  it("a never-indexed KG still falls back to linear scan when a same-named index exists", async () => {
    const SHARED_NAME = "fallback-name";

    const indexedRoot = makeNestedKg("indexed");
    const freshRoot = makeNestedKg("fresh");

    writeMd(
      path.join(indexedRoot, "lessons-learned"),
      "indexed.md",
      "---\ntitle: Indexed Doc\n---\n# Indexed Doc\n\nquokkaindexed content."
    );
    writeMd(
      path.join(freshRoot, "lessons-learned"),
      "fresh.md",
      "---\ntitle: Fresh Doc\n---\n# Fresh Doc\n\nquokkafresh content."
    );

    // Only the first KG ever gets an index built.
    rebuildIndex(indexedRoot, SHARED_NAME);
    expect(fs.existsSync(getProjectDbPath(SHARED_NAME, freshRoot))).toBe(false);

    // The second, never-indexed KG must reach the linear-scan fallback. This
    // is the exact failure test-mcp-tools.sh hit: "No results found" for
    // content that plainly exists on disk.
    const freshResult = await searchIn(freshRoot, SHARED_NAME, "quokkafresh");
    expect(freshResult).not.toContain("No results found");
    expect(freshResult).toContain("fresh.md");
    expect(freshResult).not.toContain("indexed.md");
  });
});
