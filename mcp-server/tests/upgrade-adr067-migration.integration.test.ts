import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ADR-067 Task 8.3: end-to-end proof that Tasks 8.1 (status-schema migration
// category) and 8.2 (cli.ts/kg_config_init dedup) actually compose. Unlike
// upgrade-adr067-migration.test.ts (Task 8.1's own unit tests, which cover
// the migration category in isolation with fine-grained assertions per
// scenario), this file drives the REAL handleUpgrade() end-to-end against a
// realistic pre-migration filesystem layout -- primary config with a
// top-level `active` key and graphs missing status/statusChangedAt/graphId,
// plus a leftover legacy ~/.claude/kg-config.json -- and then proves the
// migrated registry is actually usable afterward via a real resolveGraph()
// call, which the unit tests never exercise.

describe("handleUpgrade end-to-end migration (ADR-067 Task 8.3 integration)", () => {
  const ORIGINAL_ENV = process.env.KG_CONFIG_PATH;
  const ORIGINAL_HOME = process.env.HOME;
  const tempDirs: string[] = [];

  function makeTempDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `upgrade-e2e-${prefix}-`));
    tempDirs.push(dir);
    return dir;
  }

  function scaffoldKg(root: string): void {
    for (const dir of ["templates", "lessons-learned", "decisions", "sessions", "chat-history", "tmp"]) {
      fs.mkdirSync(path.join(root, dir), { recursive: true });
    }
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

  // Loads handleUpgrade fresh with os.homedir() mocked to `home`, matching
  // upgrade-legacy-config.integration.test.ts's and
  // upgrade-adr067-migration.test.ts's pattern: CONFIG_PATH is a
  // module-load-time constant derived from os.homedir(), so it must be
  // mocked before the module is first required in each test.
  function loadHandleUpgrade(home: string): typeof import("../src/tools/upgrade.js") {
    jest.resetModules();
    jest.doMock("os", () => ({ ...jest.requireActual("os"), homedir: () => home }));
    const mod = require("../src/tools/upgrade.js") as typeof import("../src/tools/upgrade.js");
    jest.dontMock("os");
    return mod;
  }

  function oldSchemaConfig(kgRoot: string, graphName: string) {
    return {
      version: "1.0.0",
      active: graphName,
      graphs: {
        [graphName]: {
          name: graphName,
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

  it("migrates a realistic pre-migration layout end-to-end and leaves the registry resolvable via resolveGraph", async () => {
    const home = makeTempDir("home");
    const kgRoot = makeTempDir("kg");
    scaffoldKg(kgRoot);
    const graphName = "my-project-kg";

    delete process.env.KG_CONFIG_PATH;
    process.env.HOME = home;

    // Realistic pre-migration primary config: top-level `active` key,
    // graph entries missing status/statusChangedAt/graphId (pre-ADR-067
    // schema, as if forwarded unchanged from a legacy read per findings
    // doc #5 in utils.ts readConfig()).
    const primaryDir = path.join(home, ".kmgraph");
    fs.mkdirSync(primaryDir, { recursive: true });
    const primaryConfigPath = path.join(primaryDir, "kg-config.json");
    fs.writeFileSync(primaryConfigPath, JSON.stringify(oldSchemaConfig(kgRoot, graphName)), "utf-8");

    // Leftover legacy file, still physically present (the pre-v0.6 location).
    const legacyDir = path.join(home, ".claude");
    fs.mkdirSync(legacyDir, { recursive: true });
    const legacyConfigPath = path.join(legacyDir, "kg-config.json");
    fs.writeFileSync(legacyConfigPath, JSON.stringify(oldSchemaConfig(kgRoot, graphName)), "utf-8");

    const { handleUpgrade } = loadHandleUpgrade(home);

    // Step A: inspect-only run detects the migration is needed (sanity
    // check that the real, unmocked category detection fires on this
    // realistic layout before we drive the destructive path).
    const inspectResult = await handleUpgrade({});
    expect(inspectResult.isError).toBeUndefined();
    const inspectParsed = JSON.parse(inspectResult.content[0].text);
    const inspectItem = inspectParsed.upgrades.find((u: { category: string }) => u.category === "status-schema");
    expect(inspectItem).toBeDefined();

    // Step B: apply without confirmMigration:true must refuse (consent
    // gate), but still perform the unconditional backup of both files
    // before any destructive step -- proven here end-to-end rather than
    // trusted from the unit test alone.
    const refused = await handleUpgrade({ apply: ["status-schema"] });
    expect(refused.isError).toBe(true);
    expect(refused.content[0].text).toMatch(/KMG_INPUT_REQUIRED/);
    expect(refused.content[0].text).toMatch(/confirmMigration/);

    const backupDir = path.join(primaryDir, "backups");
    expect(fs.existsSync(backupDir)).toBe(true);
    const backupsAfterRefusal = fs.readdirSync(backupDir);
    expect(backupsAfterRefusal.some((f) => f.includes("legacy"))).toBe(true);
    expect(backupsAfterRefusal.some((f) => !f.includes("legacy"))).toBe(true);

    // Neither file touched yet -- refusal must be a true no-op besides the backup.
    expect(fs.existsSync(legacyConfigPath)).toBe(true);
    const stillOldPrimary = JSON.parse(fs.readFileSync(primaryConfigPath, "utf-8"));
    expect(stillOldPrimary.active).toBe(graphName);

    // Step C: real migration, end-to-end, with consent given.
    const migrateResult = await handleUpgrade({ apply: ["status-schema"], confirmMigration: true });
    expect(migrateResult.isError).toBeUndefined();

    // Both backups exist (unconditional backup step, taken before the
    // destructive migration/deletion below -- re-verified post-migration
    // since the migration step could in principle have pruned them).
    expect(fs.existsSync(backupDir)).toBe(true);
    const backupsAfterMigration = fs.readdirSync(backupDir);
    expect(backupsAfterMigration.some((f) => f.includes("legacy"))).toBe(true);
    expect(backupsAfterMigration.some((f) => !f.includes("legacy"))).toBe(true);

    // Legacy file retired.
    expect(fs.existsSync(legacyConfigPath)).toBe(false);

    // Primary config: every graph now has status/statusChangedAt/graphId,
    // and the top-level `active` key is gone.
    const migrated = JSON.parse(fs.readFileSync(primaryConfigPath, "utf-8")) as {
      active?: string;
      graphs: Record<string, { status?: string; statusChangedAt?: string; graphId?: string; path: string }>;
    };
    expect(migrated.active).toBeUndefined();
    const allGraphs = Object.values(migrated.graphs);
    expect(allGraphs.length).toBeGreaterThan(0);
    for (const graph of allGraphs) {
      expect(typeof graph.graphId).toBe("string");
      expect((graph.graphId as string).length).toBeGreaterThan(0);
      expect(graph.status).toBe("active");
      expect(typeof graph.statusChangedAt).toBe("string");
    }

    // Step D: prove the migrated registry is actually usable -- a
    // subsequent resolveGraph() call against a cwd inside the migrated
    // graph's path resolves to that graph. This is the assertion the
    // Task 8.1 unit tests never make: they check the config's on-disk
    // shape, not that resolution.ts can actually consume it.
    const { resolveGraph } = require("../src/resolution.js") as typeof import("../src/resolution.js");
    const { readConfig } = require("../src/utils.js") as typeof import("../src/utils.js");

    // readConfig() re-derives CONFIG_PATH from a fresh os.homedir() call at
    // module-load time; since handleUpgrade was loaded with os.homedir()
    // mocked to `home` in this same jest.resetModules() epoch, requiring
    // utils.js right after (before any further resetModules()) picks up
    // the same mock and reads the just-migrated primary config file.
    const postMigrationConfig = readConfig();
    // resolveGraph's no-name path matches cwd against dirname(graph.path)
    // (the project root one level above the KG content directory), so a
    // cwd equal to (or inside) kgRoot itself resolves via isAncestorOrEqual.
    const resolution = resolveGraph(postMigrationConfig, kgRoot);
    expect(resolution.kind).toBe("resolved");
    if (resolution.kind === "resolved") {
      expect(resolution.name).toBe(graphName);
      expect(resolution.graph.status).toBe("active");
      expect(typeof resolution.graph.graphId).toBe("string");
    }
  });
});
