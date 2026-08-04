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

describe("handleFts5Status", () => {
  it("resolves the target graph via cwd when scope is omitted", async () => {
    const projRoot = makeTempDir("proj");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot));
    const origCwd = process.cwd;
    process.cwd = () => projRoot;

    const result = await handleFts5Status({});
    process.cwd = origCwd;

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.kgType).toBe("project-local");
  });

  // ADR-067 Task 6.4: scope:"user" now routes through confirmPersonalScopeAccess --
  // confirmPersonalScope:true is required here since this test runs in automated mode.
  it("resolves the personal graph when scope=user", async () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot, personalRoot));

    const result = await handleFts5Status({ scope: "user", confirmPersonalScope: true });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.kgType).toBe("personal");
  });

  it("returns exists:false with an error when nothing resolves", async () => {
    const projRoot = makeTempDir("proj-registered");
    const unrelatedDir = makeTempDir("unrelated-cwd");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot));
    const origCwd = process.cwd;
    process.cwd = () => unrelatedDir;

    const result = await handleFts5Status({});
    process.cwd = origCwd;

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.exists).toBe(false);
    expect(parsed.error).toBeDefined();
  });

  it("scope:\"user\" from an unconfirmed repo in automated mode returns KMG_INPUT_REQUIRED/personal_scope_unseen_repo", async () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot, personalRoot));

    const result = await handleFts5Status({ scope: "user" });
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toMatchObject({ error: "KMG_INPUT_REQUIRED", reason: "personal_scope_unseen_repo" });
  });
});

describe("handleFts5Rebuild", () => {
  it("returns a plain error when scope=user has no personal graph registered", async () => {
    const projRoot = makeTempDir("proj");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot));

    const result = await handleFts5Rebuild({ scope: "user" });
    expect(result.isError).toBe(true);
  });

  // ADR-067 Task 6.4: scope:"user" now routes through confirmPersonalScopeAccess --
  // confirmPersonalScope:true is required here since this test runs in automated mode.
  it("marks the actually-rebuilt graph's fts5 flag, not config.active (findings doc #3 rewrite)", async () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    for (const d of ["lessons-learned", "decisions", "sessions"]) {
      fs.mkdirSync(path.join(personalRoot, d), { recursive: true });
    }
    const config = makeConfig(projRoot, personalRoot);
    (readConfig as jest.Mock).mockReturnValue(config);

    await handleFts5Rebuild({ scope: "user", confirmPersonalScope: true });

    expect(writeConfig).toHaveBeenCalled();
    const written = (writeConfig as jest.Mock).mock.calls[0][0] as KgConfig;
    expect((written.graphs.personal as unknown as Record<string, unknown>).fts5).toBe(true);
    expect((written.graphs.proj as unknown as Record<string, unknown>).fts5).toBeUndefined();
  });

  it("scope:\"user\" from an unconfirmed repo in automated mode returns KMG_INPUT_REQUIRED/personal_scope_unseen_repo", async () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot, personalRoot));

    const result = await handleFts5Rebuild({ scope: "user" });
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toMatchObject({ error: "KMG_INPUT_REQUIRED", reason: "personal_scope_unseen_repo" });
  });

  // ADR-067 sweep (fable review): a raw kgPath param previously bypassed the
  // scope:"user" gate entirely -- it resolved resolvedPath/resolvedName from the
  // literal path and went straight to rebuildIndex() with zero confirmation, even
  // when that literal path pointed at the registered personal graph. This is the
  // same bug class already closed in compare.ts (`a`/`b`) and sanitization.ts
  // (`kgPath`).
  it("a kgPath pointing directly at a registered personal-type graph requires confirmation in automated mode", async () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot, personalRoot));

    const result = await handleFts5Rebuild({ kgPath: personalRoot });
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toMatchObject({ error: "KMG_INPUT_REQUIRED", reason: "personal_scope_unseen_repo" });
  });

  // Containment, not just equality: a kgPath nested inside the personal graph's
  // registered root still exposes that graph's content and must be gated the
  // same as the root itself (mirrors compare.ts's containment test).
  it("a kgPath nested inside a registered personal-type graph requires confirmation in automated mode", async () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    const nested = path.join(personalRoot, "lessons-learned");
    fs.mkdirSync(nested, { recursive: true });
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot, personalRoot));

    const result = await handleFts5Rebuild({ kgPath: nested });
    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toMatchObject({ error: "KMG_INPUT_REQUIRED", reason: "personal_scope_unseen_repo" });
  });

  it("a kgPath pointing at a registered personal-type graph proceeds once confirmPersonalScope is true", async () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    for (const d of ["lessons-learned", "decisions", "sessions"]) {
      fs.mkdirSync(path.join(personalRoot, d), { recursive: true });
    }
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot, personalRoot));

    const result = await handleFts5Rebuild({ kgPath: personalRoot, confirmPersonalScope: true });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.db_path).toBeDefined();
  });

  it("a kgPath pointing at a non-personal (project-local) graph is not gated", async () => {
    const projRoot = makeTempDir("proj");
    const personalRoot = makeTempDir("personal");
    for (const d of ["lessons-learned", "decisions", "sessions"]) {
      fs.mkdirSync(path.join(projRoot, d), { recursive: true });
    }
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot, personalRoot));

    const result = await handleFts5Rebuild({ kgPath: projRoot });
    expect(result.isError).toBeUndefined();
  });
});
