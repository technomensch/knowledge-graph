import * as fs from "fs";
import * as path from "path";
import * as os from "os";

jest.mock("../src/utils.js", () => {
  const actual = jest.requireActual("../src/utils.js") as Record<string, unknown>;
  return {
    ...actual,
    readConfig: jest.fn(),
  };
});

import { handleExtract, registerExtractTool } from "../src/tools/extract";
import { readConfig } from "../src/utils.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("kg_extract", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kg-extract-test-"));
    fs.mkdirSync(path.join(tmpDir, "lessons-learned"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "lessons-learned", "example.md"),
      "# Lesson: Example\n\n## Problem\nSomething broke.\n\n## Solution\nFixed it.\n"
    );
    fs.mkdirSync(path.join(tmpDir, "decisions"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "decisions", "ADR-001-example.md"),
      "# ADR-001: Example Decision\n\n## Problem\nNeeded a choice.\n\n## Solution\nChose X.\n"
    );
    fs.mkdirSync(path.join(tmpDir, "chat-history"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "chat-history", "2026-09-01-claude.md"),
      "# Chat History: 2026-09-01\n\n## Session 1\n\n**User:** How do I fix X?\n"
    );

    (readConfig as jest.Mock).mockReturnValue({
      graphs: { "test-graph": { path: tmpDir, status: "active" } },
    });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it("returns per-source-category candidates without writing any file", async () => {
    const beforeSnapshot = JSON.stringify(walkDir(tmpDir));

    const result = await handleExtract(
      {
        sourcePaths: [
          path.join(tmpDir, "lessons-learned"),
          path.join(tmpDir, "decisions"),
          path.join(tmpDir, "chat-history"),
        ],
      },
      tmpDir
    );

    if ("error" in result) throw new Error(`unexpected error: ${result.message}`);
    expect(result.candidates.length).toBe(3);
    expect(result.candidates.find((c) => c.sourceRef.includes("example.md"))).toMatchObject({ category: "kg-entry" });
    expect(result.candidates.find((c) => c.sourceRef.includes("ADR-001"))).toMatchObject({ category: "decision" });
    expect(result.candidates.find((c) => c.sourceRef.includes("2026-09-01"))).toMatchObject({ category: "lesson" });

    // Never writes -- recursive snapshot before/after must be identical
    expect(JSON.stringify(walkDir(tmpDir))).toBe(beforeSnapshot);
  });

  it("rejects when sourcePaths is empty", async () => {
    const result = await handleExtract({ sourcePaths: [] }, tmpDir);
    expect("error" in result && result.error === "VALIDATION_ERROR").toBe(true);
  });

  it("rejects sourcePaths outside the resolved graph's chat-history/lessons-learned/decisions", async () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "kg-extract-outside-"));
    try {
      fs.writeFileSync(path.join(outside, "private-notes.md"), "# Private\n\nSecret stuff.\n");
      const result = await handleExtract({ sourcePaths: [outside] }, tmpDir);
      expect("error" in result && result.error === "KG_MISMATCH").toBe(true);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it("returns a structured error instead of throwing when a sourcePath doesn't exist", async () => {
    const missing = path.join(tmpDir, "lessons-learned", "does-not-exist.md");
    const result = await handleExtract({ sourcePaths: [missing] }, tmpDir);
    expect("error" in result && result.error === "VALIDATION_ERROR").toBe(true);
  });

  it("rejects a symlink inside an allowed root that points outside the graph", async () => {
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "kg-extract-symlink-target-"));
    try {
      fs.writeFileSync(path.join(outside, "escaped.md"), "# Escaped\n\nShould not be readable.\n");
      const linkPath = path.join(tmpDir, "lessons-learned", "escape-link");
      fs.symlinkSync(outside, linkPath, "dir");

      const result = await handleExtract({ sourcePaths: [linkPath] }, tmpDir);
      expect("error" in result && result.error === "KG_MISMATCH").toBe(true);
    } finally {
      fs.rmSync(outside, { recursive: true, force: true });
    }
  });

  it("resolves a relative sourcePath against the graph root, not the process cwd", async () => {
    const result = await handleExtract({ sourcePaths: ["lessons-learned"] }, tmpDir);
    if ("error" in result) throw new Error(`unexpected error: ${result.message}`);
    expect(result.candidates.length).toBe(1);
    expect(result.candidates[0].sourceRef).toContain("example.md");
  });
});

describe("kg_extract registration", () => {
  it("registers without throwing", () => {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    expect(() => registerExtractTool(server)).not.toThrow();
  });
});

function walkDir(dir: string): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walkDir(full) : [full];
    })
    .sort();
}
