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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `config-test-${prefix}-`));
  tempDirs.push(dir);
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
      lastUsed: now,
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
      lastUsed: now,
      status: "active",
      statusChangedAt: now,
      graphId: "personal-id",
    };
  }
  return { version: "1.0.0", active: "proj", graphs, sanitization: { enabled: false, patterns: [], action: "warn" } };
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
    (readConfig as jest.Mock).mockReturnValue({ version: "1.0.0", active: null, graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } });

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
    // Unchanged from the mocked readConfig() input (null), never set to
    // "new-kg" -- resolution is context-derived now (Task 1.5), nothing
    // writes config.active anymore.
    expect(cfg.active).toBeNull();
    const graph = cfg.graphs["new-kg"];
    expect(graph.status).toBe("pending");
    expect(graph.graphId).toBeTruthy();
    expect(graph.graphId).not.toBe("placeholder-graph-id");
    expect(fs.readFileSync(path.join(kgPath, ".kmgraph-id"), "utf-8").trim()).toBe(graph.graphId);
  });
});
