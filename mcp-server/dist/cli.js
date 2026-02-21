#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const readline = __importStar(require("readline"));
const utils_js_1 = require("./utils.js");
// ── Helpers ──────────────────────────────────────────────────────────
function ask(rl, question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer.trim()));
    });
}
function printHeader() {
    console.log("");
    console.log("  Knowledge Graph Plugin — Setup Wizard");
    console.log("  ======================================");
    console.log("");
}
// ── Init Subcommand ──────────────────────────────────────────────────
async function runInit() {
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
        const config = (0, utils_js_1.readConfig)();
        if (config.graphs[name]) {
            console.error(`Error: Knowledge graph '${name}' already exists. Use a different name.`);
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
        let kgPath;
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
        const typeMap = {
            "1": "project-local",
            "2": "global",
            "3": "cowork",
            "4": "custom",
        };
        const kgType = typeMap[typeChoice] || "project-local";
        // 4. Use default categories
        const categories = [
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
        const pluginRoot = (0, utils_js_1.getPluginRoot)();
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
            const sessSrc = path.join(templateSrc, "sessions", "session-template.md");
            const sessDest = path.join(expandedPath, "sessions", "session-template.md");
            if (fs.existsSync(sessSrc) && !fs.existsSync(sessDest)) {
                fs.copyFileSync(sessSrc, sessDest);
                templatesCopied++;
            }
        }
        // 7. Write config
        const now = new Date().toISOString();
        const graphConfig = {
            name,
            path: kgPath,
            type: kgType,
            categories,
            createdAt: now,
            lastUsed: now,
        };
        config.graphs[name] = graphConfig;
        config.active = name;
        (0, utils_js_1.writeConfig)(config);
        // 8. Print summary
        console.log("");
        console.log("  Knowledge graph initialized:");
        console.log(`    Name:       ${name}`);
        console.log(`    Path:       ${kgPath}`);
        console.log(`    Type:       ${kgType}`);
        console.log(`    Categories: ${categories.map((c) => c.name).join(", ")}`);
        console.log(`    Templates:  ${templatesCopied} copied`);
        console.log(`    Config:     ~/.claude/kg-config.json`);
        console.log("");
        console.log("  Ready to use. Try capturing your first lesson!");
        console.log("");
    }
    finally {
        rl.close();
    }
}
function printConfig(platform) {
    // Auto-detect the MCP server path
    const serverPath = path.resolve(__dirname, "index.js");
    const mcpEntry = {
        command: "node",
        args: [serverPath],
    };
    let configJson;
    let configPath;
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
            console.error("Supported: cursor, windsurf, continue, jetbrains, vscode, claude-desktop");
            process.exit(1);
    }
    console.log("");
    console.log(`  MCP Configuration for ${platform}`);
    console.log(`  Config file: ${configPath}`);
    console.log("");
    console.log(JSON.stringify(configJson, null, 2));
    if (note) {
        console.log("");
        console.log(`  ${note}`);
    }
    console.log("");
}
// ── Usage ────────────────────────────────────────────────────────────
function printUsage() {
    console.log("");
    console.log("  Knowledge Graph Plugin CLI");
    console.log("");
    console.log("  Usage:");
    console.log("    node dist/cli.js              Start MCP server (default)");
    console.log("    node dist/cli.js init         Interactive setup wizard");
    console.log("    node dist/cli.js config <ide> Print MCP config for an IDE");
    console.log("");
    console.log("  Supported IDEs:");
    console.log("    cursor, windsurf, continue, jetbrains, vscode, claude-desktop");
    console.log("");
}
// ── Main ─────────────────────────────────────────────────────────────
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    if (!command) {
        // Default: start MCP server
        const { StdioServerTransport } = await Promise.resolve().then(() => __importStar(require("@modelcontextprotocol/sdk/server/stdio.js")));
        const { McpServer } = await Promise.resolve().then(() => __importStar(require("@modelcontextprotocol/sdk/server/mcp.js")));
        const { registerConfigTools } = await Promise.resolve().then(() => __importStar(require("./tools/config.js")));
        const { registerSearchTool } = await Promise.resolve().then(() => __importStar(require("./tools/search.js")));
        const { registerScaffoldTool } = await Promise.resolve().then(() => __importStar(require("./tools/scaffold.js")));
        const { registerSanitizationTool } = await Promise.resolve().then(() => __importStar(require("./tools/sanitization.js")));
        const { registerConfigResource, registerTemplatesResource } = await Promise.resolve().then(() => __importStar(require("./resources/index.js")));
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
                console.error("Error: Specify a platform. Example: node dist/cli.js config cursor");
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
//# sourceMappingURL=cli.js.map