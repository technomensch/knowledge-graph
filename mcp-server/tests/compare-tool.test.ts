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
});
