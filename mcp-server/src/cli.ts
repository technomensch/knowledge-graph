#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as readline from "readline";
import {
  readConfig,
  writeConfig,
  getPluginRoot,
  GraphConfig,
  CategoryConfig,
} from "./utils.js";

// ── Helpers ──────────────────────────────────────────────────────────

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function printHeader(): void {
  console.log("");
  console.log("  Knowledge Graph Plugin — Setup Wizard");
  console.log("  ======================================");
  console.log("");
}

// ── Init Subcommand ──────────────────────────────────────────────────

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
    console.log("  1. Current directory (./docs/)");
    console.log("  2. Home directory (~/.knowledge-graph/)");
    console.log("  3. Custom path");
    console.log("");
    const locationChoice = await ask(rl, "  Choice [1/2/3]: ");

    let kgPath: string;
    switch (locationChoice) {
      case "1":
        kgPath = path.resolve("docs");
        break;
      case "2":
        kgPath = path.join("~", ".knowledge-graph");
        break;
      case "3": {
        const customPath = await ask(rl, "  Enter path: ");
        if (!customPath) {
          console.error("Error: Path is required.");
          process.exit(1);
        }
        kgPath = customPath;
        break;
      }
      default:
        kgPath = path.resolve("docs");
    }

    // 3. Ask for KG type
    console.log("");
    console.log("  Knowledge graph type:");
    console.log("  1. project-local (default) — tied to this project");
    console.log("  2. global — shared across projects");
    console.log("  3. cowork — shared with team members");
    console.log("  4. custom");
    console.log("");
    const typeChoice = await ask(rl, "  Choice [1/2/3/4]: ");

    const typeMap: Record<string, GraphConfig["type"]> = {
      "1": "project-local",
      "2": "global",
      "3": "cowork",
      "4": "custom",
    };
    const kgType = typeMap[typeChoice] || "project-local";

    // 4. Use default categories
    const categories: CategoryConfig[] = [
      { name: "architecture", prefix: null, git: "commit" },
      { name: "process", prefix: null, git: "commit" },
      { name: "patterns", prefix: null, git: "commit" },
    ];

    // Expand path for file operations
    const expandedPath = kgPath.replace(/^~/, os.homedir());

    console.log("");
    console.log("  Creating knowledge graph...");

    // 5. Create directory structure
    const dirs = [
      "knowledge",
      "lessons-learned",
      "decisions",
      "sessions",
      "chat-history",
    ];
    for (const dir of dirs) {
      fs.mkdirSync(path.join(expandedPath, dir), { recursive: true });
    }

    // Create category subdirectories
    for (const cat of categories) {
      fs.mkdirSync(path.join(expandedPath, "lessons-learned", cat.name), {
        recursive: true,
      });
    }

    // 6. Copy templates from plugin
    const pluginRoot = getPluginRoot();
    const templateSrc = path.join(pluginRoot, "core", "templates");

    let templatesCopied = 0;
    if (fs.existsSync(templateSrc)) {
      // Knowledge templates
      const knowledgeTemplates = [
        "patterns.md",
        "gotchas.md",
        "concepts.md",
        "architecture.md",
        "workflows.md",
        "index.md",
      ];
      for (const t of knowledgeTemplates) {
        const src = path.join(templateSrc, "knowledge", t);
        const dest = path.join(expandedPath, "knowledge", t);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
          templatesCopied++;
        }
      }

      // Lesson templates
      for (const t of ["README.md", "lesson-template.md"]) {
        const src = path.join(templateSrc, "lessons-learned", t);
        const dest = path.join(expandedPath, "lessons-learned", t);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
          templatesCopied++;
        }
      }

      // ADR templates
      for (const t of ["README.md", "ADR-template.md"]) {
        const src = path.join(templateSrc, "decisions", t);
        const dest = path.join(expandedPath, "decisions", t);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
          templatesCopied++;
        }
      }

      // Session template
      const sessSrc = path.join(
        templateSrc,
        "sessions",
        "session-template.md"
      );
      const sessDest = path.join(expandedPath, "sessions", "session-template.md");
      if (fs.existsSync(sessSrc) && !fs.existsSync(sessDest)) {
        fs.copyFileSync(sessSrc, sessDest);
        templatesCopied++;
      }
    }

    // 7. Write config
    const now = new Date().toISOString();
    const graphConfig: GraphConfig = {
      name,
      path: kgPath,
      type: kgType,
      categories,
      createdAt: now,
      lastUsed: now,
    };

    config.graphs[name] = graphConfig;
    config.active = name;
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
    console.log(`    Config:     ~/.claude/kg-config.json`);
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

// ── Usage ────────────────────────────────────────────────────────────

function printUsage(): void {
  console.log("");
  console.log("  Knowledge Graph Plugin CLI");
  console.log("");
  console.log("  Usage:");
  console.log("    node dist/cli.js              Start MCP server (default)");
  console.log(
    "    node dist/cli.js init         Interactive setup wizard"
  );
  console.log(
    "    node dist/cli.js config <ide> Print MCP config for an IDE"
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
    const { registerConfigTools } = await import("./tools/config.js");
    const { registerSearchTool } = await import("./tools/search.js");
    const { registerScaffoldTool } = await import("./tools/scaffold.js");
    const { registerSanitizationTool } = await import(
      "./tools/sanitization.js"
    );
    const { registerConfigResource, registerTemplatesResource } = await import(
      "./resources/index.js"
    );

    const server = new McpServer({
      name: "knowledge-graph",
      version: "1.0.0",
    });

    registerConfigTools(server);
    registerSearchTool(server);
    registerScaffoldTool(server);
    registerSanitizationTool(server);
    registerConfigResource(server);
    registerTemplatesResource(server);

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
