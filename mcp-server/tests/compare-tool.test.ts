jest.mock("../src/utils.js", () => {
  const actual = jest.requireActual("../src/utils.js") as Record<string, unknown>;
  return {
    ...actual,
    readConfig: jest.fn(() => ({ version: "1.0.0", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } })),
  };
});

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { registerCompareTools } from "../src/tools/compare.js";
import { PersonalScopeSession } from "../src/resolution.js";
import { readConfig, KgConfig } from "../src/utils.js";

afterEach(() => jest.clearAllMocks());

describe("kg_compare_graphs tool registration", () => {
  it("registers a tool named kg_compare_graphs on the server", () => {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const toolSpy = jest.spyOn(server, "tool");
    registerCompareTools(server, new PersonalScopeSession());
    expect(toolSpy).toHaveBeenCalledWith("kg_compare_graphs", expect.any(String), expect.any(Object), expect.any(Function));
  });

  it("reports a clear error naming the missing path when one side doesn't exist, not zero-files-as-empty", async () => {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    let handler: any;
    jest.spyOn(server, "tool").mockImplementation((...args: any[]) => { handler = args[3]; return server as any; });
    registerCompareTools(server, new PersonalScopeSession());

    const validDir = fs.mkdtempSync(path.join(os.tmpdir(), "cmp-valid-"));
    const missingDir = path.join(os.tmpdir(), "definitely-does-not-exist-12345");

    const result = await handler({ a: validDir, b: missingDir });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(missingDir);

    fs.rmSync(validDir, { recursive: true, force: true });
  });

  it("lists example filenames most-recently-modified first with a (N more) suffix when truncated", async () => {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    let handler: any;
    jest.spyOn(server, "tool").mockImplementation((...args: any[]) => { handler = args[3]; return server as any; });
    registerCompareTools(server, new PersonalScopeSession());

    const dirA = fs.mkdtempSync(path.join(os.tmpdir(), "cmp-a-"));
    const dirB = fs.mkdtempSync(path.join(os.tmpdir(), "cmp-b-"));

    // 6 files unique to A only. mtime is assigned so the newest file is
    // alphabetically LAST (f6) and the oldest is alphabetically FIRST (f1) —
    // this diverges from both creation order and alphabetical order, so the
    // test actually exercises the recency sort (deleting it would fail here).
    const names = ["f1.md", "f2.md", "f3.md", "f4.md", "f5.md", "f6.md"];
    const baseTime = Date.now() / 1000;
    names.forEach((name, i) => {
      fs.writeFileSync(path.join(dirA, name), `content-${name}`);
      // f6 gets the newest mtime, f1 the oldest.
      const mtime = baseTime - (names.length - 1 - i);
      fs.utimesSync(path.join(dirA, name), mtime, mtime);
    });

    const result = await handler({ a: dirA, b: dirB });
    const text = result.content[0].text as string;
    const line = text.split("\n").find((l) => l.startsWith("Only in A (examples):"));
    expect(line).toBeDefined();
    expect(line).toContain("f6.md, f5.md, f4.md, f3.md, f2.md");
    expect(line).not.toContain("f1.md");
    expect(line).toContain("(1 more)");

    fs.rmSync(dirA, { recursive: true, force: true });
    fs.rmSync(dirB, { recursive: true, force: true });
  });
});

// Finding 2 (Fable review): kg_compare_graphs took two arbitrary filesystem paths with zero
// gating -- anyone could pass the personal KG's real path as `a` or `b` and get its file
// counts/recency/filenames back unconfirmed. These tests cover the registry-based gate: a path
// is only gated when it resolves to a REGISTERED graph of type "personal".
describe("kg_compare_graphs personal-scope gate", () => {
  function personalConfig(personalRoot: string): KgConfig {
    const now = new Date().toISOString();
    return {
      version: "1.0.0",
      graphs: {
        personal: {
          name: "personal",
          path: personalRoot,
          type: "personal",
          categories: [],
          createdAt: now,
          status: "active",
          statusChangedAt: now,
          graphId: "personal-id",
        },
      },
      sanitization: { enabled: false, patterns: [], action: "warn" },
    };
  }

  async function getHandler(session = new PersonalScopeSession()) {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    let handler: any;
    jest.spyOn(server, "tool").mockImplementation((...args: any[]) => { handler = args[3]; return server as any; });
    registerCompareTools(server, session);
    return handler;
  }

  it('called with the registered personal graph\'s path as "a" from an unconfirmed repo returns the structured gate error', async () => {
    const personalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cmp-personal-"));
    const otherDir = fs.mkdtempSync(path.join(os.tmpdir(), "cmp-other-"));
    (readConfig as jest.Mock).mockReturnValue(personalConfig(personalRoot));

    const handler = await getHandler();
    const result = await handler({ a: personalRoot, b: otherDir });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toMatchObject({ error: "KMG_INPUT_REQUIRED", reason: "personal_scope_unseen_repo" });

    fs.rmSync(personalRoot, { recursive: true, force: true });
    fs.rmSync(otherDir, { recursive: true, force: true });
  });

  it('called with the registered personal graph\'s path as "b" from an unconfirmed repo returns the structured gate error', async () => {
    const personalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cmp-personal-"));
    const otherDir = fs.mkdtempSync(path.join(os.tmpdir(), "cmp-other-"));
    (readConfig as jest.Mock).mockReturnValue(personalConfig(personalRoot));

    const handler = await getHandler();
    const result = await handler({ a: otherDir, b: personalRoot });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toMatchObject({ error: "KMG_INPUT_REQUIRED", reason: "personal_scope_unseen_repo" });

    fs.rmSync(personalRoot, { recursive: true, force: true });
    fs.rmSync(otherDir, { recursive: true, force: true });
  });

  it("proceeds to compare once confirmPersonalScope:true is passed", async () => {
    const personalRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cmp-personal-"));
    const otherDir = fs.mkdtempSync(path.join(os.tmpdir(), "cmp-other-"));
    (readConfig as jest.Mock).mockReturnValue(personalConfig(personalRoot));

    const handler = await getHandler();
    const result = await handler({ a: personalRoot, b: otherDir, confirmPersonalScope: true });

    expect(result.isError).toBeUndefined();

    fs.rmSync(personalRoot, { recursive: true, force: true });
    fs.rmSync(otherDir, { recursive: true, force: true });
  });

  it("two ordinary non-personal paths still work as before, with no gate and no regression", async () => {
    const dirA = fs.mkdtempSync(path.join(os.tmpdir(), "cmp-a-"));
    const dirB = fs.mkdtempSync(path.join(os.tmpdir(), "cmp-b-"));
    (readConfig as jest.Mock).mockReturnValue({ version: "1.0.0", graphs: {}, sanitization: { enabled: false, patterns: [], action: "warn" } });

    const handler = await getHandler();
    const result = await handler({ a: dirA, b: dirB });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Files: A=0, B=0");

    fs.rmSync(dirA, { recursive: true, force: true });
    fs.rmSync(dirB, { recursive: true, force: true });
  });
});
