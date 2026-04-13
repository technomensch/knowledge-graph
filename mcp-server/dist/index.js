"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const config_js_1 = require("./tools/config.js");
const search_js_1 = require("./tools/search.js");
const scaffold_js_1 = require("./tools/scaffold.js");
const sanitization_js_1 = require("./tools/sanitization.js");
const index_js_1 = require("./resources/index.js");
const fts5_js_1 = require("./tools/fts5.js");
const capture_js_1 = require("./tools/capture.js");
const upgrade_js_1 = require("./tools/upgrade.js");
const version_js_1 = require("./tools/version.js");
const server = new mcp_js_1.McpServer({
    name: "knowledge-graph",
    version: "0.3.6-beta",
});
// Register tools (11 core tools)
(0, config_js_1.registerConfigTools)(server); // kg_config_init, kg_config_list, kg_config_switch, kg_config_add_category
(0, search_js_1.registerSearchTool)(server); // kg_search
(0, scaffold_js_1.registerScaffoldTool)(server); // kg_scaffold
(0, sanitization_js_1.registerSanitizationTool)(server); // kg_check_sensitive
(0, fts5_js_1.registerFts5Tool)(server); // kg_fts5_rebuild
(0, fts5_js_1.registerFts5StatusTool)(server); // kg_fts5_status
(0, capture_js_1.registerCaptureTool)(server); // kg_capture
(0, upgrade_js_1.registerUpgradeTool)(server); // kg_upgrade
(0, version_js_1.registerVersionTool)(server); // kg_version
// Register resources (2 resources)
(0, index_js_1.registerConfigResource)(server); // kg://config
(0, index_js_1.registerTemplatesResource)(server); // kg://templates/{name}
// Start server
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("Knowledge Graph MCP server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map