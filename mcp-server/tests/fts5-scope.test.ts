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
import { handleFts5Status, handleFts5Rebuild } from "../src/tools/fts5.js";
import { readConfig, writeConfig, KgConfig } from "../src/utils.js";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  // Nest one level below a fresh mkdtemp wrapper -- resolveGraph matches cwd
  // against dirname(graph.path); a bare mkdtemp leaf shares os.tmpdir() as
  // its dirname with every other fixture in this file, which would falsely
  // match an "unrelated" cwd against a registered graph it shouldn't (same
  // fixture-path class as ADR-067 Task 1.9 Step 3.5 / capture.test.ts).
  const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), `fts5-scope-${prefix}-`));
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

describe("handleFts5Status", () => {
  it("resolves the target graph via cwd when scope is omitted", () => {
    const projRoot = makeTempDir("proj");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot));
    const origCwd = process.cwd;
    process.cwd = () => projRoot;

    const result = handleFts5Status({});
    process.cwd = origCwd;

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.kgType).toBe("project-local");
  });

  it("resolves the personal graph when scope=user", () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot, personalRoot));

    const result = handleFts5Status({ scope: "user" });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.kgType).toBe("personal");
  });

  it("returns exists:false with an error when nothing resolves", () => {
    const projRoot = makeTempDir("proj-registered");
    const unrelatedDir = makeTempDir("unrelated-cwd");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot));
    const origCwd = process.cwd;
    process.cwd = () => unrelatedDir;

    const result = handleFts5Status({});
    process.cwd = origCwd;

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.exists).toBe(false);
    expect(parsed.error).toBeDefined();
  });
});

describe("handleFts5Rebuild", () => {
  it("returns a plain error when scope=user has no personal graph registered", () => {
    const projRoot = makeTempDir("proj");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot));

    const result = handleFts5Rebuild({ scope: "user" });
    expect(result.isError).toBe(true);
  });

  it("marks the actually-rebuilt graph's fts5 flag, not config.active (findings doc #3 rewrite)", () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    for (const d of ["lessons-learned", "decisions", "sessions"]) {
      fs.mkdirSync(path.join(personalRoot, d), { recursive: true });
    }
    const config = makeConfig(projRoot, personalRoot);
    (readConfig as jest.Mock).mockReturnValue(config);

    handleFts5Rebuild({ scope: "user" });

    expect(writeConfig).toHaveBeenCalled();
    const written = (writeConfig as jest.Mock).mock.calls[0][0] as KgConfig;
    expect((written.graphs.personal as unknown as Record<string, unknown>).fts5).toBe(true);
    expect((written.graphs.proj as unknown as Record<string, unknown>).fts5).toBeUndefined();
  });
});
