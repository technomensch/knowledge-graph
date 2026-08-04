import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { performRegistryMerge as PerformRegistryMerge } from "../src/tools/config.js";
import type { KgConfig } from "../src/utils.js";

describe("performRegistryMerge", () => {
  let home: string;
  let performRegistryMerge: typeof PerformRegistryMerge;
  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), "merge-"));
    process.env.KG_CONFIG_PATH = path.join(home, "kg-config.json");
    // CONFIG_PATH in utils.ts is a module-level const captured at import
    // time from process.env.KG_CONFIG_PATH -- a static top-of-file import
    // here would bind it to the default (real homedir) path before this
    // beforeEach runs. jest.resetModules() + require() forces a fresh
    // read of the env var per test, matching the pattern already used in
    // config-duplicate-graph-id.test.ts for the same reason.
    jest.resetModules();
    performRegistryMerge = (require("../src/tools/config.js") as typeof import("../src/tools/config.js")).performRegistryMerge;
  });
  afterEach(() => {
    delete process.env.KG_CONFIG_PATH;
    fs.rmSync(home, { recursive: true, force: true });
    jest.resetModules();
  });

  function baseConfig(): KgConfig {
    return {
      version: "1.0.0",
      graphs: {
        losing: { name: "losing", path: "/l", type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: "id-1" },
        survivor: { name: "survivor", path: "/s", type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: "id-1" },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
  }

  it("always writes a backup, even with skipReview: true", () => {
    fs.writeFileSync(process.env.KG_CONFIG_PATH!, JSON.stringify(baseConfig(), null, 2));
    const { backupPath } = performRegistryMerge(baseConfig(), "losing", "survivor", { skipReview: true });
    expect(fs.existsSync(backupPath)).toBe(true);
  });

  it("archives the losing entry with mergedInto set to the survivor when skipReview is true", () => {
    fs.writeFileSync(process.env.KG_CONFIG_PATH!, JSON.stringify(baseConfig(), null, 2));
    const { config } = performRegistryMerge(baseConfig(), "losing", "survivor", { skipReview: true });
    expect(config.graphs.losing.status).toBe("archived");
    expect(config.graphs.losing.mergedInto).toBe("survivor");
  });

  it("leaves the survivor entry untouched", () => {
    fs.writeFileSync(process.env.KG_CONFIG_PATH!, JSON.stringify(baseConfig(), null, 2));
    const { config } = performRegistryMerge(baseConfig(), "losing", "survivor", { skipReview: true });
    expect(config.graphs.survivor.status).toBe("active");
  });

  it("without skipReview, returns a preview and does NOT apply the merge (findings doc #10)", () => {
    fs.writeFileSync(process.env.KG_CONFIG_PATH!, JSON.stringify(baseConfig(), null, 2));
    const { config, preview } = performRegistryMerge(baseConfig(), "losing", "survivor", {});
    expect(preview).toBeDefined();
    expect(preview!.willSetMergedInto).toBe("survivor");
    // Not applied — the returned config is unchanged, losing is still active.
    expect(config.graphs.losing.status).toBe("active");
    expect(config.graphs.losing.mergedInto).toBeUndefined();
  });

  it("backup reflects the actual on-disk bytes, not the in-memory config argument (findings doc #10)", () => {
    const onDisk = baseConfig();
    onDisk.graphs.survivor.name = "on-disk-name"; // on-disk state differs from what we pass in below
    fs.writeFileSync(process.env.KG_CONFIG_PATH!, JSON.stringify(onDisk, null, 2));

    const staleInMemory = baseConfig(); // never saw the on-disk edit above
    const { backupPath } = performRegistryMerge(staleInMemory, "losing", "survivor", { skipReview: true });
    const backedUp = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
    expect(backedUp.graphs.survivor.name).toBe("on-disk-name"); // backup captured disk, not the stale in-memory object
  });
});
