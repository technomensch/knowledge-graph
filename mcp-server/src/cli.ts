#!/usr/bin/env node

import * as path from "path";
import * as readline from "readline";
import {
  readConfig,
  writeConfig,
  mintGraphId,
  writeGraphIdMarker,
  readGraphIdMarker,
  GraphConfig,
  CategoryConfig,
} from "./utils.js";
import { resolveRegistrationGuard, scaffoldGraphDirectory } from "./tools/config.js";
import { resolveKgPath } from "./tools/resolve.js";

declare const __SERVER_VERSION__: string;
const SERVER_VERSION =
  typeof __SERVER_VERSION__ !== "undefined"
    ? __SERVER_VERSION__
    : (() => { try { return (require("../package.json") as { version: string }).version; } catch { return "0.0.0"; } })();

// ── Helpers ──────────────────────────────────────────────────────────

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function printHeader(): void {
  console.log("");
  console.log("  Knowledge Management Graph — Setup Wizard");
  console.log("  ======================================");
  console.log("");
}

// ── Init Subcommand ──────────────────────────────────────────────────

/**
 * Resolves the storage-location menu choice to a KG path.
 * Returns null for the custom-path choice ("4"), which the caller must
 * resolve interactively since it requires an additional prompt.
 */
export function resolveInitLocation(
  locationChoice: string,
  name: string
): string | null {
  switch (locationChoice) {
    case "1":
      return path.resolve("knowledge");
    case "2":
      return path.join("~", ".kmgraph");
    case "3":
      return path.join("~", ".kmgraph", "knowledge-graphs", name);
    case "4":
      return null;
    default:
      return path.resolve("knowledge");
  }
}

async function runInit(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  printHeader();

  try {
    // 1. Ask for KG name
    const name = await ask(rl, "  Knowledge graph name: ");
    if (!name) {
      console.error("Error: Name is required.");
      process.exit(1);
    }

    // Check if name already exists
    const config = readConfig();
    if (config.graphs[name]) {
      console.error(
        `Error: Knowledge graph '${name}' already exists. Use a different name.`
      );
      process.exit(1);
    }

    // 2. Ask for storage location
    console.log("");
    console.log("  Where should the knowledge graph be stored?");
    console.log("  1. Current directory (./knowledge/)");
    console.log("  2. Home directory (~/.kmgraph/) — for your personal KG");
    console.log("  3. Global topic (~/.kmgraph/knowledge-graphs/<name>/) — a named KG not tied to any single project");
    console.log("  4. Custom path");
    console.log("");
    const locationChoice = await ask(rl, "  Choice [1/2/3/4]: ");

    let kgPath: string;
    const resolved = resolveInitLocation(locationChoice, name);
    if (resolved !== null) {
      kgPath = resolved;
    } else {
      const customPath = await ask(rl, "  Enter path: ");
      if (!customPath) {
        console.error("Error: Path is required.");
        process.exit(1);
      }
      kgPath = customPath;
    }

    // 3. Ask for KG type
    console.log("");
    console.log("  Knowledge graph type:");
    console.log("  1. project-local (default) — tied to this project");
    console.log("  2. personal — shared across projects (your personal KG)");
    console.log("  3. custom");
    console.log("");
    const typeChoice = await ask(rl, "  Choice [1/2/3]: ");

    const typeMap: Record<string, GraphConfig["type"]> = {
      "1": "project-local",
      "2": "personal",
      "3": "custom",
    };
    const kgType = typeMap[typeChoice] || "project-local";

    // 4. Use default categories
    const categories: CategoryConfig[] = [
      { name: "architecture", prefix: null, git: "commit" },
      { name: "process", prefix: null, git: "commit" },
      { name: "patterns", prefix: null, git: "commit" },
    ];

    // Expand path + run both registration guards (shared with kg_config_init, ENH-051)
    const { expandedPath, hardBlocked, broadWarning } = resolveRegistrationGuard(config, kgPath);

    if (hardBlocked) {
      console.error(
        `Error: refusing to register a knowledge graph at ${expandedPath} — this is your home directory or the filesystem root. Registering a KG this broad would make it resolve as "the KG for" nearly every directory on this machine. Choose a more specific project path.`
      );
      process.exit(1);
    }

    if (broadWarning) {
      console.log("");
      console.log(
        `  Warning: ${expandedPath} is an ancestor of ${broadWarning.isAncestorOfCount} already-registered graph(s) (${broadWarning.ancestorOfNames.join(", ")}).`
      );
      const confirm = await ask(rl, "  Continue anyway? [yes/no]: ");
      if (confirm.trim().toLowerCase() !== "yes") {
        console.log("  Registration cancelled.");
        process.exit(1);
      }
    }

    console.log("");
    console.log("  Creating knowledge graph...");

    // Mint the graph id and check for a marker mismatch BEFORE scaffolding
    // any files -- scaffoldGraphDirectory writes real files, so running this
    // check after it (as this used to) leaves scaffold files behind in a
    // folder the CLI just refused to register. cli.ts has no earlier
    // marker-related variable to reuse here -- this is the only
    // readGraphIdMarker() call in this function.
    //
    // Precise pre-check instead of try/catch around writeGraphIdMarker (Opus
    // review nit): a bare catch there would also swallow genuine I/O errors
    // and mislabel them as a marker conflict.
    const newGraphId = mintGraphId();
    const existingMarkerId = readGraphIdMarker(expandedPath);
    if (existingMarkerId && existingMarkerId !== newGraphId) {
      console.error(
        `Error: '${expandedPath}' is already tracked as a different knowledge graph (marker mismatch). If you meant to fork/re-register it, that flow isn't built yet (ADR-067 Phase 4) -- for now, remove or rename the existing .kmgraph-id marker file manually if you're certain this is intentional.`
      );
      process.exit(1);
    }

    // 5/6. Create directory structure + copy default templates (shared with
    // kg_config_init, ENH-051)
    const templatesCopied = scaffoldGraphDirectory(expandedPath, categories);

    // 7. Write config
    const now = new Date().toISOString();
    writeGraphIdMarker(expandedPath, newGraphId);
    const graphConfig: GraphConfig = {
      name,
      path: kgPath,
      type: kgType,
      categories,
      createdAt: now,
      status: "pending",
      statusChangedAt: now,
      graphId: newGraphId,
      // lastUsed removed -- optional on the type since Task 1.1, no writer needed
    };

    config.graphs[name] = graphConfig;
    // config.active = name; removed -- resolution is now context-derived (Task 1.5)
    writeConfig(config);

    // 8. Print summary
    console.log("");
    console.log("  Knowledge graph initialized:");
    console.log(`    Name:       ${name}`);
    console.log(`    Path:       ${kgPath}`);
    console.log(`    Type:       ${kgType}`);
    console.log(
      `    Categories: ${categories.map((c) => c.name).join(", ")}`
    );
    console.log(`    Templates:  ${templatesCopied} copied`);
    console.log(`    Config:     ~/.kmgraph/kg-config.json`);
    console.log("");
    console.log("  Ready to use. Try capturing your first lesson!");
    console.log("");
  } finally {
    rl.close();
  }
}

