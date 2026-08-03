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
import { resolveKgPath, registerResolveTool } from "../src/tools/resolve.js";
import { readConfig, KgConfig } from "../src/utils.js";
import { PersonalScopeSession } from "../src/resolution.js";

const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  // Nest one level below a fresh mkdtemp wrapper -- see sanitization.test.ts's
  // makeTempDir for why (shared os.tmpdir() parent otherwise makes an
  // "unrelated cwd" fixture false-match).
  const wrapper = fs.mkdtempSync(path.join(os.tmpdir(), `resolve-test-${prefix}-`));
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

function makeConfig(projRoot: string, personalRoot?: string, overrides?: Partial<KgConfig["graphs"]["proj"]>): KgConfig {
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
      ...overrides,
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

describe("resolveKgPath", () => {
  it("resolves the project graph from cwd when scope is omitted", () => {
    const projRoot = makeTempDir("proj");
    const result = resolveKgPath(makeConfig(projRoot), {}, projRoot);
    expect(result).toEqual({ name: "proj", path: projRoot });
  });

  it("resolves from a subdirectory of the registered root (deepest-match walk)", () => {
    const projRoot = makeTempDir("proj");
    const subdir = path.join(projRoot, "nested", "deeper");
    fs.mkdirSync(subdir, { recursive: true });
    const result = resolveKgPath(makeConfig(projRoot), {}, subdir);
    expect(result).toEqual({ name: "proj", path: projRoot });
  });

  it("errors with no-graph-in-cwd guidance when cwd matches no registered graph", () => {
    const projRoot = makeTempDir("proj");
    const unrelated = makeTempDir("unrelated");
    const result = resolveKgPath(makeConfig(projRoot), {}, unrelated);
    expect("error" in result && result.error).toMatch(/No knowledge graph resolved/);
  });

  it("resolves the personal graph via scope:\"user\", ignoring cwd", () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    const result = resolveKgPath(makeConfig(projRoot, personalRoot), { scope: "user" }, "/completely/unrelated/cwd");
    expect(result).toEqual({ name: "personal", path: personalRoot });
  });

  it("errors when scope:\"user\" is requested but no personal graph is registered", () => {
    const projRoot = makeTempDir("proj");
    const result = resolveKgPath(makeConfig(projRoot), { scope: "user" }, projRoot);
    expect("error" in result).toBe(true);
  });

  it("errors when the cwd-resolved graph is archived", () => {
    const projRoot = makeTempDir("proj");
    const result = resolveKgPath(makeConfig(projRoot, undefined, { status: "archived" }), {}, projRoot);
    expect("error" in result && result.error).toMatch(/archived/);
  });

  it("expands a literal ~ in the registered path before returning it", () => {
    const config = makeConfig("~/kg-fixture");
    const result = resolveKgPath(config, {}, "~/kg-fixture".replace(/^~/, os.homedir()));
    expect("path" in result && result.path).toBe(path.join(os.homedir(), "kg-fixture"));
    expect("path" in result && result.path).not.toContain("~");
  });

  it("expands ~ for scope:\"user\" too", () => {
    const projRoot = makeTempDir("proj");
    const config = makeConfig(projRoot, "~/personal-fixture");
    const result = resolveKgPath(config, { scope: "user" }, projRoot);
    expect("path" in result && result.path).toBe(path.join(os.homedir(), "personal-fixture"));
  });

  it("re-resolves a merged graph against its survivor instead of erroring", () => {
    const oldRoot = makeTempDir("old");
    const newRoot = makeTempDir("new");
    const now = new Date().toISOString();
    const config: KgConfig = {
      version: "1.0.0",
      graphs: {
        proj: {
          name: "proj",
          path: oldRoot,
          type: "project-local",
          categories: [],
          createdAt: now,
          status: "archived",
          statusChangedAt: "2026-01-01T00:00:00.000Z",
          graphId: "proj-id",
          mergedInto: "newproj",
        },
        newproj: {
          name: "newproj",
          path: newRoot,
          type: "project-local",
          categories: [],
          createdAt: now,
          status: "active",
          statusChangedAt: now,
          graphId: "newproj-id",
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };

    const result = resolveKgPath(config, {}, oldRoot);
    expect(result).toEqual({ name: "newproj", path: newRoot });
  });

  it("errors on an ambiguous tie instead of picking one silently", () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "resolve-test-tie-"));
    tempDirs.push(parent);
    const now = new Date().toISOString();
    const config: KgConfig = {
      version: "1.0.0",
      graphs: {
        a: {
          name: "a",
          path: path.join(parent, "kgA"),
          type: "project-local",
          categories: [],
          createdAt: now,
          status: "active",
          statusChangedAt: now,
          graphId: "a-id",
        },
        b: {
          name: "b",
          path: path.join(parent, "kgB"),
          type: "project-local",
          categories: [],
          createdAt: now,
          status: "active",
          statusChangedAt: now,
          graphId: "b-id",
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };

    const result = resolveKgPath(config, {}, parent);
    expect("error" in result && result.error).toMatch(/Ambiguous/);
  });
});

// Mirrors sanitization.test.ts's "kg_check_sensitive scope:\"user\" gate" block --
// resolveKgPath itself has no gating, so the registered tool's handler is what
// actually enforces confirmPersonalScopeAccess before scope:"user" resolves.
describe('kg_resolve scope:"user" gate', () => {
  async function getHandler(session = new PersonalScopeSession()) {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    let handler: any;
    jest.spyOn(server, "tool").mockImplementation((...args: any[]) => { handler = args[3]; return server as any; });
    registerResolveTool(server, session);
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

  it('scope:"user" resolves the personal graph once confirmPersonalScope:true is passed', async () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot, personalRoot));

    const handler = await getHandler();
    const result = await handler({ scope: "user", confirmPersonalScope: true });

    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual({ name: "personal", path: personalRoot });
  });

  it("project scope (default) needs no personal-scope confirmation", async () => {
    const projRoot = makeTempDir("proj");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot));

    const handler = await getHandler();
    const origCwd = process.cwd;
    process.cwd = () => projRoot;
    const result = await handler({});
    process.cwd = origCwd;

    expect(result.isError).toBeUndefined();
    expect(JSON.parse(result.content[0].text)).toEqual({ name: "proj", path: projRoot });
  });
});
