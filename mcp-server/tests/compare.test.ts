import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";
import { buildCompareSummary, getRecencySignal } from "../src/tools/compare.js";

describe("kg_compare_graphs summary", () => {
  let dirA: string, dirB: string;
  beforeEach(() => {
    dirA = fs.mkdtempSync(path.join(os.tmpdir(), "compare-a-"));
    dirB = fs.mkdtempSync(path.join(os.tmpdir(), "compare-b-"));
  });
  afterEach(() => {
    fs.rmSync(dirA, { recursive: true, force: true });
    fs.rmSync(dirB, { recursive: true, force: true });
  });

  it("getRecencySignal falls back to mtime and labels it, for a non-git directory", () => {
    fs.writeFileSync(path.join(dirA, "f.md"), "x");
    const signal = getRecencySignal(dirA);
    expect(signal.source).toBe("mtime-fallback");
  });

  it("getRecencySignal uses git-derived recency and labels it, for a git-tracked directory", () => {
    execSync("git init -q", { cwd: dirA });
    execSync("git config user.email t@t.com && git config user.name t", { cwd: dirA });
    fs.writeFileSync(path.join(dirA, "f.md"), "x");
    execSync("git add f.md && git commit -q -m x", { cwd: dirA });
    const signal = getRecencySignal(dirA);
    expect(signal.source).toBe("git");
  });

  it("buildCompareSummary reports file counts and a verdict line for two divergent dirs", () => {
    fs.writeFileSync(path.join(dirA, "shared.md"), "same");
    fs.writeFileSync(path.join(dirB, "shared.md"), "same");
    fs.writeFileSync(path.join(dirA, "only-a.md"), "a");
    const summary = buildCompareSummary(dirA, dirB);
    expect(summary.fileCountA).toBe(2);
    expect(summary.fileCountB).toBe(1);
    expect(typeof summary.verdict).toBe("string");
    expect(summary.verdict.length).toBeGreaterThan(0);
  });

  it("flags worktreeFingerprint when tracked content is identical and only gitignored paths differ", () => {
    execSync("git init -q", { cwd: dirA });
    execSync("git config user.email t@t.com && git config user.name t", { cwd: dirA });
    fs.writeFileSync(path.join(dirA, ".gitignore"), "sessions/\n");
    fs.mkdirSync(path.join(dirA, "sessions"));
    fs.writeFileSync(path.join(dirA, "sessions", "log.md"), "session-a");
    fs.writeFileSync(path.join(dirA, "tracked.md"), "same");
    execSync("git add .gitignore tracked.md && git commit -q -m x", { cwd: dirA });

    execSync("git init -q", { cwd: dirB });
    execSync("git config user.email t@t.com && git config user.name t", { cwd: dirB });
    fs.writeFileSync(path.join(dirB, ".gitignore"), "sessions/\n");
    fs.writeFileSync(path.join(dirB, "tracked.md"), "same");
    execSync("git add .gitignore tracked.md && git commit -q -m x", { cwd: dirB });

    fs.mkdirSync(path.join(dirB, "sessions"));
    fs.writeFileSync(path.join(dirB, "sessions", "log.md"), "session-b");

    const summary = buildCompareSummary(dirA, dirB);
    expect(summary.worktreeFingerprint).toBe(true);
  });
});
