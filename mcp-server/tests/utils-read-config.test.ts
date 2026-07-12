import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// readConfig() must read the new ~/.kmgraph path first, then fall back (read-only)
// to the legacy ~/.claude/kg-config.json path, and only return DEFAULT_CONFIG when
// neither exists. These tests drive CONFIG_PATH via KG_CONFIG_PATH (baked at module
// load) and the legacy path via $HOME, re-requiring utils fresh each time so no real
// dev-machine config leaks in.

describe("readConfig legacy fallback", () => {
  const ORIGINAL_ENV = process.env.KG_CONFIG_PATH;
  const ORIGINAL_HOME = process.env.HOME;
  const tempDirs: string[] = [];

  function makeTempDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `read-config-${prefix}-`));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.KG_CONFIG_PATH;
    else process.env.KG_CONFIG_PATH = ORIGINAL_ENV;
    if (ORIGINAL_HOME === undefined) delete process.env.HOME;
    else process.env.HOME = ORIGINAL_HOME;
    for (const dir of tempDirs) {
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
    tempDirs.length = 0;
    jest.resetModules();
  });

  function loadReadConfig(newPath: string, home: string) {
    process.env.KG_CONFIG_PATH = newPath; // becomes CONFIG_PATH at module load
    process.env.HOME = home;              // legacy path derives from this
    jest.resetModules();
    return require("../src/utils.js") as typeof import("../src/utils.js");
  }

  it("returns the legacy ~/.claude config when only the legacy path exists (the bug)", () => {
    const home = makeTempDir("home");
    const newPath = path.join(makeTempDir("newloc"), "kg-config.json"); // does NOT exist
    const legacyDir = path.join(home, ".claude");
    fs.mkdirSync(legacyDir, { recursive: true });
    const legacyConfig = {
      version: "1.0.0",
      active: "legacy-kg",
      graphs: {
        "legacy-kg": {
          name: "legacy-kg",
          path: "/some/kg/path",
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    fs.writeFileSync(path.join(legacyDir, "kg-config.json"), JSON.stringify(legacyConfig), "utf-8");

    const { readConfig } = loadReadConfig(newPath, home);
    const cfg = readConfig();

    expect(cfg.active).toBe("legacy-kg");
    expect(cfg.graphs["legacy-kg"]).toBeDefined();
  });

  it("returns the new-path config when it exists (legacy ignored)", () => {
    const home = makeTempDir("home");
    const newDir = makeTempDir("newloc");
    const newPath = path.join(newDir, "kg-config.json");
    fs.writeFileSync(newPath, JSON.stringify({
      version: "1.0.0", active: "new-kg", graphs: { "new-kg": {} },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    }), "utf-8");
    // Also write a legacy file that should be ignored
    const legacyDir = path.join(home, ".claude");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, "kg-config.json"), JSON.stringify({
      version: "1.0.0", active: "legacy-kg", graphs: {},
      sanitization: { enabled: false, patterns: [], action: "warn" },
    }), "utf-8");

    const { readConfig } = loadReadConfig(newPath, home);
    expect(readConfig().active).toBe("new-kg");
  });

  it("returns DEFAULT_CONFIG (active: null) when neither path exists", () => {
    const home = makeTempDir("home"); // no .claude/kg-config.json inside
    const newPath = path.join(makeTempDir("newloc"), "kg-config.json"); // does NOT exist

    const { readConfig } = loadReadConfig(newPath, home);
    const cfg = readConfig();
    expect(cfg.active).toBeNull();
    expect(cfg.graphs).toEqual({});
  });
});
