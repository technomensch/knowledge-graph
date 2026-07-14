import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Integration tests for kg_config_switch with legacy config fallback.
// kg_config_switch calls readConfig() to find a graph, then writeConfig() to
// persist changes. These tests verify that the switch operation correctly:
// 1. Finds graphs in the legacy ~/.claude/kg-config.json when new path doesn't exist
// 2. Fails appropriately when KG_CONFIG_PATH is set to a nonexistent custom path
// 3. Always writes the updated config to the NEW path (lazy implicit migration)

describe("kg_config_switch with legacy config fallback", () => {
  const ORIGINAL_ENV = process.env.KG_CONFIG_PATH;
  const ORIGINAL_HOME = process.env.HOME;
  const tempDirs: string[] = [];

  function makeTempDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `config-switch-${prefix}-`));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.KG_CONFIG_PATH;
    else process.env.KG_CONFIG_PATH = ORIGINAL_ENV;
    if (ORIGINAL_HOME === undefined) delete process.env.HOME;
    else process.env.HOME = ORIGINAL_HOME;
    for (const dir of tempDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        /* best-effort */
      }
    }
    tempDirs.length = 0;
    jest.resetModules();
  });

  function loadUtilsDefaultPath(home: string) {
    // No KG_CONFIG_PATH override: CONFIG_PATH defaults to os.homedir()/.kmgraph/kg-config.json
    // and legacy path to $HOME/.claude/. Mock os.homedir() to the temp home.
    delete process.env.KG_CONFIG_PATH;
    process.env.HOME = home;
    jest.resetModules();
    jest.doMock("os", () => ({
      ...jest.requireActual("os"),
      homedir: () => home,
    }));
    const utils = require("../src/utils.js") as typeof import("../src/utils.js");
    jest.dontMock("os");
    return utils;
  }

  function loadUtilsWithCustomPath(configPath: string, home: string) {
    // With KG_CONFIG_PATH override: CONFIG_PATH is set explicitly.
    // No legacy fallback when KG_CONFIG_PATH is set.
    process.env.KG_CONFIG_PATH = configPath;
    process.env.HOME = home;
    jest.resetModules();
    return require("../src/utils.js") as typeof import("../src/utils.js");
  }

  function loadConfigToolsDefaultPath(home: string) {
    // Same as loadUtilsDefaultPath, but also loads config.ts's real
    // handleConfigSwitch() under the same os.homedir() mock, so the two
    // modules resolve the same CONFIG_PATH.
    delete process.env.KG_CONFIG_PATH;
    process.env.HOME = home;
    jest.resetModules();
    jest.doMock("os", () => ({
      ...jest.requireActual("os"),
      homedir: () => home,
    }));
    const utils = require("../src/utils.js") as typeof import("../src/utils.js");
    const configTools = require("../src/tools/config.js") as typeof import("../src/tools/config.js");
    jest.dontMock("os");
    return { ...utils, handleConfigSwitch: configTools.handleConfigSwitch };
  }

  it("finds a graph registered only in legacy ~/.claude/kg-config.json when KG_CONFIG_PATH is unset", () => {
    const home = makeTempDir("home"); // ~/.kmgraph/kg-config.json does NOT exist
    const legacyDir = path.join(home, ".claude");
    fs.mkdirSync(legacyDir, { recursive: true });

    const legacyConfig = {
      version: "1.0.0",
      active: "legacy-kg",
      graphs: {
        "legacy-kg": {
          name: "legacy-kg",
          path: "/some/legacy/path",
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    fs.writeFileSync(
      path.join(legacyDir, "kg-config.json"),
      JSON.stringify(legacyConfig),
      "utf-8"
    );

    const { readConfig } = loadUtilsDefaultPath(home);
    const cfg = readConfig();

    // readConfig() should find and return the legacy config
    expect(cfg.active).toBe("legacy-kg");
    expect(cfg.graphs["legacy-kg"]).toBeDefined();
    expect(cfg.graphs["legacy-kg"].name).toBe("legacy-kg");
  });

  it("fails to find a graph when KG_CONFIG_PATH is set to nonexistent path, even if legacy exists", () => {
    // Explicit KG_CONFIG_PATH override means NO legacy fallback.
    // Missing custom path should NOT pull in unrelated legacy config.
    const home = makeTempDir("home");
    const customPath = path.join(makeTempDir("custom"), "kg-config.json"); // does NOT exist
    const legacyDir = path.join(home, ".claude");
    fs.mkdirSync(legacyDir, { recursive: true });

    // Write a legacy config that would match if fallback were applied
    fs.writeFileSync(
      path.join(legacyDir, "kg-config.json"),
      JSON.stringify({
        version: "1.0.0",
        active: "legacy-kg",
        graphs: {
          "legacy-kg": {
            name: "legacy-kg",
            path: "/some/legacy/path",
            type: "project-local",
            categories: [],
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
          },
        },
        sanitization: { enabled: false, patterns: [], action: "warn" },
      }),
      "utf-8"
    );

    const { readConfig } = loadUtilsWithCustomPath(customPath, home);
    const cfg = readConfig();

    // readConfig() must NOT fall back to legacy config when KG_CONFIG_PATH is set
    expect(cfg.active).toBeNull();
    expect(cfg.graphs).toEqual({});
  });

  it("writes the updated config to the NEW path after switching via legacy fallback", () => {
    // Scenario: user has only legacy config, switches to a graph, config is written to new path.
    // This verifies the "lazy implicit migration on first write" behavior.
    const home = makeTempDir("home");
    const legacyDir = path.join(home, ".claude");
    fs.mkdirSync(legacyDir, { recursive: true });

    // Create legacy config with two graphs
    const legacyConfig = {
      version: "1.0.0",
      active: "graph-a",
      graphs: {
        "graph-a": {
          name: "graph-a",
          path: "/path/a",
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        },
        "graph-b": {
          name: "graph-b",
          path: "/path/b",
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    fs.writeFileSync(
      path.join(legacyDir, "kg-config.json"),
      JSON.stringify(legacyConfig),
      "utf-8"
    );

    const { readConfig, handleConfigSwitch } = loadConfigToolsDefaultPath(home);

    // Step 1: readConfig() finds the legacy config
    const cfgBefore = readConfig();
    expect(cfgBefore.active).toBe("graph-a");
    expect(cfgBefore.graphs["graph-a"]).toBeDefined();
    expect(cfgBefore.graphs["graph-b"]).toBeDefined();

    // Step 2: Call the REAL kg_config_switch handler (not a reimplementation)
    const result = handleConfigSwitch({ name: "graph-b" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Switched from 'graph-a' to 'graph-b'");

    // Step 3: Verify the new path file exists and contains the updated config,
    // written by the real handler's writeConfig() call.
    const newConfigDir = path.join(home, ".kmgraph");
    const newConfigPath = path.join(newConfigDir, "kg-config.json");
    expect(fs.existsSync(newConfigPath)).toBe(true);

    const writtenConfig = JSON.parse(fs.readFileSync(newConfigPath, "utf-8"));
    expect(writtenConfig.active).toBe("graph-b");
    expect(writtenConfig.graphs["graph-a"]).toBeDefined();
    expect(writtenConfig.graphs["graph-b"]).toBeDefined();

    // Step 4: On next read, the new path is preferred
    jest.resetModules();
    jest.doMock("os", () => ({
      ...jest.requireActual("os"),
      homedir: () => home,
    }));
    const { readConfig: readConfigAgain } = require("../src/utils.js") as typeof import("../src/utils.js");
    jest.dontMock("os");

    const cfgAfterRead = readConfigAgain();
    expect(cfgAfterRead.active).toBe("graph-b");
    expect(cfgAfterRead.graphs["graph-b"]).toBeDefined();
  });

  it("correctly handles graph not found error (no legacy or new config)", () => {
    const home = makeTempDir("home"); // no .claude/kg-config.json, no .kmgraph/kg-config.json
    const { readConfig } = loadUtilsDefaultPath(home);

    const cfg = readConfig();
    // Should return DEFAULT_CONFIG with empty graphs
    expect(cfg.active).toBeNull();
    expect(cfg.graphs).toEqual({});
  });

  it("real handleConfigSwitch() returns an error when the target graph doesn't exist", () => {
    const home = makeTempDir("home");
    const legacyDir = path.join(home, ".claude");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(
      path.join(legacyDir, "kg-config.json"),
      JSON.stringify({
        version: "1.0.0",
        active: "graph-a",
        graphs: {
          "graph-a": {
            name: "graph-a",
            path: "/path/a",
            type: "project-local",
            categories: [],
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
          },
        },
        sanitization: { enabled: false, patterns: [], action: "warn" },
      }),
      "utf-8"
    );

    const { handleConfigSwitch } = loadConfigToolsDefaultPath(home);

    const result = handleConfigSwitch({ name: "nonexistent-graph" });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("not found");
    expect(result.content[0].text).toContain("graph-a");

    // Config must be unchanged — no write should have occurred on the error path.
    const newConfigPath = path.join(home, ".kmgraph", "kg-config.json");
    expect(fs.existsSync(newConfigPath)).toBe(false);
  });
});
