import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { registerCompareTools } from "../src/tools/compare.js";

describe("kg_compare_graphs tool registration", () => {
  it("registers a tool named kg_compare_graphs on the server", () => {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    const toolSpy = jest.spyOn(server, "tool");
    registerCompareTools(server);
    expect(toolSpy).toHaveBeenCalledWith("kg_compare_graphs", expect.any(String), expect.any(Object), expect.any(Function));
  });

  it("reports a clear error naming the missing path when one side doesn't exist, not zero-files-as-empty", async () => {
    const server = new McpServer({ name: "test", version: "0.0.0" });
    let handler: any;
    jest.spyOn(server, "tool").mockImplementation((...args: any[]) => { handler = args[3]; return server as any; });
    registerCompareTools(server);

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
    registerCompareTools(server);

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