// ── Config Subcommand ────────────────────────────────────────────────

interface McpConfig {
  [key: string]: unknown;
}

function printConfig(platform: string): void {
  // Auto-detect the MCP server path
  const serverPath = path.resolve(__dirname, "index.js");

  const mcpEntry = {
    command: "node",
    args: [serverPath],
  };

  let configJson: McpConfig;
  let configPath: string;
  let note = "";

  switch (platform.toLowerCase()) {
    case "cursor":
      configJson = { mcpServers: { "knowledge-graph": mcpEntry } };
      configPath = "~/.cursor/mcp.json";
      break;

    case "windsurf":
      configJson = { mcpServers: { "knowledge-graph": mcpEntry } };
      configPath = "~/.codeium/windsurf/mcp_config.json";
      break;

    case "continue":
    case "continue.dev":
      configJson = {
        mcpServers: [{ name: "knowledge-graph", ...mcpEntry }],
      };
      configPath = "~/.continue/config.json";
      note =
        "Note: Merge the mcpServers array into your existing config.json.";
      break;

    case "jetbrains":
      configPath = "Settings > Tools > AI Assistant > MCP Servers";
      console.log("");
      console.log(`  JetBrains MCP Configuration`);
      console.log(`  ===========================`);
      console.log(`  Open: ${configPath}`);
      console.log(`  Add Server:`);
      console.log(`    Name:    knowledge-graph`);
      console.log(`    Command: node`);
      console.log(`    Args:    ${serverPath}`);
      console.log("");
      return;

    case "vscode":
    case "vscode-claude":
      configJson = { servers: { "knowledge-graph": mcpEntry } };
      configPath = ".vscode/mcp.json";
      break;

    case "claude-desktop":
    case "desktop":
      configJson = { mcpServers: { "knowledge-graph": mcpEntry } };
      configPath =
        process.platform === "win32"
          ? "%APPDATA%/Claude/claude_desktop_config.json"
          : "~/Library/Application Support/Claude/claude_desktop_config.json";
      note =
        "Note: Merge the mcpServers object into your existing config file.";
      break;

    default:
      console.error(`Unknown platform: ${platform}`);
      console.error(
        "Supported: cursor, windsurf, continue, jetbrains, vscode, claude-desktop"
      );
      process.exit(1);
  }

  console.log("");
  console.log(`  MCP Configuration for ${platform}`);
  console.log(`  Config file: ${configPath}`);
  console.log("");
  console.log(JSON.stringify(configJson!, null, 2));
  if (note) {
    console.log("");
    console.log(`  ${note}`);
  }
  console.log("");
}

