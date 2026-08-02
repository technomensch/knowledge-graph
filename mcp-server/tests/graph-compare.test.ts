import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { hashDirectory, compareFileSets } from "../src/graph-compare.js";

describe("hashDirectory + compareFileSets", () => {
  let dirA: string, dirB: string;
  beforeEach(() => {
    dirA = fs.mkdtempSync(path.join(os.tmpdir(), "cmp-a-"));
    dirB = fs.mkdtempSync(path.join(os.tmpdir(), "cmp-b-"));
  });
  afterEach(() => {
    fs.rmSync(dirA, { recursive: true, force: true });
    fs.rmSync(dirB, { recursive: true, force: true });
  });

  it("hashDirectory returns relPath + content hash for every file, skipping the graphId marker", () => {
    fs.writeFileSync(path.join(dirA, "patterns.md"), "hello");
    fs.writeFileSync(path.join(dirA, ".kmgraph-id"), "some-uuid");
    const entries = hashDirectory(dirA);
    expect(entries.map((e) => e.relPath)).toEqual(["patterns.md"]);
  });

  it("hashDirectory never descends into .git/ — findings doc #22", () => {
    fs.writeFileSync(path.join(dirA, "patterns.md"), "hello");
    fs.mkdirSync(path.join(dirA, ".git", "objects", "ab"), { recursive: true });
    fs.writeFileSync(path.join(dirA, ".git", "objects", "ab", "deadbeef"), "internal git blob content");
    fs.writeFileSync(path.join(dirA, ".git", "HEAD"), "ref: refs/heads/main");
    const entries = hashDirectory(dirA);
    expect(entries.map((e) => e.relPath)).toEqual(["patterns.md"]);
  });

  it("classifies identical, diverged, unique-a, unique-b, and moved correctly", () => {
    fs.writeFileSync(path.join(dirA, "same.md"), "content-x");
    fs.writeFileSync(path.join(dirB, "same.md"), "content-x");

    fs.writeFileSync(path.join(dirA, "changed.md"), "version-1");
    fs.writeFileSync(path.join(dirB, "changed.md"), "version-2");

    fs.writeFileSync(path.join(dirA, "only-a.md"), "a-only");
    fs.writeFileSync(path.join(dirB, "only-b.md"), "b-only");

    fs.mkdirSync(path.join(dirA, "old-name"));
    fs.writeFileSync(path.join(dirA, "old-name", "file.md"), "moved-content");
    fs.mkdirSync(path.join(dirB, "new-name"));
    fs.writeFileSync(path.join(dirB, "new-name", "file.md"), "moved-content");

    const result = compareFileSets(hashDirectory(dirA), hashDirectory(dirB));
    const byRel = (r: string) => result.find((c) => c.relPathA === r || c.relPathB === r);

    expect(byRel("same.md")?.category).toBe("identical");
    expect(byRel("changed.md")?.category).toBe("diverged");
    expect(byRel("only-a.md")?.category).toBe("unique-a");
    expect(byRel("only-b.md")?.category).toBe("unique-b");
    expect(result.find((c) => c.category === "moved")).toBeDefined();
  });
});
