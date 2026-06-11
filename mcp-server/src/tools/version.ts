import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

declare const __SERVER_VERSION__: string;
const pkg = { version: typeof __SERVER_VERSION__ !== "undefined" ? __SERVER_VERSION__ : "0.0.0" };

const SCHEMA_VERSION = 2;

// ── Exported handler for direct testing ──────────────────────────────────────

export interface HandleVersionResult {
  installed: string;
  schema: number;
}

export function handleVersion(): HandleVersionResult {
  return { installed: pkg.version, schema: SCHEMA_VERSION };
}

// ── MCP Tool Registration ────────────────────────────────────────────────────

export function registerVersionTool(server: McpServer): void {
  server.tool(
    "kg_version",
    "Get installed KMGraph version and schema level",
    {},
    async () => {
      const result = handleVersion();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    }
  );
}
