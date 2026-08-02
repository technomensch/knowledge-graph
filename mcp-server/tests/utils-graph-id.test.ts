import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { mintGraphId, writeGraphIdMarker, readGraphIdMarker, remintGraphIdMarker, findRegistryEntryByGraphId } from "../src/utils.js";

describe("graphId marker", () => {
  let dir: string;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "graphid-")); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it("mintGraphId returns a well-formed UUID", () => {
    const id = mintGraphId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("writeGraphIdMarker then readGraphIdMarker round-trips", () => {
    const id = mintGraphId();
    writeGraphIdMarker(dir, id);
    expect(readGraphIdMarker(dir)).toBe(id);
  });

  it("readGraphIdMarker returns null when no marker exists", () => {
    expect(readGraphIdMarker(dir)).toBeNull();
  });

  it("writeGraphIdMarker is idempotent when re-writing the same id", () => {
    const id = mintGraphId();
    writeGraphIdMarker(dir, id);
    expect(() => writeGraphIdMarker(dir, id)).not.toThrow();
    expect(readGraphIdMarker(dir)).toBe(id);
  });

  it("writeGraphIdMarker throws when a different id already exists (prevents re-mint on re-init)", () => {
    writeGraphIdMarker(dir, mintGraphId());
    expect(() => writeGraphIdMarker(dir, mintGraphId())).toThrow();
  });

  it("remintGraphIdMarker overwrites an existing marker with a new id, no throw", () => {
    const original = mintGraphId();
    writeGraphIdMarker(dir, original);
    const forked = mintGraphId();
    expect(() => remintGraphIdMarker(dir, forked)).not.toThrow();
    expect(readGraphIdMarker(dir)).toBe(forked);
    expect(readGraphIdMarker(dir)).not.toBe(original);
  });

  it("remintGraphIdMarker also works when no marker exists yet", () => {
    const id = mintGraphId();
    expect(() => remintGraphIdMarker(dir, id)).not.toThrow();
    expect(readGraphIdMarker(dir)).toBe(id);
  });
});

describe("findRegistryEntryByGraphId", () => {
  it("finds the registry entry whose graphId matches", () => {
    const config = {
      version: "1.0.0",
      graphs: {
        a: { name: "a", path: "/a", type: "project-local" as const, categories: [], createdAt: "x", status: "active" as const, statusChangedAt: "x", graphId: "id-1" },
        b: { name: "b", path: "/b", type: "project-local" as const, categories: [], createdAt: "x", status: "active" as const, statusChangedAt: "x", graphId: "id-2" },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" as const },
    };
    const result = findRegistryEntryByGraphId(config as any, "id-2");
    expect(result?.name).toBe("b");
  });

  it("returns null when no entry matches", () => {
    const config = { version: "1.0.0", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" as const } };
    expect(findRegistryEntryByGraphId(config as any, "nope")).toBeNull();
  });

  it("excludes deleted entries from the match", () => {
    const config = {
      version: "1.0.0",
      graphs: {
        a: { name: "a", path: "/a", type: "project-local" as const, categories: [], createdAt: "x", status: "deleted" as const, statusChangedAt: "x", graphId: "id-1" },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" as const },
    };
    expect(findRegistryEntryByGraphId(config as any, "id-1")).toBeNull();
  });
});
