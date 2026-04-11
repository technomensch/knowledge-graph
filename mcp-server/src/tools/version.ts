import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Read version from package.json at runtime (not hardcoded)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require("../../package.json") as { version: string };

const SCHEMA_VERSION = 2;

export function registerVersionTool(server: McpServer): void {
  server.tool(
    "kg_version",
    "Get installed KMGraph version and schema level",
    {},
    async () => {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ installed: pkg.version, schema: SCHEMA_VERSION }),
          },
        ],
      };
    }
  );
}
