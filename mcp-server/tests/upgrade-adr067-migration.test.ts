import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ADR-067 Task 8.1: the "status-schema" upgrade category reconciles a
// registry still shaped with the pre-ADR-067 schema (top-level `active`
// key, graph entries missing status/statusChangedAt/graphId) into the
// current schema, and retires the leftover legacy ~/.claude/kg-config.json
// file. This file deliberately does NOT mock ../src/utils.js (like
// upgrade-legacy-config.integration.test.ts) because detection has to key
// off real bytes on disk -- both the primary config file's raw JSON shape
// and the legacy file's continued physical existence.

describe("handleUpgrade status-schema migration category (ADR-067 Task 8.1)", () => {
  const ORIGINAL_ENV = process.env.KG_CONFIG_PATH;
  const ORIGINAL_HOME = process.env.HOME;
  const tempDirs: string[] = [];

  function makeTempDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `upgrade-adr067-${prefix}-`));
    tempDirs.push(dir);
    return dir;
  }

  function scaffoldKg(root: string): void {
    for (const dir of ["templates", "lessons-learned", "decisions", "sessions", "chat-history", "tmp"]) {
      fs.mkdirSync(path.join(root, dir), { recursive: true });
    }
  }

  function oldSchemaConfig(kgRoot: string) {
    return {
      version: "1.0.0",
      active: "legacy-kg",
      graphs: {
        "legacy-kg": {
          name: "legacy-kg",
          path: kgRoot,
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          platforms: [],
          autoSwitch: false,
          notification: "none",
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
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

  // Loads handleUpgrade fresh with os.homedir() mocked to `home`, matching
  // upgrade-legacy-config.integration.test.ts's pattern: CONFIG_PATH is a
  // module-load-time constant derived from os.homedir(), so it must be
  // mocked before the module is first required in each test.
  function loadHandleUpgrade(home: string): typeof import("../src/tools/upgrade.js") {
    jest.resetModules();
    jest.doMock("os", () => ({ ...jest.requireActual("os"), homedir: () => home }));
    const mod = require("../src/tools/upgrade.js") as typeof import("../src/tools/upgrade.js");
    jest.dontMock("os");
    return mod;
  }

  it("detects an old-schema registry and a leftover legacy file as needing migration", async () => {
    const home = makeTempDir("home");
    const kgRoot = makeTempDir("kg");
    scaffoldKg(kgRoot);
    delete process.env.KG_CONFIG_PATH;
    process.env.HOME = home;

    // Primary config already has the old schema (as if forwarded by Task 2.2).
    const primaryDir = path.join(home, ".kmgraph");
    fs.mkdirSync(primaryDir, { recursive: true });
    fs.writeFileSync(path.join(primaryDir, "kg-config.json"), JSON.stringify(oldSchemaConfig(kgRoot)), "utf-8");

    // Leftover legacy file still physically present too.
    const legacyDir = path.join(home, ".claude");
    fs.mkdirSync(legacyDir, { recursive: true });
    fs.writeFileSync(path.join(legacyDir, "kg-config.json"), JSON.stringify(oldSchemaConfig(kgRoot)), "utf-8");

    const { handleUpgrade } = loadHandleUpgrade(home);
    const result = await handleUpgrade({});

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    const item = parsed.upgrades.find((u: { category: string }) => u.category === "status-schema");
    expect(item).toBeDefined();
    expect(item.description).toMatch(/active/);
    expect(item.description).toMatch(/legacy/);
  });

  it("does not flag anything once every graph already has status/statusChangedAt/graphId and no legacy file exists", async () => {
    const home = makeTempDir("home");
    const kgRoot = makeTempDir("kg");
    scaffoldKg(kgRoot);
    delete process.env.KG_CONFIG_PATH;
    process.env.HOME = home;

    const primaryDir = path.join(home, ".kmgraph");
    fs.mkdirSync(primaryDir, { recursive: true });
    fs.writeFileSync(
      path.join(primaryDir, "kg-config.json"),
      JSON.stringify({
        version: "1.0.0",
        graphs: {
          "current-kg": {
            name: "current-kg",
            path: kgRoot,
            type: "project-local",
            categories: [],
            createdAt: new Date().toISOString(),
            status: "active",
            statusChangedAt: new Date().toISOString(),
            graphId: "already-migrated-id",
            platforms: [],
            autoSwitch: false,
            notification: "none",
          },
        },
        sanitization: { enabled: false, patterns: [], action: "warn" },
      }),
      "utf-8"
    );

    const { handleUpgrade } = loadHandleUpgrade(home);
    const result = await handleUpgrade({});

    const parsed = JSON.parse(result.content[0].text);
    const item = parsed.upgrades.find((u: { category: string }) => u.category === "status-schema");
    expect(item).toBeUndefined();
  });

  it("automated mode without confirmMigration:true refuses with KMG_INPUT_REQUIRED, but still writes a backup of both files", async () => {
    const home = makeTempDir("home");
    const kgRoot = makeTempDir("kg");
    scaffoldKg(kgRoot);
    delete process.env.KG_CONFIG_PATH;
    process.env.HOME = home;

    const primaryDir = path.join(home, ".kmgraph");
    fs.mkdirSync(primaryDir, { recursive: true });
    const primaryConfigPath = path.join(primaryDir, "kg-config.json");
    fs.writeFileSync(primaryConfigPath, JSON.stringify(oldSchemaConfig(kgRoot)), "utf-8");

    const legacyDir = path.join(home, ".claude");
    fs.mkdirSync(legacyDir, { recursive: true });
    const legacyConfigPath = path.join(legacyDir, "kg-config.json");
    fs.writeFileSync(legacyConfigPath, JSON.stringify(oldSchemaConfig(kgRoot)), "utf-8");

    const { handleUpgrade } = loadHandleUpgrade(home);
    const result = await handleUpgrade({ apply: ["status-schema"] });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/KMG_INPUT_REQUIRED/);
    expect(result.content[0].text).toMatch(/confirmMigration/);

    // Refused: neither file touched yet.
    expect(fs.existsSync(legacyConfigPath)).toBe(true);
    const stillOldPrimary = JSON.parse(fs.readFileSync(primaryConfigPath, "utf-8"));
    expect(stillOldPrimary.active).toBe("legacy-kg");

    // Backup step precedes the consent gate -- both files must already be backed up.
    const backupDir = path.join(primaryDir, "backups");
    expect(fs.existsSync(backupDir)).toBe(true);
    const backups = fs.readdirSync(backupDir);
    expect(backups.some((f) => f.includes("legacy"))).toBe(true);
    expect(backups.some((f) => !f.includes("legacy"))).toBe(true);
  });

  it("apply with confirmMigration:true migrates every graph to the new schema and deletes the legacy file", async () => {
    const home = makeTempDir("home");
    const kgRoot = makeTempDir("kg");
    scaffoldKg(kgRoot);
    delete process.env.KG_CONFIG_PATH;
    process.env.HOME = home;

    const primaryDir = path.join(home, ".kmgraph");
    fs.mkdirSync(primaryDir, { recursive: true });
    const primaryConfigPath = path.join(primaryDir, "kg-config.json");
    fs.writeFileSync(primaryConfigPath, JSON.stringify(oldSchemaConfig(kgRoot)), "utf-8");

    const legacyDir = path.join(home, ".claude");
    fs.mkdirSync(legacyDir, { recursive: true });
    const legacyConfigPath = path.join(legacyDir, "kg-config.json");
    fs.writeFileSync(legacyConfigPath, JSON.stringify(oldSchemaConfig(kgRoot)), "utf-8");

    const { handleUpgrade } = loadHandleUpgrade(home);
    const result = await handleUpgrade({ apply: ["status-schema"], confirmMigration: true });

    expect(result.isError).toBeUndefined();

    // Legacy retirement (destructive step, this task's own).
    expect(fs.existsSync(legacyConfigPath)).toBe(false);

    // Schema migration on the primary file.
    const migrated = JSON.parse(fs.readFileSync(primaryConfigPath, "utf-8"));
    expect(migrated.active).toBeUndefined();
    const graph = migrated.graphs["legacy-kg"];
    expect(graph.status).toBe("active");
    expect(typeof graph.statusChangedAt).toBe("string");
    expect(typeof graph.graphId).toBe("string");
    expect(graph.graphId.length).toBeGreaterThan(0);

    // A fresh graphId marker was minted for the graph (Task 1.2 interfaces).
    const markerPath = path.join(kgRoot, ".kmgraph-id");
    expect(fs.existsSync(markerPath)).toBe(true);
    expect(fs.readFileSync(markerPath, "utf-8").trim()).toBe(graph.graphId);

    // Backup still present from the earlier (unconditional) backup step.
    const backupDir = path.join(primaryDir, "backups");
    expect(fs.existsSync(backupDir)).toBe(true);
    expect(fs.readdirSync(backupDir).length).toBeGreaterThan(0);
  });

  it("does not silently activate a graph with an unreachable path; surfaces it in the result instead", async () => {
    const home = makeTempDir("home");
    const kgRoot = makeTempDir("kg"); // healthy graph
    scaffoldKg(kgRoot);
    const orphanParent = makeTempDir("orphan-parent"); // parent exists, content dir does not
    const orphanPath = path.join(orphanParent, "does-not-exist-kg");
    delete process.env.KG_CONFIG_PATH;
    process.env.HOME = home;

    const primaryDir = path.join(home, ".kmgraph");
    fs.mkdirSync(primaryDir, { recursive: true });
    const primaryConfigPath = path.join(primaryDir, "kg-config.json");
    const config = {
      version: "1.0.0",
      active: "legacy-kg",
      graphs: {
        "legacy-kg": {
          name: "legacy-kg",
          path: kgRoot,
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          platforms: [],
          autoSwitch: false,
          notification: "none",
        },
        "orphan-kg": {
          name: "orphan-kg",
          path: orphanPath,
          type: "project-local",
          categories: [],
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          platforms: [],
          autoSwitch: false,
          notification: "none",
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
    fs.writeFileSync(primaryConfigPath, JSON.stringify(config), "utf-8");

    const { handleUpgrade } = loadHandleUpgrade(home);
    const result = await handleUpgrade({ apply: ["status-schema"], confirmMigration: true });

    expect(result.isError).toBeUndefined();

    const migrated = JSON.parse(fs.readFileSync(primaryConfigPath, "utf-8"));

    // Healthy graph: activated as normal.
    expect(migrated.graphs["legacy-kg"].status).toBe("active");
    expect(typeof migrated.graphs["legacy-kg"].statusChangedAt).toBe("string");

    // Unreachable graph: NOT silently activated -- status left unset, a
    // path-health question for the user rather than an auto-decision.
    const orphan = migrated.graphs["orphan-kg"];
    expect(orphan.status).toBeUndefined();
    expect(orphan.statusChangedAt).toBeUndefined();
    // graphId minting is unconditional (Task 1.2 interfaces item), just no
    // marker file since there's no directory to write it into.
    expect(typeof orphan.graphId).toBe("string");
    expect(fs.existsSync(path.join(orphanPath, ".kmgraph-id"))).toBe(false);

    // Surfaced in the returned result text, not silently dropped.
    expect(result.content[0].text).toMatch(/orphan-kg/);
    expect(result.content[0].text).toMatch(/content-missing|parent-unreachable|path-missing/);
    expect(result.content[0].text).toMatch(/[Nn]eeds attention/);

    // Since it's still unmigrated, a follow-up inspect must keep flagging it.
    const inspectResult = await handleUpgrade({});
    const parsedInspect = JSON.parse(inspectResult.content[0].text);
    const item = parsedInspect.upgrades.find((u: { category: string }) => u.category === "status-schema");
    expect(item).toBeDefined();
    expect(item.description).toMatch(/orphan-kg/);
  });
});
