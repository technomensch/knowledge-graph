import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PersonalScopeSession, CrossKgSearchSession } from "./resolution.js";

/**
 * Tool/resource registration for the `knowledge-graph` npm CLI's MCP entry
 * point (cli.ts), the surface Cursor/Codex use -- as opposed to index.ts,
 * which is Claude Code's.
 *
 * Both sessions are required parameters and are threaded into every registrar
 * that takes them. Spec §11's "no read/write asymmetry" guarantee is a
 * property of ONE session instance being shared: give each registrar its own,
 * and each tool gets a private confirmedRepos set, so confirming a repo
 * through kg_search leaves kg_config_add_category still unconfirmed. Extracted
 * out of cli.ts so that sharing is directly testable.
 *
 * Registrars are imported dynamically to keep non-MCP CLI subcommands
 * (init/config/help) from paying for the tool layer at startup.
 */
export async function registerCliMcpTools(
  server: McpServer,
  personalScopeSession: PersonalScopeSession,
  crossKgSearchSession: CrossKgSearchSession
): Promise<void> {
  const { registerConfigTools } = await import("./tools/config.js");
  const { registerSearchTool } = await import("./tools/search.js");
  const { registerScaffoldTool } = await import("./tools/scaffold.js");
  const { registerSanitizationTool } = await import("./tools/sanitization.js");
  const { registerConfigResource, registerTemplatesResource } = await import("./resources/index.js");

  registerConfigTools(server, personalScopeSession);
  registerSearchTool(server, personalScopeSession, crossKgSearchSession);
  registerScaffoldTool(server);
  registerSanitizationTool(server);
  registerConfigResource(server);
  registerTemplatesResource(server);
}
