import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
/**
 * kg://config — Exposes current kg-config.json as a read-only resource.
 * Clients can read the full configuration including all graphs, active selection,
 * and sanitization settings without needing to call a tool.
 */
export declare function registerConfigResource(server: McpServer): void;
export declare function registerTemplatesResource(server: McpServer): void;
//# sourceMappingURL=index.d.ts.map