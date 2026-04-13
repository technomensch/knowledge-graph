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
exports.handleUpgrade = handleUpgrade;
exports.registerUpgradeTool = registerUpgradeTool;
const zod_1 = require("zod");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const utils_js_1 = require("../utils.js");
// ── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Parse YAML frontmatter from a file and return key-value pairs.
 * Only reads the first 30 lines to keep it cheap.
 */
function parseFrontmatter(filePath) {
    if (!fs.existsSync(filePath))
        return {};
    const lines = fs.readFileSync(filePath, "utf-8").split("\n");
    const result = {};
    if (lines[0]?.trim() !== "---")
        return result;
    for (let i = 1; i < Math.min(lines.length, 30); i++) {
        const line = lines[i];
        if (line.trim() === "---")
            break;
        const match = line.match(/^(\w[\w-]*):\s*(.*)$/);
        if (match) {
            result[match[1]] = match[2].trim();
        }
    }
    return result;
}
/**
 * Check a — verify required KG subdirectories exist.
 */
function checkDirectories(kgPath, graph) {
    const standardDirs = ["knowledge", "lessons-learned", "decisions", "sessions", "tmp"];
    const missing = standardDirs.filter((d) => !fs.existsSync(path.join(kgPath, d)));
    const chatHistoryDir = (0, utils_js_1.getChatHistoryPath)(graph, kgPath);
    if (!fs.existsSync(chatHistoryDir)) {
        missing.push(`chat-history (${chatHistoryDir})`);
    }
    if (missing.length === 0)
        return [];
    return [
        {
            category: "directories",
            description: `Missing directories: ${missing.join(", ")}`,
            details: `Run with apply: ["directories"] to create them`,
        },
    ];
}
/**
 * Check b — verify required config fields are present for the active graph.
 */
function checkConfig(kgPath) {
    const config = (0, utils_js_1.readConfig)();
    if (!config.active || !config.graphs[config.active])
        return [];
    const graph = config.graphs[config.active];
    const requiredFields = [
        { field: "platforms", defaultValue: [] },
        { field: "autoSwitch", defaultValue: false },
        { field: "notification", defaultValue: "none" },
        { field: "type", defaultValue: "project-local" },
    ];
    const missing = requiredFields.filter(({ field }) => graph[field] === undefined);
    if (missing.length === 0)
        return [];
    return [
        {
            category: "config",
            description: `Config missing fields: ${missing.map((f) => f.field).join(", ")}`,
            details: missing
                .map((f) => `  ${f.field}: ${JSON.stringify(f.defaultValue)}`)
                .join("\n"),
        },
    ];
}
/**
 * Check c — compare core/templates files against deployed KG files.
 * Returns items for files that differ or are missing.
 */
function checkTemplates(kgPath) {
    const pluginRoot = (0, utils_js_1.getPluginRoot)();
    const templateRoot = path.join(pluginRoot, "core", "templates");
    if (!fs.existsSync(templateRoot))
        return [];
    const results = [];
    // Subdirectory mappings: template subdir → kg subdir
    const mappings = [
        {
            templateSub: "knowledge",
            kgSub: "knowledge",
            files: ["patterns.md", "gotchas.md", "concepts.md", "architecture.md", "workflows.md", "index.md"],
        },
        {
            templateSub: "lessons-learned",
            kgSub: "lessons-learned",
            files: ["README.md", "lesson-template.md"],
        },
        {
            templateSub: "decisions",
            kgSub: "decisions",
            files: ["README.md", "ADR-template.md"],
        },
        {
            templateSub: "sessions",
            kgSub: "sessions",
            files: ["session-template.md"],
        },
    ];
    for (const { templateSub, kgSub, files } of mappings) {
        for (const file of files) {
            const srcPath = path.join(templateRoot, templateSub, file);
            const destPath = path.join(kgPath, kgSub, file);
            if (!fs.existsSync(srcPath))
                continue;
            if (!fs.existsSync(destPath)) {
                results.push({
                    category: "templates",
                    description: `Missing template file: ${kgSub}/${file}`,
                    details: `Source exists at ${srcPath}; deploy with apply: ["templates"]`,
                });
                continue;
            }
            const srcContent = fs.readFileSync(srcPath, "utf-8");
            const destContent = fs.readFileSync(destPath, "utf-8");
            if (srcContent !== destContent) {
                // Provide a brief before/after snippet (first differing line)
                const srcLines = srcContent.split("\n");
                const destLines = destContent.split("\n");
                let diffLine = -1;
                for (let i = 0; i < Math.max(srcLines.length, destLines.length); i++) {
                    if (srcLines[i] !== destLines[i]) {
                        diffLine = i;
                        break;
                    }
                }
                const snippet = diffLine >= 0
                    ? `First diff at line ${diffLine + 1}: template="${(srcLines[diffLine] ?? "").substring(0, 60)}" vs deployed="${(destLines[diffLine] ?? "").substring(0, 60)}"`
                    : "Files differ (whitespace/encoding)";
                results.push({
                    category: "templates",
                    description: `Outdated template: ${kgSub}/${file}`,
                    details: snippet,
                });
            }
        }
    }
    return results;
}
/**
 * Check d — platform-split contamination check.
 * Returns a WarningItem if rules.md contains platform-specific directives
 * and kmgraph_schema < 2.
 */
