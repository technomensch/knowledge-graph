import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerConfigTools } from "./tools/config.js";
import { registerSearchTool } from "./tools/search.js";
import { registerScaffoldTool } from "./tools/scaffold.js";
import { registerSanitizationTool } from "./tools/sanitization.js";
import { registerConfigResource, registerTemplatesResource } from "./resources/index.js";
import { registerFts5Tool, registerFts5StatusTool } from "./tools/fts5.js";
import { registerCaptureTool } from "./tools/capture.js";
import { registerUpgradeTool } from "./tools/upgrade.js";
import { registerVersionTool } from "./tools/version.js";
import { registerCompareTools } from "./tools/compare.js";
import { PersonalScopeSession, CrossKgSearchSession } from "./resolution.js";

declare const __SERVER_VERSION__: string;

const server = new McpServer({
  name: "knowledge-graph",
  version: typeof __SERVER_VERSION__ !== "undefined" ? __SERVER_VERSION__ : "0.0.0",
});

// ADR-067 Task 6.3 (spec §11): one ephemeral, process-lifetime scope session
// shared between kg_search and kg_capture -- constructed once here so a
// [personal]/[project] marker or personal-scope confirmation made through
// one tool is honored symmetrically by the other.
const personalScopeSession = new PersonalScopeSession();

// ADR-067 Task 6.5 (findings doc #14): one ephemeral, process-lifetime
// session gating kg_search's scope:"all" cross-KG union-read behind a
// which-KGs-and-which-excluded confirmation, sticky-or-one-shot like
// personalScopeSession above.
const crossKgSearchSession = new CrossKgSearchSession();

// Register tools (12 core tools)
registerConfigTools(server, personalScopeSession);    // kg_config_init, kg_config_list, kg_config_add_category
registerSearchTool(server, personalScopeSession, crossKgSearchSession); // kg_search
registerScaffoldTool(server);   // kg_scaffold
registerSanitizationTool(server, personalScopeSession); // kg_check_sensitive
registerFts5Tool(server, personalScopeSession);       // kg_fts5_rebuild
registerFts5StatusTool(server, personalScopeSession); // kg_fts5_status
registerCaptureTool(server, personalScopeSession);    // kg_capture
registerUpgradeTool(server, personalScopeSession);    // kg_upgrade
registerVersionTool(server);    // kg_version
registerCompareTools(server, personalScopeSession);   // kg_compare_graphs

// Register resources (2 resources)
registerConfigResource(server);    // kg://config
registerTemplatesResource(server); // kg://templates/{name}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Knowledge Graph MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
