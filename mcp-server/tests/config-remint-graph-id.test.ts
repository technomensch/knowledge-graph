import { handleConfigRemintId } from "../src/tools/config.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";

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

  // M-7 (1): the gitignored-marker warning path was previously only implicitly
  // reachable -- assert the warning text actually appears when isMarkerTracked
  // returns false.
  it("warns when the remarker file is gitignored", async () => {
    const { writeConfig, mintGraphId, writeGraphIdMarker } = require("../src/utils.js") as typeof import("../src/utils.js");
    execSync("git init -q", { cwd: contentDir });
    fs.writeFileSync(path.join(contentDir, ".gitignore"), ".kmgraph-id\n");
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
    expect(result.content[0].text).toMatch(/gitignored/);
  });

  // M-7 (2) / I-5: a nonexistent graph.path must return a structured isError
  // response, not throw an unhandled ENOENT out of the tool handler.
  it("returns a structured error when graph.path no longer exists", async () => {
    const { writeConfig, mintGraphId, writeGraphIdMarker, readConfig } = require("../src/utils.js") as typeof import("../src/utils.js");
    const oldId = mintGraphId();
    writeGraphIdMarker(contentDir, oldId);
    writeConfig({
      version: "1.0.0",
      graphs: { forked: { name: "forked", path: kgPath, type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: oldId } },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });
    fs.rmSync(kgPath, { recursive: true, force: true });
    const { handleConfigRemintId } = require("../src/tools/config.js") as typeof import("../src/tools/config.js");
    const result = await handleConfigRemintId({ name: "forked", confirm: true });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/not found/i);
    expect(readConfig().graphs.forked.graphId).toBe(oldId); // registry untouched
    fs.mkdirSync(kgPath, { recursive: true }); // afterEach expects it to exist
  });

  // I-5 ordering: if updateConfig throws (merge conflict exhausted), the
  // marker must be left unminted -- registry-first ordering means a failed
  // registry write never reaches remintGraphIdMarker.
  it("leaves the marker unminted when updateConfig throws", async () => {
    const utilsMod = require("../src/utils.js") as typeof import("../src/utils.js");
    const { writeConfig, mintGraphId, writeGraphIdMarker, readGraphIdMarker } = utilsMod;
    const oldId = mintGraphId();
    writeGraphIdMarker(contentDir, oldId);
    writeConfig({
      version: "1.0.0",
      graphs: { forked: { name: "forked", path: kgPath, type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: oldId } },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });
    jest.spyOn(utilsMod, "updateConfig").mockImplementation(() => {
      throw new Error("updateConfig: could not merge changes after 3 attempts");
    });
    const { handleConfigRemintId } = require("../src/tools/config.js") as typeof import("../src/tools/config.js");
    await expect(handleConfigRemintId({ name: "forked", confirm: true })).rejects.toThrow();
    expect(readGraphIdMarker(contentDir)).toBe(oldId); // unchanged -- marker write never reached
  });
});