function checkPlatformSplit(kgPath) {
    const rulesPath = path.join(kgPath, "knowledge", "rules.md");
    if (!fs.existsSync(rulesPath))
        return null;
    const fm = parseFrontmatter(rulesPath);
    const schemaVersion = parseInt(fm["kmgraph_schema"] ?? "0", 10);
    if (schemaVersion >= 2)
        return null; // Already migrated — skip
    const content = fs.readFileSync(rulesPath, "utf-8");
    const lines = content.split("\n");
    const CONTAMINATION_PATTERN = /(use|prefer|avoid|never use|always use|do not use|switch to|stop using).{0,80}(\bGlob\b|\bGrep\b|context-mode|\bsubagent\b|\.jsonl)|(\bGlob\b|\bGrep\b|context-mode|\bsubagent\b|\.jsonl).{0,80}(use|prefer|avoid|instead|only|never)/i;
    const flagged = [];
    for (let i = 0; i < lines.length; i++) {
        if (CONTAMINATION_PATTERN.test(lines[i])) {
            flagged.push(`line ${i + 1}: ${lines[i].substring(0, 120)}`);
        }
    }
    if (flagged.length === 0)
        return null;
    return {
        category: "platform-split",
        description: "rules.md contains platform-specific tool directives that should be migrated to CLAUDE.md",
        flaggedLines: flagged,
    };
}
/**
 * Check e — detect chat-history migration opportunity.
 * Offered when chatHistoryPath is configured, differs from the default location,
 * and the default location exists with content.
 */
