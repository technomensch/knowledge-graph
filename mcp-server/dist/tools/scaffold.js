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
exports.registerScaffoldTool = registerScaffoldTool;
const zod_1 = require("zod");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const utils_js_1 = require("../utils.js");
function registerScaffoldTool(server) {
    server.tool("kg_scaffold", "Create a file from a template with variable substitution", {
        template: zod_1.z
            .string()
            .describe("Template path relative to core/templates/ (e.g., 'lessons-learned/lesson-template.md')"),
        variables: zod_1.z
            .record(zod_1.z.string(), zod_1.z.string())
            .default({})
            .describe("Variables to substitute in template (e.g., {title: 'My Lesson', date: '2026-02-13'})"),
        outputPath: zod_1.z
            .string()
            .describe("Absolute path where the file should be created"),
    }, async ({ template, variables, outputPath }) => {
        const pluginRoot = (0, utils_js_1.getPluginRoot)();
        const templatePath = path.join(pluginRoot, "core", "templates", template);
        // Validate template exists
        if (!fs.existsSync(templatePath)) {
            // List available templates
            const templatesDir = path.join(pluginRoot, "core", "templates");
            let available = "Template directory not found.";
            if (fs.existsSync(templatesDir)) {
                const files = listTemplates(templatesDir, templatesDir);
                available = `Available templates:\n${files.join("\n")}`;
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: Template not found: ${template}\n\n${available}`,
                    },
                ],
                isError: true,
            };
        }
        // Read template
        let content = fs.readFileSync(templatePath, "utf-8");
        // Substitute variables
        // Supports: {{VARIABLE}}, {variable}, VARIABLE_NAME (uppercase placeholders)
        for (const [key, value] of Object.entries(variables)) {
            // Replace {{key}}, {key}, and UPPERCASE_KEY patterns
            content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
            content = content.replace(new RegExp(`\\{${key}\\}`, "g"), value);
            content = content.replace(new RegExp(key.toUpperCase().replace(/-/g, "_"), "g"), value);
        }
        // Auto-substitute common variables if not explicitly provided
        const now = new Date();
        const autoVars = {
            YYYY: now.getFullYear().toString(),
            "MM-DD": `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
            "YYYY-MM-DD": now.toISOString().split("T")[0],
            "YYYY-MM-DDTHH:MM:SSZ": now.toISOString(),
            YOUR_NAME: process.env.USER || process.env.USERNAME || "unknown",
        };
        for (const [key, value] of Object.entries(autoVars)) {
            if (!variables[key]) {
                content = content.replace(new RegExp(key, "g"), value);
            }
        }
        // Expand output path
        const expandedOutput = outputPath.replace(/^~/, os.homedir());
        // Create parent directories
        const parentDir = path.dirname(expandedOutput);
        fs.mkdirSync(parentDir, { recursive: true });
        // Check if file exists
        if (fs.existsSync(expandedOutput)) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: File already exists: ${expandedOutput}\nUse a different path or delete the existing file first.`,
                    },
                ],
                isError: true,
            };
        }
        // Write file
        fs.writeFileSync(expandedOutput, content, "utf-8");
        return {
            content: [
                {
                    type: "text",
                    text: `Created: ${expandedOutput}\nTemplate: ${template}\nVariables substituted: ${Object.keys(variables).join(", ") || "none (auto-vars only)"}`,
                },
            ],
        };
    });
}
function listTemplates(dir, baseDir) {
    const results = [];
    if (!fs.existsSync(dir))
        return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...listTemplates(fullPath, baseDir));
        }
        else if (entry.name.endsWith(".md")) {
            results.push(path.relative(baseDir, fullPath));
        }
    }
    return results;
}
//# sourceMappingURL=scaffold.js.map