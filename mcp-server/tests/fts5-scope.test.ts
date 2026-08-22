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
import { handleFts5Status, handleFts5Rebuild, rebuildIndex } from "../src/tools/fts5.js";
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

// ---------------------------------------------------------------------------
// issue-55: kg_fts5_status must agree with kg_search / kg_fts5_rebuild about
// where a KG's index lives, must expand "~" independently of process.cwd(),
// and must keep its published "read-only ... never creates directories"
// contract while doing so.
// ---------------------------------------------------------------------------

describe("issue-55: handleFts5Status db_path contract", () => {
  it("reports the same db_path that rebuildIndex actually writes", async () => {
    const projRoot = makeTempDir("parity");
    for (const d of ["lessons-learned", "decisions", "sessions"]) {
      fs.mkdirSync(path.join(projRoot, d), { recursive: true });
    }
    fs.writeFileSync(
      path.join(projRoot, "lessons-learned", "a.md"),
      "# A\n\nparity content",
      "utf-8"
    );
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot));

    const rebuilt = rebuildIndex(projRoot, "proj", "project-local");

    const origCwd = process.cwd;
    process.cwd = () => projRoot;
    const result = await handleFts5Status({});
    process.cwd = origCwd;

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.db_path).toBe(rebuilt.db_path);
    expect(parsed.exists).toBe(true);
  });

  it("creates no directories when the index dir does not exist yet", async () => {
    const projRoot = makeTempDir("no-mkdir");
    (readConfig as jest.Mock).mockReturnValue(makeConfig(projRoot));

    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "fts5-status-nomkdir-"));
    tempDirs.push(sandbox);
    const virginIndexDir = path.join(sandbox, "index");
    expect(fs.existsSync(virginIndexDir)).toBe(false);

    const prev = process.env.KG_INDEX_DIR;
    process.env.KG_INDEX_DIR = virginIndexDir;
    const origCwd = process.cwd;
    process.cwd = () => projRoot;
    try {
      const result = await handleFts5Status({});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.exists).toBe(false);
      expect(parsed.db_path.startsWith(virginIndexDir)).toBe(true);
      // The whole point: status is read-only.
      expect(fs.existsSync(virginIndexDir)).toBe(false);
    } finally {
      process.cwd = origCwd;
      if (prev === undefined) delete process.env.KG_INDEX_DIR;
      else process.env.KG_INDEX_DIR = prev;
    }
  });

  it("resolves a ~-registered graph to the same db_path from any cwd, and agrees with rebuildIndex", async () => {
    // A graph registered with an unexpanded "~/..." path -- Opus review F2: the
    // handler used to reconstruct the db path from target.graph.path without
    // ever expanding it, so the value it reported could not match what
    // kg_search/kg_fts5_rebuild computed, and (via path.resolve's fallback)
    // could vary with the caller's cwd. The fixture lives under $HOME because
    // that is the only place a genuinely "~"-expressible path can live.
    const wrapper = fs.mkdtempSync(path.join(os.homedir(), ".kmgraph-issue55-"));
    tempDirs.push(wrapper);
    const kgRoot = path.join(wrapper, "kg");
    const nested = path.join(kgRoot, "lessons-learned");
    fs.mkdirSync(nested, { recursive: true });
    for (const d of ["decisions", "sessions"]) {
      fs.mkdirSync(path.join(kgRoot, d), { recursive: true });
    }
    fs.writeFileSync(path.join(nested, "a.md"), "# A\n\ntilde content", "utf-8");

    const tildePath = `~/${path.basename(wrapper)}/kg`;
    const config = makeConfig(kgRoot);
    config.graphs.proj.path = tildePath;
    (readConfig as jest.Mock).mockReturnValue(config);

    // The write side always sees the expanded absolute path.
    const rebuilt = rebuildIndex(kgRoot, "proj", "project-local");

    const origCwd = process.cwd;
    try {
      // Two genuinely different cwds that both still resolve to this graph.
      process.cwd = () => kgRoot;
      const fromRoot = JSON.parse((await handleFts5Status({})).content[0].text);
      process.cwd = () => nested;
      const fromNested = JSON.parse((await handleFts5Status({})).content[0].text);

      expect(fromRoot.db_path).toBeDefined();
      expect(fromRoot.db_path).not.toContain("~");
      expect(fromRoot.db_path).toBe(fromNested.db_path);
      // ...and it is the file kg_fts5_rebuild actually wrote.
      expect(fromRoot.db_path).toBe(rebuilt.db_path);
      expect(fromRoot.exists).toBe(true);
    } finally {
      process.cwd = origCwd;
    }
  });
});