// ── Resolve Subcommand ───────────────────────────────────────────────

// issue-41 (Phase 9 scripts/ cleanup): the SessionStart/Stop/PostToolUse
// hook scripts in scripts/ are plain bash with no MCP client and no LLM in
// the loop, so they can't invoke the kg_resolve *tool* the way markdown
// commands/agents do. This subcommand exposes the same resolveKgPath()
// logic as a one-shot CLI call those scripts can shell out to against the
// already-built dist/cli.js, instead of re-deriving "which KG is this" by
// grepping the retired `.active` pointer out of kg-config.json.
//
// Deliberately project-scope only (no `--scope user`): the kg_resolve MCP
// *tool* gates scope:"user" behind confirmPersonalScopeAccess (resolve.ts) --
// the same per-repo confirmation invariant kg_check_sensitive/kg_search/
// kg_capture all enforce before a call may touch the personal graph. This
// CLI subcommand has no equivalent interactive confirmation channel, and
// none of the scripts/ callers need personal-scope resolution (all three
// resolve the project KG for the current directory). Exposing an ungated
// `--scope user` here would let anything with Bash access silently bypass
// that confirmation gate and disclose the personal graph's path from a
// repo that was never confirmed for personal-scope access -- so the option
// is left out rather than gated, since nothing here needs it.
function printResolveJson(value: unknown): void {
  console.log(JSON.stringify(value));
}

function runResolve(args: string[]): void {
  let cwd = process.cwd();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--cwd" && args[i + 1]) {
      cwd = args[i + 1];
      i++;
    }
  }

  const config = readConfig();
  const resolved = resolveKgPath(config, {}, cwd);

  if ("error" in resolved) {
    printResolveJson({ error: resolved.error });
    process.exit(1);
  }

  printResolveJson(resolved);
}

// ── Usage ────────────────────────────────────────────────────────────

function printUsage(): void {
  console.log("");
  console.log("  Knowledge Management Graph CLI");
  console.log("");
  console.log("  Usage:");
  console.log("    node dist/cli.js              Start MCP server (default)");
  console.log(
    "    node dist/cli.js init         Interactive setup wizard"
  );
  console.log(
    "    node dist/cli.js config <ide> Print MCP config for an IDE"
  );
  console.log(
    "    node dist/cli.js resolve [--cwd <path>]"
  );
  console.log(
    "                                   Print the cwd-resolved KG as JSON ({name, path})"
  );
  console.log("");
  console.log("  Supported IDEs:");
  console.log("    cursor, windsurf, continue, jetbrains, vscode, claude-desktop");
  console.log("");
}

// ── Main ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    // Default: start MCP server
    const { StdioServerTransport } = await import(
      "@modelcontextprotocol/sdk/server/stdio.js"
    );
    const { McpServer } = await import(
      "@modelcontextprotocol/sdk/server/mcp.js"
    );
    const { registerCliMcpTools } = await import("./mcp-bootstrap.js");

    const server = new McpServer({
      name: "knowledge-graph",
      version: SERVER_VERSION,
    });

    // One session each, shared across every tool registered below -- see
    // registerCliMcpTools' comment for why a per-registrar instance breaks
    // spec §11.
    const { PersonalScopeSession, CrossKgSearchSession } = await import("./resolution.js");
    await registerCliMcpTools(server, new PersonalScopeSession(), new CrossKgSearchSession());

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Knowledge Graph MCP server running on stdio");
    return;
  }

  switch (command) {
    case "init":
      await runInit();
      break;

    case "config": {
      const platform = args[1];
      if (!platform) {
        console.error(
          "Error: Specify a platform. Example: node dist/cli.js config cursor"
        );
        process.exit(1);
      }
      printConfig(platform);
      break;
    }

    case "resolve":
      runResolve(args.slice(1));
      break;

    case "--help":
    case "-h":
    case "help":
      printUsage();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
