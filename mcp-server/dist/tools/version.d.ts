import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export interface HandleVersionResult {
    installed: string;
    schema: number;
}
export declare function handleVersion(): HandleVersionResult;
export declare function registerVersionTool(server: McpServer): void;
//# sourceMappingURL=version.d.ts.map