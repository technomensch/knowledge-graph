import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { checkStaleProcess } from "./staleProcessWarning.js";

/**
 * Wraps server.tool() so every tool registered AFTER this call gets a
 * cheap stale-process check prepended to its response content on every
 * invocation. Must be called immediately after `new McpServer(...)` and
 * before any register*Tools(server) calls (issue-32's original design;
 * confirmed still valid -- ADR-067's own index.ts changes already
 * shipped, no ordering conflict remains).
 *
 * Client identity (for host-specific remediation text) comes from
 * server.server.getClientVersion() -- populated from the MCP `initialize`
 * handshake's clientInfo field, which every compliant client sends before
 * any tool call. Critically, this function itself runs at module load time
 * (immediately after `new McpServer(...)`), which is BEFORE server.connect()
 * kicks off that handshake -- getClientVersion() is guaranteed undefined if
 * read here at wrap time. Resolution is therefore deferred to first actual
 * use, inside the wrapped callback (by which point a real tool call has
 * necessarily completed the handshake), and memoized after that so it's
 * resolved at most once per process, not re-derived on every call.
 *
 * Intentionally loosely typed at the wrapper boundary: McpServer.tool()
 * has 4 TypeScript overloads and re-declaring all of them on a wrapper
 * would be fragile against future SDK overload changes. The wrapper's
 * job is only to intercept the final callback argument -- everything
 * else passes through untouched, which is safe regardless of which
 * overload was used to call it.
 *
 * NOTE: server.tool() is deprecated in favor of server.registerTool() as of
 * SDK 1.26 (all 15 of this codebase's current registration sites still use
 * .tool(), so this wrapper covers every tool today). If a future migration
 * moves any registration to registerTool(), that tool silently stops
 * getting the stale-process check -- no test failure, just missing
 * coverage. Wrap both methods if/when that migration happens.
 */
export function installStaleProcessWarning(server: McpServer, runningVersion: string): void {
  let clientName: string | undefined;
  let clientNameResolved = false;
  const resolveClientName = (): string | undefined => {
    if (!clientNameResolved) {
      clientName = server.server.getClientVersion()?.name;
      // Only mark resolved once we actually got a value -- if called before
      // the handshake completes (shouldn't happen inside a real tool
      // callback, but cheap to guard), retry on the next call instead of
      // permanently memoizing `undefined`.
      if (clientName !== undefined) clientNameResolved = true;
    }
    return clientName;
  };
  const originalTool = server.tool.bind(server);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server as any).tool = (...args: any[]) => {
    const callback = args[args.length - 1] as (...cbArgs: unknown[]) => Promise<{
      content: Array<{ type: string; text?: string; [key: string]: unknown }>;
      [key: string]: unknown;
    }>;

    const wrappedCallback = async (...cbArgs: unknown[]) => {
      const result = await callback(...cbArgs);
      const warning = checkStaleProcess(runningVersion, resolveClientName());
      if (!warning) return result;

      // Merge into the first text block rather than adding a new array
      // element -- keeps the warning visually attached to the response it's
      // about, in the same content item, instead of a separate block a
      // caller could inspect content[0] and miss.
      const content = [...(result.content ?? [])];
      if (content.length > 0 && content[0].type === "text") {
        content[0] = { ...content[0], text: `${warning}\n\n${content[0].text ?? ""}` };
      } else {
        content.unshift({ type: "text" as const, text: warning });
      }

      return { ...result, content };
    };

    const newArgs = [...args.slice(0, -1), wrappedCallback];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalTool as any)(...newArgs);
  };
}
