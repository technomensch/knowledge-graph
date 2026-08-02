import { handleConfigRemintId } from "../src/tools/config.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("kg_config_remint_id", () => {
  let home: string, kgPath: string, contentDir: string;
  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), "remint-home-"));
    process.env.KG_CONFIG_PATH = path.join(home, "kg-config.json");
    kgPath = fs.mkdtempSync(path.join(os.tmpdir(), "remint-kg-"));
    // graph.path IS the content root directly (Task 1.2/1.5 contract, findings doc #9
    // correction) — no "knowledge" subfolder. kgPath is already a real directory from
    // mkdtempSync, so no extra mkdirSync is needed.
    contentDir = kgPath;
    jest.resetModules();
  });
  afterEach(() => {
    delete process.env.KG_CONFIG_PATH;
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(kgPath, { recursive: true, force: true });
    jest.resetModules();
  });

  it("refuses without confirm: true", async () => {
    const { writeConfig, mintGraphId, writeGraphIdMarker } = require("../src/utils.js") as typeof import("../src/utils.js");
    const oldId = mintGraphId();
    writeGraphIdMarker(contentDir, oldId);
    writeConfig({
      version: "1.0.0",
      graphs: { forked: { name: "forked", path: kgPath, type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: oldId } },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });
    const { handleConfigRemintId } = require("../src/tools/config.js") as typeof import("../src/tools/config.js");
    const result = await handleConfigRemintId({ name: "forked", confirm: false });
    expect(result.isError).toBe(true);
    const { readGraphIdMarker } = require("../src/utils.js") as typeof import("../src/utils.js");
    expect(readGraphIdMarker(contentDir)).toBe(oldId); // unchanged
  });

  it("mints and writes a new id when confirmed, and updates the registry entry", async () => {
    const { writeConfig, mintGraphId, writeGraphIdMarker, readConfig } = require("../src/utils.js") as typeof import("../src/utils.js");
    const oldId = mintGraphId();
    writeGraphIdMarker(contentDir, oldId);
    writeConfig({
      version: "1.0.0",
      graphs: { forked: { name: "forked", path: kgPath, type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: oldId } },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });
    const { handleConfigRemintId } = require("../src/tools/config.js") as typeof import("../src/tools/config.js");
    const result = await handleConfigRemintId({ name: "forked", confirm: true });
    expect(result.isError).toBeFalsy();
    const { readGraphIdMarker } = require("../src/utils.js") as typeof import("../src/utils.js");
    const newId = readGraphIdMarker(contentDir);
    expect(newId).not.toBe(oldId);
    expect(readConfig().graphs.forked.graphId).toBe(newId);
  });
});
