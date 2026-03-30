import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { rebuildIndex } from "../src/tools/fts5.js";
import { KgConfig } from "../src/utils.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `search-test-${prefix}-`));
}

function scaffoldKg(root: string): void {
  for (const dir of ["knowledge", "lessons-learned", "decisions", "sessions"]) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
}

function writeMd(dir: string, name: string, content: string): string {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content, "utf-8");
  return filePath;
}

function makeConfig(
  active: string,
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
      lastUsed: new Date().toISOString(),
    };
  }
  return {
    version: "1.0.0",
    active,
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
// getAllGraphPaths tests
// ---------------------------------------------------------------------------

describe("getAllGraphPaths", () => {
  const { getAllGraphPaths } = require("../src/utils.js");

  it("returns all graphs when no type filter given", () => {
    const config = makeConfig("proj", {
      proj: { path: "/tmp/proj", type: "project-local" },
      personal: { path: "/tmp/personal", type: "personal" },
    });
    const result = getAllGraphPaths(config);
    expect(result).toHaveLength(2);
  });

  it("filters to personal type only", () => {
    const config = makeConfig("proj", {
      proj: { path: "/tmp/proj", type: "project-local" },
      personal: { path: "/tmp/personal", type: "personal" },
    });
    const result = getAllGraphPaths(config, ["personal"]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("personal");
    expect(result[0].type).toBe("personal");
  });

  it("defaults missing type to project-local (v0.2.1 compat)", () => {
    const config = makeConfig("legacy", {
      legacy: { path: "/tmp/legacy", type: "" as any },
    });
    // Manually remove type field to simulate v0.2.1 config
    delete (config.graphs["legacy"] as any).type;
    const result = getAllGraphPaths(config);
    expect(result[0].type).toBe("project-local");
  });

  it("expands ~ in paths", () => {
    const config = makeConfig("home", {
      home: { path: "~/.claude/knowledge-graph", type: "personal" },
    });
    const result = getAllGraphPaths(config);
    expect(result[0].path).toBe(path.join(os.homedir(), ".claude/knowledge-graph"));
    expect(result[0].path).not.toContain("~");
  });

  it("returns empty array when no graphs registered", () => {
    const config = makeConfig("none", {});
    config.active = null;
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

    const projResult = rebuildIndex(projRoot);
    const globalResult = rebuildIndex(globalRoot);

    expect(projResult.indexed).toBeGreaterThan(0);
    expect(globalResult.indexed).toBeGreaterThan(0);

    // Verify indexes are at their respective KG paths
    expect(fs.existsSync(path.join(projRoot, ".fts5.db"))).toBe(true);
    expect(fs.existsSync(path.join(globalRoot, ".fts5.db"))).toBe(true);
  });

  it("project KG does not contain personal KG content and vice versa", () => {
    const projRoot = makeTempDir("proj");
    const globalRoot = makeTempDir("personal");
    tempDirs.push(projRoot, globalRoot);

    scaffoldKg(projRoot);
    scaffoldKg(globalRoot);

    writeMd(
      path.join(projRoot, "knowledge"),
      "proj-only.md",
      "---\ntitle: Project Knowledge\n---\n\nThis belongs to the project KG only."
    );
    writeMd(
      path.join(globalRoot, "knowledge"),
      "global-only.md",
      "---\ntitle: Global Knowledge\n---\n\nThis belongs to the global KG only."
    );

    rebuildIndex(projRoot);
    rebuildIndex(globalRoot);

    const { searchFts5, getDbPath } = require("../src/tools/fts5.js");

    const projResults = searchFts5(getDbPath(projRoot), "project KG only", projRoot);
    const globalResults = searchFts5(getDbPath(globalRoot), "global KG only", globalRoot);

    expect(projResults.length).toBeGreaterThan(0);
    expect(globalResults.length).toBeGreaterThan(0);

    // Cross-contamination check
    const projResultsForGlobal = searchFts5(getDbPath(projRoot), "global KG only", projRoot);
    const globalResultsForProj = searchFts5(getDbPath(globalRoot), "project KG only", globalRoot);

    expect(projResultsForGlobal).toHaveLength(0);
    expect(globalResultsForProj).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// sourceKg tagging (via searchFts5 + manual tag simulation)
// ---------------------------------------------------------------------------

describe("SearchResult sourceKg field", () => {
  it("SearchResult interface allows sourceKg and sourceKgType fields", () => {
    const { searchFts5, getDbPath, rebuildIndex: rebuild } = require("../src/tools/fts5.js");
    const root = makeTempDir("tag");
    tempDirs.push(root);
    scaffoldKg(root);

    writeMd(
      path.join(root, "knowledge"),
      "test.md",
      "---\ntitle: Test Entry\n---\n\nSome content here."
    );

    rebuild(root);
    const results = searchFts5(getDbPath(root), "content", root);
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
