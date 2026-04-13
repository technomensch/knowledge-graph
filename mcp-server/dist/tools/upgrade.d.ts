import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export type ApplyCategory = "directories" | "config" | "templates" | "platform-split" | "chat-history-migration";
export interface HandleUpgradeParams {
    apply?: ApplyCategory[];
    confirm_platform_split?: boolean;
}
export interface HandleUpgradeResult {
    [x: string]: unknown;
    content: Array<{
        type: "text";
        text: string;
    }>;
    isError?: true;
}
export declare function handleUpgrade(params: HandleUpgradeParams): Promise<HandleUpgradeResult>;
export declare function registerUpgradeTool(server: McpServer): void;
//# sourceMappingURL=upgrade.d.ts.map