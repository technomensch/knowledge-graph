jest.mock("../src/utils.js", () => {
  const actual = jest.requireActual("../src/utils.js") as Record<string, unknown>;
  return {
    ...actual,
    readConfig: jest.fn(),
    writeConfig: jest.fn(),
  };
});

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { handleConfigAddCategory, handleConfigInit } from "../src/tools/config.js";
import { readConfig, writeConfig, KgConfig } from "../src/utils.js";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  // Nest one level below a fresh mkdtemp wrapper (Opus review SF-2, same
  // fixture-collision class already fixed in capture/upgrade/fts5-scope/
  // sanitization test files) -- resolveGraph matches cwd against
  // dirname(graph.path); a bare mkdtemp leaf shares os.tmpdir() as its
  // dirname with every other fixture in this file, which would falsely
  // match an "unrelated" cwd against a registered graph it shouldn't.
  const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), `config-test-${prefix}-`));
  const dir = path.join(wrapper, "kg");
  fs.mkdirSync(dir);
  tempDirs.push(wrapper);
  return dir;
}

afterEach(() => {
  jest.clearAllMocks();
  for (const dir of tempDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
  tempDirs.length = 0;
});

function makeConfig(projRoot: string, personalRoot?: string): KgConfig {
  const now = new Date().toISOString();
  const graphs: KgConfig["graphs"] = {
    proj: {
      name: "proj",
      path: projRoot,
      type: "project-local",
      categories: [],
      createdAt: now,
      status: "active",
      statusChangedAt: now,
      graphId: "proj-id",
    },
  };
  if (personalRoot) {
    graphs.personal = {
      name: "personal",
      path: personalRoot,
      type: "personal",
      categories: [],
      createdAt: now,
      status: "active",
      statusChangedAt: now,
      graphId: "personal-id",
    };
  }
  return { version: "1.0.0", graphs, sanitization: { enabled: false, patterns: [], action: "warn" } };
}

describe("handleConfigAddCategory", () => {
  it("resolves the target graph via cwd when scope is omitted", async () => {
    const projRoot = makeTempDir("proj");
    fs.mkdirSync(path.join(projRoot, "lessons-learned"), { recursive: true });
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot));
    const origCwd = process.cwd;
    process.cwd = () => projRoot;

    const result = await handleConfigAddCategory({ name: "security", prefix: null, git: "commit" });
    process.cwd = origCwd;

    expect(result.isError).toBeUndefined();
    expect(fs.existsSync(path.join(projRoot, "lessons-learned", "security"))).toBe(true);
    expect(writeConfig).toHaveBeenCalled();
  });

  it("errors when cwd resolves nothing (Opus review SF-2 -- proves the cwd match above is real, not an os.tmpdir()-ancestor false match)", async () => {
    const projRoot = makeTempDir("proj-registered");
    const unrelatedDir = makeTempDir("unrelated-cwd");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot));
    const origCwd = process.cwd;
    process.cwd = () => unrelatedDir;

    const result = await handleConfigAddCategory({ name: "security", prefix: null, git: "commit" });
    process.cwd = origCwd;

    expect(result.isError).toBe(true);
  });

  it("resolves the personal graph when scope=user", async () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    fs.mkdirSync(path.join(personalRoot, "lessons-learned"), { recursive: true });
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot, personalRoot));
    const origCwd = process.cwd;
    process.cwd = () => "/completely/unrelated";

    const result = await handleConfigAddCategory({ name: "ml-ops", prefix: null, git: "commit", scope: "user" });
    process.cwd = origCwd;

    expect(result.isError).toBeUndefined();
    expect(fs.existsSync(path.join(personalRoot, "lessons-learned", "ml-ops"))).toBe(true);
  });

  it("returns a plain error when scope=user has no personal graph registered", async () => {
    const projRoot = makeTempDir("proj");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot));

    const result = await handleConfigAddCategory({ name: "ml-ops", prefix: null, git: "commit", scope: "user" });

    expect(result.isError).toBe(true);
  });
});

describe("handleConfigInit", () => {
  it("no longer sets config.active, mints a real graphId, writes a matching marker file, and mints status=pending (ADR-067 Task 1.9 Step 7.5)", async () => {
    const kgPath = makeTempDir("init");
    (readConfig as jest.Mock).mockReturnValue({ version: "1.0.0", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } });

    let written: KgConfig | null = null;
    (writeConfig as jest.Mock).mockImplementation((cfg: KgConfig) => { written = cfg; });

    const result = await handleConfigInit({
      name: "new-kg",
      kgPath,
      type: "project-local",
      categories: [{ name: "architecture", prefix: null, git: "commit" }],
    });

    expect(result.isError).toBeUndefined();
    expect(written).not.toBeNull();
    const cfg = written as unknown as KgConfig;
    // KgConfig no longer has an "active" field at all (Task 1.12) --
    // resolution is fully context-derived (Task 1.5).
    expect((cfg as unknown as Record<string, unknown>).active).toBeUndefined();
    const graph = cfg.graphs["new-kg"];
    expect(graph.status).toBe("pending");
    expect(graph.graphId).toBeTruthy();
    expect(graph.graphId).not.toBe("placeholder-graph-id");
    expect(fs.readFileSync(path.join(kgPath, ".kmgraph-id"), "utf-8").trim()).toBe(graph.graphId);
  });

  it("returns a clean error (not a thrown exception) when the target dir already has a marker for a different graph (Opus review SF-4)", async () => {
    const kgPath = makeTempDir("init-marker-conflict");
    fs.writeFileSync(path.join(kgPath, ".kmgraph-id"), "some-other-id\n", "utf-8");
    (readConfig as jest.Mock).mockReturnValue({ version: "1.0.0", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } });

    const result = await handleConfigInit({
      name: "new-kg",
      kgPath,
      type: "project-local",
      categories: [{ name: "architecture", prefix: null, git: "commit" }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/already tracked as a different knowledge graph/);
    expect(writeConfig).not.toHaveBeenCalled();
  });
});
