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
import { handleConfigAddCategory } from "../src/tools/config.js";
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
