import { handleConfigInit } from "../src/tools/config.js"; // this task must export a directly-testable handler function, matching the existing handleConfigSwitch pattern in the same file
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

describe("kg_config_init duplicate graphId detection", () => {
  let home: string, existingKg: string, newKg: string;
  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), "dup-home-"));
    process.env.KG_CONFIG_PATH = path.join(home, "kg-config.json");
    existingKg = fs.mkdtempSync(path.join(os.tmpdir(), "existing-"));
    newKg = fs.mkdtempSync(path.join(os.tmpdir(), "new-"));
    jest.resetModules();
  });
  afterEach(() => {
    delete process.env.KG_CONFIG_PATH;
    fs.rmSync(home, { recursive: true, force: true });
    fs.rmSync(existingKg, { recursive: true, force: true });
    fs.rmSync(newKg, { recursive: true, force: true });
    jest.resetModules();
  });

  it("automated mode returns KMG_INPUT_REQUIRED with resolveWith.param=canonicalPath on duplicate graphId", async () => {
    const { writeConfig, mintGraphId, writeGraphIdMarker } = require("../src/utils.js") as typeof import("../src/utils.js");
    const id = mintGraphId();
    writeGraphIdMarker(existingKg, id);
    // divergent content so the four-way prompt actually fires (findings doc #20)
    fs.writeFileSync(path.join(existingKg, "only-in-existing.md"), "existing content");
    writeConfig({
      version: "1.0.0",
      graphs: { existing: { name: "existing", path: existingKg, type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: id } },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });
    writeGraphIdMarker(newKg, id); // simulates a clone that carried the marker
    fs.writeFileSync(path.join(newKg, "only-in-new.md"), "new content");

    const { handleConfigInit } = require("../src/tools/config.js") as typeof import("../src/tools/config.js");
    const result = await handleConfigInit({ name: "new-copy", kgPath: newKg, type: "project-local", categories: [], interaction: "automated" });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain("KMG_INPUT_REQUIRED");
    expect(JSON.stringify(result.content)).toContain("canonicalPath");
    const parsed = JSON.parse(result.content[0].text as string);
    expect(parsed.detail).toMatchObject({ existingName: "existing", existingContentDir: existingKg, newPath: newKg });
    expect(parsed.detail.suggestedAnswer).toBeDefined();
  });

  it("interactive mode with ask()='worktree' sets duplicateOf and performs no merge/archive", async () => {
    const { writeConfig, mintGraphId, writeGraphIdMarker, readConfig } = require("../src/utils.js") as typeof import("../src/utils.js");
    const id = mintGraphId();
    writeGraphIdMarker(existingKg, id);
    fs.writeFileSync(path.join(existingKg, "only-in-existing.md"), "existing content");
    writeConfig({
      version: "1.0.0",
      graphs: { existing: { name: "existing", path: existingKg, type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: id } },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });
    writeGraphIdMarker(newKg, id);
    fs.writeFileSync(path.join(newKg, "only-in-new.md"), "new content");

    const interactionModule = require("../src/interaction.js") as typeof import("../src/interaction.js");
    jest.spyOn(interactionModule, "resolveInteractionMode").mockReturnValue({ mode: "interactive" });
    jest.spyOn(interactionModule, "gate").mockResolvedValue({ answer: "worktree" });

    const { handleConfigInit } = require("../src/tools/config.js") as typeof import("../src/tools/config.js");
    const result = await handleConfigInit({ name: "new-copy", kgPath: newKg, type: "project-local", categories: [], interaction: "interactive" });

    expect(result.isError).toBeUndefined();
    const config = readConfig();
    expect(config.graphs["new-copy"].duplicateOf).toBe("existing");
    expect(config.graphs["existing"].status).toBe("active"); // untouched -- no merge/archive
    expect(config.graphs["existing"].mergedInto).toBeUndefined();
  });

  it("divergence-gate: non-divergent match silently re-points the existing entry, no gate()/ask() call", async () => {
    const { writeConfig, mintGraphId, writeGraphIdMarker, readConfig } = require("../src/utils.js") as typeof import("../src/utils.js");
    const id = mintGraphId();
    writeGraphIdMarker(existingKg, id);
    writeConfig({
      version: "1.0.0",
      graphs: { existing: { name: "existing", path: existingKg, type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: id } },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });
    writeGraphIdMarker(newKg, id); // both dirs are otherwise empty/identical

    const interactionModule = require("../src/interaction.js") as typeof import("../src/interaction.js");
    const gateSpy = jest.spyOn(interactionModule, "gate");

    const { handleConfigInit } = require("../src/tools/config.js") as typeof import("../src/tools/config.js");
    const result = await handleConfigInit({ name: "new-copy", kgPath: newKg, type: "project-local", categories: [], interaction: "automated" });

    expect(result.isError).toBeUndefined();
    expect(gateSpy).not.toHaveBeenCalled();
    const config = readConfig();
    expect(config.graphs["existing"].path).toBe(newKg);
    expect(config.graphs["new-copy"]).toBeUndefined();
  });

  it("divergence-gate: divergent match fires the four-way prompt", async () => {
    const { writeConfig, mintGraphId, writeGraphIdMarker } = require("../src/utils.js") as typeof import("../src/utils.js");
    const id = mintGraphId();
    writeGraphIdMarker(existingKg, id);
    writeConfig({
      version: "1.0.0",
      graphs: { existing: { name: "existing", path: existingKg, type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: id } },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });
    writeGraphIdMarker(newKg, id);
    fs.writeFileSync(path.join(newKg, "captured-lesson.md"), "something the new clone has that the original doesn't");

    const { handleConfigInit } = require("../src/tools/config.js") as typeof import("../src/tools/config.js");
    const result = await handleConfigInit({ name: "new-copy", kgPath: newKg, type: "project-local", categories: [], interaction: "automated" });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain("KMG_INPUT_REQUIRED");
  });

  it("interactive mode with ask()='reattach' then 'cancel' on the merge preview cancels, no write attempted (ADR-067 Task 4.5)", async () => {
    const { writeConfig, mintGraphId, writeGraphIdMarker, readConfig } = require("../src/utils.js") as typeof import("../src/utils.js");
    const id = mintGraphId();
    writeGraphIdMarker(existingKg, id);
    fs.writeFileSync(path.join(existingKg, "only-in-existing.md"), "existing content");
    writeConfig({
      version: "1.0.0",
      graphs: { existing: { name: "existing", path: existingKg, type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: id } },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });
    writeGraphIdMarker(newKg, id);
    fs.writeFileSync(path.join(newKg, "only-in-new.md"), "new content");

    const interactionModule = require("../src/interaction.js") as typeof import("../src/interaction.js");
    jest.spyOn(interactionModule, "resolveInteractionMode").mockReturnValue({ mode: "interactive" });
    jest.spyOn(interactionModule, "gate").mockImplementation(async (opts) =>
      opts.reason === "merge_preview" ? { answer: "cancel" } : { answer: "reattach" }
    );

    const { handleConfigInit } = require("../src/tools/config.js") as typeof import("../src/tools/config.js");
    const result = await handleConfigInit({ name: "new-copy", kgPath: newKg, type: "project-local", categories: [], interaction: "interactive" });

    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain("Merge cancelled");
    const config = readConfig();
    expect(config.graphs["new-copy"]).toBeUndefined(); // no registration performed
    expect(config.graphs["existing"].status).toBe("active"); // untouched -- no merge/archive attempted
    expect(config.graphs["existing"].mergedInto).toBeUndefined();
  });

  it("interactive mode with ask()='reattach' then 'confirm' on the merge preview merges the new registration into the existing entry, with a backup (ADR-067 Task 4.5)", async () => {
    const { writeConfig, mintGraphId, writeGraphIdMarker, readConfig, CONFIG_PATH } = require("../src/utils.js") as typeof import("../src/utils.js");
    const id = mintGraphId();
    writeGraphIdMarker(existingKg, id);
    fs.writeFileSync(path.join(existingKg, "only-in-existing.md"), "existing content");
    writeConfig({
      version: "1.0.0",
      graphs: { existing: { name: "existing", path: existingKg, type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: id } },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });
    writeGraphIdMarker(newKg, id);
    fs.writeFileSync(path.join(newKg, "only-in-new.md"), "new content");

    const interactionModule = require("../src/interaction.js") as typeof import("../src/interaction.js");
    jest.spyOn(interactionModule, "resolveInteractionMode").mockReturnValue({ mode: "interactive" });
    jest.spyOn(interactionModule, "gate").mockImplementation(async (opts) =>
      opts.reason === "merge_preview" ? { answer: "confirm" } : { answer: "reattach" }
    );

    const { handleConfigInit } = require("../src/tools/config.js") as typeof import("../src/tools/config.js");
    const result = await handleConfigInit({ name: "new-copy", kgPath: newKg, type: "project-local", categories: [], interaction: "interactive" });

    expect(result.isError).toBeFalsy();
    expect(JSON.stringify(result.content)).toContain("Reattached");
    const config = readConfig();
    expect(config.graphs["new-copy"].status).toBe("archived");
    expect(config.graphs["new-copy"].mergedInto).toBe("existing");
    expect(config.graphs["existing"].status).toBe("active"); // survivor untouched
    expect(fs.existsSync(path.join(path.dirname(CONFIG_PATH), "backups"))).toBe(true);
  });

  it("interactive mode with ask()='fork' remints the marker (not writeGraphIdMarker) and registers a new distinct graphId", async () => {
    const utilsModule = require("../src/utils.js") as typeof import("../src/utils.js");
    const { writeConfig, mintGraphId, writeGraphIdMarker, readConfig } = utilsModule;
    const id = mintGraphId();
    writeGraphIdMarker(existingKg, id);
    fs.writeFileSync(path.join(existingKg, "only-in-existing.md"), "existing content");
    writeConfig({
      version: "1.0.0",
      graphs: { existing: { name: "existing", path: existingKg, type: "project-local", categories: [], createdAt: "x", status: "active", statusChangedAt: "x", graphId: id } },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    });
    writeGraphIdMarker(newKg, id);
    fs.writeFileSync(path.join(newKg, "only-in-new.md"), "new content");

    const writeMarkerSpy = jest.spyOn(utilsModule, "writeGraphIdMarker");
    const remintMarkerSpy = jest.spyOn(utilsModule, "remintGraphIdMarker");
    const mintIdSpy = jest.spyOn(utilsModule, "mintGraphId");
    writeMarkerSpy.mockClear();
    mintIdSpy.mockClear();

    const interactionModule = require("../src/interaction.js") as typeof import("../src/interaction.js");
    jest.spyOn(interactionModule, "resolveInteractionMode").mockReturnValue({ mode: "interactive" });
    jest.spyOn(interactionModule, "gate").mockResolvedValue({ answer: "fork" });

    const { handleConfigInit } = require("../src/tools/config.js") as typeof import("../src/tools/config.js");
    const result = await handleConfigInit({ name: "new-copy", kgPath: newKg, type: "project-local", categories: [], interaction: "interactive" });

    expect(result.isError).toBeUndefined();
    expect(mintIdSpy).toHaveBeenCalledTimes(1);
    expect(remintMarkerSpy).toHaveBeenCalledWith(newKg, expect.any(String));
    expect(writeMarkerSpy).not.toHaveBeenCalled(); // fork must remint, not writeGraphIdMarker (throws when a marker already exists)
    const config = readConfig();
    expect(config.graphs["new-copy"].graphId).toBeTruthy();
    expect(config.graphs["new-copy"].graphId).not.toBe(id); // distinct from the duplicated graphId
  });

  it("ordinary registration (no pre-existing marker) mints a graphId via Task 1.9's existing mint, no second mint", async () => {
    const utilsModule = require("../src/utils.js") as typeof import("../src/utils.js");
    const writeSpy = jest.spyOn(utilsModule, "writeGraphIdMarker");

    const { handleConfigInit } = require("../src/tools/config.js") as typeof import("../src/tools/config.js");
    const result = await handleConfigInit({ name: "fresh", kgPath: newKg, type: "project-local", categories: [], interaction: "automated" });

    expect(result.isError).toBeUndefined();
    const config = utilsModule.readConfig();
    expect(config.graphs["fresh"].graphId).toBeTruthy();
    expect(fs.existsSync(path.join(newKg, ".kmgraph-id"))).toBe(true);
    expect(writeSpy).toHaveBeenCalledTimes(1); // no second write from this task's code path
  });
});
