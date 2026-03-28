import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerConfigTools } from "./tools/config.js";
import { registerSearchTool } from "./tools/search.js";
import { registerScaffoldTool } from "./tools/scaffold.js";
import { registerSanitizationTool } from "./tools/sanitization.js";
import { registerConfigResource, registerTemplatesResource } from "./resources/index.js";
import { registerFts5Tool } from "./tools/fts5.js";

const server = new McpServer({
  name: "knowledge-graph",
  version: "0.2.0-beta",
});

// Register tools (8 core tools)
registerConfigTools(server);    // kg_config_init, kg_config_list, kg_config_switch, kg_config_add_category
registerSearchTool(server);     // kg_search
registerScaffoldTool(server);   // kg_scaffold
registerSanitizationTool(server); // kg_check_sensitive
registerFts5Tool(server);       // kg_fts5_rebuild

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
