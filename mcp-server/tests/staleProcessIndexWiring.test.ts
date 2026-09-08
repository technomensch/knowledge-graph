import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

jest.mock("../src/lib/staleProcessWarning.js", () => ({
  checkStaleProcess: jest.fn(),
}));

import { checkStaleProcess } from "../src/lib/staleProcessWarning.js";
import { installStaleProcessWarning } from "../src/lib/installStaleProcessWarning.js";

describe("installStaleProcessWarning", () => {
  let server: McpServer;

  beforeEach(() => {
    jest.clearAllMocks();
    server = new McpServer({ name: "test-server", version: "0.7.5" });
  });

  it("wraps server.tool() so subsequently-registered tools get the warning prepended", async () => {
    (checkStaleProcess as jest.Mock).mockReturnValue("STALE WARNING TEXT");
    installStaleProcessWarning(server, "0.7.5");

    server.tool("test_tool", "a test tool", {}, async () => ({
      content: [{ type: "text" as const, text: "original response" }],
    }));

    const registered = (server as unknown as { _registeredTools: Record<string, { handler: (...a: unknown[]) => Promise<{ content: Array<{ type: string; text: string }> }> }> })._registeredTools["test_tool"];
    const result = await registered.handler({}, {});

    // Warning must be its own leading block, NOT merged into content[0].text --
    // many handlers put a JSON.stringify payload in content[0], and merging
    // text into that string would corrupt it for any JSON.parse(content[0].text)
    // caller.
    expect(result.content).toHaveLength(2);
    expect(result.content[0].text).toBe("STALE WARNING TEXT");
    expect(result.content[1].text).toBe("original response");
  });

  it("does not alter the response when checkStaleProcess returns null", async () => {
    (checkStaleProcess as jest.Mock).mockReturnValue(null);
    installStaleProcessWarning(server, "0.7.5");

    server.tool("test_tool_2", "a test tool", {}, async () => ({
      content: [{ type: "text" as const, text: "original response" }],
    }));

    const registered = (server as unknown as { _registeredTools: Record<string, { handler: (...a: unknown[]) => Promise<{ content: Array<{ type: string; text: string }> }> }> })._registeredTools["test_tool_2"];
    const result = await registered.handler({}, {});

    expect(result.content[0].text).toBe("original response");
  });

  it("resolves the client name lazily on first call, NOT at wrap time", async () => {
    // Ordering matters here and must match production: installStaleProcessWarning()
    // runs at module load, before server.connect()/the initialize handshake, so
    // getClientVersion() is undefined at wrap time. Only stub it AFTER wrapping --
    // stubbing before (the ordering a naive "capture once at wrap time"
    // implementation would need to pass) does not exercise the real bug.
    (checkStaleProcess as jest.Mock).mockReturnValue(null);
    installStaleProcessWarning(server, "0.7.5");
    jest.spyOn(server.server, "getClientVersion").mockReturnValue({ name: "claude-code", version: "1.0.0" });

    server.tool("test_tool_3", "a test tool", {}, async () => ({
      content: [{ type: "text" as const, text: "x" }],
    }));
    const registered = (server as unknown as { _registeredTools: Record<string, { handler: (...a: unknown[]) => Promise<unknown> }> })._registeredTools["test_tool_3"];
    await registered.handler({}, {});

    expect(checkStaleProcess).toHaveBeenCalledWith("0.7.5", "claude-code");
  });

  it("memoizes the client name across multiple calls instead of re-resolving", async () => {
    (checkStaleProcess as jest.Mock).mockReturnValue(null);
    installStaleProcessWarning(server, "0.7.5");
    const spy = jest.spyOn(server.server, "getClientVersion").mockReturnValue({ name: "claude-code", version: "1.0.0" });

    server.tool("test_tool_4", "a test tool", {}, async () => ({
      content: [{ type: "text" as const, text: "x" }],
    }));
    const registered = (server as unknown as { _registeredTools: Record<string, { handler: (...a: unknown[]) => Promise<unknown> }> })._registeredTools["test_tool_4"];
    await registered.handler({}, {});
    await registered.handler({}, {});

    expect(checkStaleProcess).toHaveBeenNthCalledWith(1, "0.7.5", "claude-code");
    expect(checkStaleProcess).toHaveBeenNthCalledWith(2, "0.7.5", "claude-code");
    // Exactly once, not "at most 2" -- a bare `getClientVersion()` call with
    // no memoization would also pass a "<=2" bound (it'd be called twice,
    // which still satisfies <=2) without actually testing memoization. The
    // first call resolves and caches "claude-code"; the second must reuse it.
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
