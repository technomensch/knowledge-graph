jest.mock("../src/utils.js", () => {
  const actual = jest.requireActual("../src/utils.js") as Record<string, unknown>;
  return {
    ...actual,
    readConfig: jest.fn(),
  };
});

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { resolveScanPath, registerSanitizationTool } from "../src/tools/sanitization.js";
import { readConfig, KgConfig } from "../src/utils.js";
import { PersonalScopeSession } from "../src/resolution.js";

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

// Finding 1 (Fable review): kg_check_sensitive had no confirmPersonalScopeAccess gate at all --
// scope:"user" reached resolvePersonalGraph and walked/scanned the personal KG's files
// unconfirmed. These tests cover the gate now wired into the registered tool's handler.
describe("kg_check_sensitive scope:\"user\" gate", () => {
  async function getHandler(session = new PersonalScopeSession()) {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    let handler: any;
    jest.spyOn(server, "tool").mockImplementation((...args: any[]) => { handler = args[3]; return server as any; });
    registerSanitizationTool(server, session);
    return handler;
  }

  afterEach(() => jest.clearAllMocks());

  it('scope:"user" from an unconfirmed repo in automated mode returns KMG_INPUT_REQUIRED/personal_scope_unseen_repo', async () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot, personalRoot));

    const handler = await getHandler();
    const result = await handler({ scope: "user" });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toMatchObject({ error: "KMG_INPUT_REQUIRED", reason: "personal_scope_unseen_repo" });
  });

  it('scope:"user" proceeds to scan the personal graph once confirmPersonalScope:true is passed', async () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot, personalRoot));

    const handler = await getHandler();
    const result = await handler({ scope: "user", confirmPersonalScope: true });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain(personalRoot);
  });

  it("a kgPath pointing at the registered personal graph's root is gated, not bypassed", async () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot, personalRoot));

    const handler = await getHandler();
    const result = await handler({ kgPath: personalRoot });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toMatchObject({ error: "KMG_INPUT_REQUIRED", reason: "personal_scope_unseen_repo" });
  });

  it("a kgPath pointing at a subdirectory nested inside the personal graph's root is also gated", async () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    const nestedDir = path.join(personalRoot, "nested");
    fs.mkdirSync(nestedDir);
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot, personalRoot));

    const handler = await getHandler();
    const result = await handler({ kgPath: nestedDir });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toMatchObject({ error: "KMG_INPUT_REQUIRED", reason: "personal_scope_unseen_repo" });
  });

  it("a kgPath that does not touch any registered personal graph still scans unchanged (no gate)", async () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    const otherDir = makeTempDir("other");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot, personalRoot));

    const handler = await getHandler();
    const result = await handler({ kgPath: otherDir });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain(otherDir);
  });
});
