import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { resolveScanPath } from "../src/tools/sanitization.js";
import { KgConfig } from "../src/utils.js";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  // Nest one level below a fresh mkdtemp wrapper -- see ADR-067 Task 1.9
  // Step 3.5 / capture.test.ts's makeTempDir for why (shared os.tmpdir()
  // parent otherwise makes an "unrelated cwd" fixture false-match).
  const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), `sanitization-test-${prefix}-`));
  const dir = path.join(wrapper, "kg");
  fs.mkdirSync(dir);
  tempDirs.push(wrapper);
  return dir;
}

afterEach(() => {
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

describe("resolveScanPath", () => {
  it("prefers an explicit kgPath over resolution entirely", () => {
    const result = resolveScanPath(makeConfig("/proj"), { kgPath: "/explicit/path" });
    expect("scanPath" in result && result.scanPath).toBe("/explicit/path");
  });

  it("resolves via cwd when scope and kgPath are both omitted", () => {
    const projRoot = makeTempDir("proj");
    const origCwd = process.cwd;
    process.cwd = () => projRoot;

    const result = resolveScanPath(makeConfig(projRoot), {});
    process.cwd = origCwd;

    expect("scanPath" in result && result.scanPath).toBe(projRoot);
  });

  it("resolves the personal graph when scope=user", () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    const result = resolveScanPath(makeConfig(projRoot, personalRoot), { scope: "user" });
    expect("scanPath" in result && result.scanPath).toBe(personalRoot);
  });

  it("returns a plain error when nothing resolves and no kgPath given", () => {
    const projRoot = makeTempDir("proj");
    const unrelatedDir = makeTempDir("unrelated");
    const origCwd = process.cwd;
    process.cwd = () => unrelatedDir;

    const result = resolveScanPath(makeConfig(projRoot), {});
    process.cwd = origCwd;

    expect("error" in result).toBe(true);
  });
});
