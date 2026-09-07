import * as fs from "fs";
import * as os from "os";
import * as path from "path";

jest.mock("../src/utils.js", () => ({
  getPluginRoot: jest.fn(),
}));

import { getPluginRoot } from "../src/utils.js";
import {
  compareSemver,
  resolveFreshestInstalledVersion,
  resolveRunningVersion,
  getRemediationText,
} from "../src/lib/staleProcessCheck.js";

describe("compareSemver", () => {
  it("returns 1 when a > b", () => {
    expect(compareSemver("0.7.9", "0.7.7")).toBe(1);
  });
  it("returns -1 when a < b", () => {
    expect(compareSemver("0.7.7", "0.7.9")).toBe(-1);
  });
  it("returns 0 when equal", () => {
    expect(compareSemver("0.7.7", "0.7.7")).toBe(0);
  });
  it("compares numerically, not lexically (0.6.20 > 0.6.9)", () => {
    expect(compareSemver("0.6.20", "0.6.9")).toBe(1);
    expect(compareSemver("0.6.9", "0.6.20")).toBe(-1);
  });
  it("compares numerically for double-digit minor (0.10.0 > 0.9.0)", () => {
    expect(compareSemver("0.10.0", "0.9.0")).toBe(1);
  });
});

describe("resolveFreshestInstalledVersion", () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kmgraph-stale-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns the max semver directory name among real siblings", () => {
    const kmgraphDir = path.join(tmpRoot, "kmgraph");
    for (const v of ["0.7.4", "0.7.5", "0.7.7"]) {
      fs.mkdirSync(path.join(kmgraphDir, v), { recursive: true });
    }
    (getPluginRoot as jest.Mock).mockReturnValue(path.join(kmgraphDir, "0.7.5"));

    expect(resolveFreshestInstalledVersion()).toBe("0.7.7");
  });

  it("picks the numeric max, not the lexical max (0.6.20 beats 0.6.9)", () => {
    const kmgraphDir = path.join(tmpRoot, "kmgraph");
    for (const v of ["0.6.9", "0.6.20"]) {
      fs.mkdirSync(path.join(kmgraphDir, v), { recursive: true });
    }
    (getPluginRoot as jest.Mock).mockReturnValue(path.join(kmgraphDir, "0.6.9"));

    expect(resolveFreshestInstalledVersion()).toBe("0.6.20");
  });

  it("ignores non-semver-named sibling entries", () => {
    const kmgraphDir = path.join(tmpRoot, "kmgraph");
    fs.mkdirSync(path.join(kmgraphDir, "0.7.7"), { recursive: true });
    fs.mkdirSync(path.join(kmgraphDir, "node_modules"), { recursive: true });
    fs.writeFileSync(path.join(kmgraphDir, "README.md"), "not a version dir");
    (getPluginRoot as jest.Mock).mockReturnValue(path.join(kmgraphDir, "0.7.7"));

    expect(resolveFreshestInstalledVersion()).toBe("0.7.7");
  });

  it("returns null when the parent directory doesn't exist", () => {
    (getPluginRoot as jest.Mock).mockReturnValue("/nonexistent-root/0.7.7");
    expect(resolveFreshestInstalledVersion()).toBeNull();
  });
});

describe("resolveRunningVersion", () => {
  it("returns the basename of getPluginRoot() when it's semver-shaped", () => {
    (getPluginRoot as jest.Mock).mockReturnValue("/plugins/cache/kmgraph/0.7.5");
    expect(resolveRunningVersion()).toBe("0.7.5");
  });

  it("falls back to __SERVER_VERSION__ when the basename isn't semver-shaped (e.g. dev tree)", () => {
    (getPluginRoot as jest.Mock).mockReturnValue("/Users/dev/knowledge-graph/mcp-server");
    // __SERVER_VERSION__ is a build-time esbuild --define substitution; under
    // ts-jest (no esbuild define pass) it's undefined, exercising the "0.0.0"
    // fallback branch -- assert the fallback path is taken, not a literal value.
    expect(resolveRunningVersion()).toBe("0.0.0");
  });
});

describe("getRemediationText", () => {
  it("matches Claude Code (case-insensitive substring)", () => {
    expect(getRemediationText("claude-code")).toMatch(/reload-plugins/);
    expect(getRemediationText("Claude Code")).toMatch(/reload-plugins/);
  });
  it("matches Claude Desktop distinctly from Claude Code", () => {
    expect(getRemediationText("Claude Desktop")).toMatch(/Restart Claude Desktop/);
  });
  it("does NOT false-match a client whose name merely contains \"code\" as a substring of another word", () => {
    expect(getRemediationText("claude-vscode-extension")).not.toMatch(/reload-plugins/);
    expect(getRemediationText("claude-vscode-extension")).toMatch(/Restart your AI tool/);
  });
  it("matches Gemini", () => {
    expect(getRemediationText("gemini-cli")).toMatch(/Restart Gemini CLI/);
  });
  it("matches Codex", () => {
    expect(getRemediationText("codex")).toMatch(/Restart Codex/);
  });
  it("matches Antigravity and flags it as unconfirmed", () => {
    expect(getRemediationText("antigravity-cli")).toMatch(/Antigravity/);
    expect(getRemediationText("antigravity-cli")).toMatch(/assumed/);
  });
  it("falls back to a generic instruction for unknown/absent clients", () => {
    expect(getRemediationText(undefined)).toMatch(/Restart your AI tool/);
    expect(getRemediationText("some-unknown-client")).toMatch(/Restart your AI tool/);
  });
});