function checkChatHistoryMigration(kgPath, graph) {
    if (!graph.chatHistoryPath)
        return [];
    const configuredPath = graph.chatHistoryPath.replace(/^~/, os.homedir());
    const defaultPath = path.join(kgPath, "chat-history");
    if (configuredPath === defaultPath)
        return [];
    if (!fs.existsSync(defaultPath))
        return [];
    const entries = fs.readdirSync(defaultPath);
    if (entries.length === 0)
        return [];
    return [
        {
            category: "chat-history-migration",
            description: `Found ${entries.length} item(s) in ${defaultPath} that can be migrated to configured chatHistoryPath: ${configuredPath}`,
            details: `Run with apply: ["chat-history-migration"] to move contents to the configured path.`,
        },
    ];
}
// ── Apply helpers ────────────────────────────────────────────────────────────
function applyChatHistoryMigration(kgPath, graph) {
    if (!graph.chatHistoryPath)
        return "chatHistoryPath not configured; nothing to migrate";
    const configuredPath = graph.chatHistoryPath.replace(/^~/, os.homedir());
    const defaultPath = path.join(kgPath, "chat-history");
    if (configuredPath === defaultPath)
        return "chatHistoryPath matches default path; nothing to migrate";
    if (!fs.existsSync(defaultPath))
        return "Default chat-history directory does not exist; nothing to migrate";
    const entries = fs.readdirSync(defaultPath);
    if (entries.length === 0)
        return "Default chat-history directory is empty; nothing to migrate";
    fs.mkdirSync(configuredPath, { recursive: true });
    for (const entry of entries) {
        fs.renameSync(path.join(defaultPath, entry), path.join(configuredPath, entry));
    }
    return `Migrated ${entries.length} item(s) from ${defaultPath} to ${configuredPath}`;
}
function applyDirectories(kgPath, graph) {
    const standardDirs = ["knowledge", "lessons-learned", "decisions", "sessions", "tmp"];
    const created = [];
    for (const d of standardDirs) {
        const full = path.join(kgPath, d);
        if (!fs.existsSync(full)) {
            fs.mkdirSync(full, { recursive: true });
            created.push(d);
        }
    }
    const chatHistoryDir = (0, utils_js_1.getChatHistoryPath)(graph, kgPath);
    if (!fs.existsSync(chatHistoryDir)) {
        fs.mkdirSync(chatHistoryDir, { recursive: true });
        created.push(`chat-history (${chatHistoryDir})`);
    }
    return created.length > 0
        ? `Created directories: ${created.join(", ")}`
        : "All directories already exist";
}
function applyConfig() {
    const config = (0, utils_js_1.readConfig)();
    if (!config.active || !config.graphs[config.active]) {
        return "No active graph to update config for";
    }
    const graph = config.graphs[config.active];
    const defaults = {
        platforms: [],
        autoSwitch: false,
        notification: "none",
        type: "project-local",
    };
    const added = [];
    for (const [field, defaultValue] of Object.entries(defaults)) {
        if (graph[field] === undefined) {
            graph[field] = defaultValue;
            added.push(field);
        }
    }
    if (added.length > 0) {
        (0, utils_js_1.writeConfig)(config);
    }
    return added.length > 0
        ? `Added missing config fields: ${added.join(", ")}`
        : "Config already up to date";
}
function applyTemplates(kgPath) {
    const pluginRoot = (0, utils_js_1.getPluginRoot)();
    const templateRoot = path.join(pluginRoot, "core", "templates");
    if (!fs.existsSync(templateRoot))
        return "Template root not found; skipped";
    const mappings = [
        {
            templateSub: "knowledge",
            kgSub: "knowledge",
            files: ["patterns.md", "gotchas.md", "concepts.md", "architecture.md", "workflows.md", "index.md"],
        },
        {
            templateSub: "lessons-learned",
            kgSub: "lessons-learned",
            files: ["README.md", "lesson-template.md"],
        },
        {
            templateSub: "decisions",
            kgSub: "decisions",
            files: ["README.md", "ADR-template.md"],
        },
        {
            templateSub: "sessions",
            kgSub: "sessions",
            files: ["session-template.md"],
        },
    ];
    const copied = [];
    for (const { templateSub, kgSub, files } of mappings) {
        for (const file of files) {
            const src = path.join(templateRoot, templateSub, file);
            const dest = path.join(kgPath, kgSub, file);
            if (fs.existsSync(src)) {
                fs.mkdirSync(path.dirname(dest), { recursive: true });
                fs.copyFileSync(src, dest);
                copied.push(`${kgSub}/${file}`);
            }
        }
    }
    return copied.length > 0
        ? `Deployed templates: ${copied.join(", ")}`
        : "No templates to deploy";
}
function applyPlatformSplit(kgPath) {
    // Remove platform-specific lines from rules.md and bump schema version
    const rulesPath = path.join(kgPath, "knowledge", "rules.md");
    if (!fs.existsSync(rulesPath))
        return "rules.md not found; skipped";
    const CONTAMINATION_PATTERN = /(use|prefer|avoid|never use|always use|do not use|switch to|stop using).{0,80}(\bGlob\b|\bGrep\b|context-mode|\bsubagent\b|\.jsonl)|(\bGlob\b|\bGrep\b|context-mode|\bsubagent\b|\.jsonl).{0,80}(use|prefer|avoid|instead|only|never)/i;
    const original = fs.readFileSync(rulesPath, "utf-8");
    const lines = original.split("\n");
    const kept = [];
    const removed = [];
    for (let i = 0; i < lines.length; i++) {
        if (CONTAMINATION_PATTERN.test(lines[i])) {
            removed.push(`line ${i + 1}: ${lines[i].substring(0, 80)}`);
        }
        else {
            kept.push(lines[i]);
        }
    }
    // Update or add kmgraph_schema: 2 in frontmatter (CRLF-safe)
    let updated = kept.join("\n");
    if (updated.startsWith("---\r\n") || updated.startsWith("---\n")) {
        updated = updated.replace(/^(---\r?\n)([\s\S]*?)(---\r?\n)/, (_m, open, body, close) => {
            // Normalize to LF for consistent output
            const normalizedBody = body.replace(/\r\n/g, "\n");
            if (/kmgraph_schema:/.test(normalizedBody)) {
                return "---\n" + normalizedBody.replace(/kmgraph_schema:\s*\d+/, "kmgraph_schema: 2") + "---\n";
            }
            return "---\n" + normalizedBody + "kmgraph_schema: 2\n" + "---\n";
        });
    }
    fs.writeFileSync(rulesPath, updated, "utf-8");
    return `Platform-split applied. Removed ${removed.length} line(s). kmgraph_schema set to 2.\n${removed.slice(0, 5).join("\n")}`;
}
async function handleUpgrade(params) {
    const config = (0, utils_js_1.readConfig)();
    if (!config.active || !config.graphs[config.active]) {
        return {
            content: [{ type: "text", text: "Error: No active knowledge graph configured. Use kg_config_init or kg_config_switch first." }],
            isError: true,
        };
    }
    const rawPath = config.graphs[config.active].path;
    const kgPath = rawPath.replace(/^~/, os.homedir());
    if (!fs.existsSync(kgPath)) {
        return {
            content: [{ type: "text", text: `Error: KG path not found: ${kgPath}` }],
            isError: true,
        };
    }
    const applyList = params.apply ?? [];
    if (applyList.length === 0) {
        const result = { upgrades: [], warnings: [] };
        result.upgrades.push(...checkDirectories(kgPath, config.graphs[config.active]));
        result.upgrades.push(...checkConfig(kgPath));
        result.upgrades.push(...checkTemplates(kgPath));
        result.upgrades.push(...checkChatHistoryMigration(kgPath, config.graphs[config.active]));
        const platformWarning = checkPlatformSplit(kgPath);
        if (platformWarning)
            result.warnings.push(platformWarning);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
    const results = [];
    for (const category of applyList) {
        switch (category) {
            case "directories":
                results.push(`[directories] ${applyDirectories(kgPath, config.graphs[config.active])}`);
                break;
            case "config":
                results.push(`[config] ${applyConfig()}`);
                break;
            case "templates":
                results.push(`[templates] ${applyTemplates(kgPath)}`);
                break;
            case "platform-split":
                if (!params.confirm_platform_split) {
                    results.push("[platform-split] WARNING: platform-split migration removes content from rules.md. Pass confirm_platform_split: true to proceed.");
                }
                else {
                    results.push(`[platform-split] ${applyPlatformSplit(kgPath)}`);
                }
                break;
            case "chat-history-migration":
                results.push(`[chat-history-migration] ${applyChatHistoryMigration(kgPath, config.graphs[config.active])}`);
                break;
        }
    }
    return { content: [{ type: "text", text: results.join("\n\n") }] };
}
// ── Tool registration ────────────────────────────────────────────────────────
function registerUpgradeTool(server) {
    server.tool("kg_upgrade", "Inspect and apply KMGraph upgrades for MCP-only installations", {
        apply: zod_1.z
            .array(zod_1.z.enum(["directories", "config", "templates", "platform-split", "chat-history-migration"]))
            .optional()
            .default([])
            .describe('Categories to apply. Omit or pass [] to inspect only. Values: "directories", "config", "templates", "platform-split", "chat-history-migration"'),
        confirm_platform_split: zod_1.z
            .boolean()
            .optional()
            .default(false)
            .describe("Must be true to apply platform-split migration (removes content from rules.md)"),
    }, async ({ apply, confirm_platform_split }) => {
        return handleUpgrade({ apply: apply, confirm_platform_split });
    });
}
//# sourceMappingURL=upgrade.js.map